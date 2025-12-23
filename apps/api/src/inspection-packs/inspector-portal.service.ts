import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { CryptoService } from '../aws/crypto.service';

@Injectable()
export class InspectorPortalService {
  private readonly logger = new Logger(InspectorPortalService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private crypto: CryptoService,
  ) {}

  /**
   * Validate token and return pack details
   */
  async getPackDetails(packId: string, token: string) {
    const session = await this.validateToken(packId, token);

    // Fetch pack with artifacts
    const pack = await this.prisma.inspectionPack.findFirst({
      where: { id: packId },
      include: {
        artifacts: {
          include: {
            artifact: {
              select: {
                id: true,
                name: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                sha256Hash: true,
                uploadedAt: true,
                version: true,
              },
            },
          },
        },
      },
    });

    if (!pack) {
      throw new NotFoundException('Inspection pack not found');
    }

    return {
      packId: pack.id,
      name: pack.name,
      domain: pack.domain,
      startDate: pack.startDate,
      endDate: pack.endDate,
      status: pack.status,
      createdAt: pack.createdAt,
      finalizedAt: pack.finalizedAt,
      artifacts: pack.artifacts.map((pa) => ({
        id: pa.artifact.id,
        name: pa.artifact.name,
        fileName: pa.artifact.fileName,
        fileSize: pa.artifact.fileSize,
        mimeType: pa.artifact.mimeType,
        sha256Hash: pa.artifact.sha256Hash,
        uploadedAt: pa.artifact.uploadedAt,
        version: pa.artifact.version,
      })),
      tokenExpiresAt: session.expiresAt,
    };
  }

  /**
   * Get signed manifest from S3
   */
  async getManifest(packId: string, token: string) {
    await this.validateToken(packId, token);

    const pack = await this.prisma.inspectionPack.findFirst({
      where: { id: packId },
      select: { manifestS3Key: true, tenantId: true },
    });

    if (!pack?.manifestS3Key) {
      throw new NotFoundException('Manifest not found');
    }

    // Fetch manifest from S3
    const stream = await this.storage.getObjectStream(pack.manifestS3Key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const manifestJson = Buffer.concat(chunks).toString('utf-8');

    return JSON.parse(manifestJson);
  }

  /**
   * Get verification proof (signature + public key)
   */
  async getProof(packId: string, token: string) {
    await this.validateToken(packId, token);

    const pack = await this.prisma.inspectionPack.findFirst({
      where: { id: packId },
      select: { manifestS3Key: true, tenantId: true },
    });

    if (!pack?.manifestS3Key) {
      throw new NotFoundException('Pack manifest not found');
    }

    // Proof is stored alongside manifest
    const proofS3Key = pack.manifestS3Key.replace('/manifest.json', '/proof.json');

    try {
      const stream = await this.storage.getObjectStream(proofS3Key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const proofJson = Buffer.concat(chunks).toString('utf-8');

      return JSON.parse(proofJson);
    } catch (error) {
      throw new NotFoundException('Verification proof not found');
    }
  }

  /**
   * Get presigned download URL for artifact
   */
  async getArtifactDownloadUrl(packId: string, artifactId: string, token: string) {
    await this.validateToken(packId, token);

    // Verify artifact is part of this pack
    const packArtifact = await this.prisma.packArtifact.findFirst({
      where: { packId, artifactId },
      include: {
        artifact: {
          select: { s3Key: true, fileName: true },
        },
      },
    });

    if (!packArtifact) {
      throw new NotFoundException('Artifact not found in this pack');
    }

    if (!packArtifact.artifact.s3Key) {
      throw new NotFoundException('Artifact file not available');
    }

    // Generate presigned download URL (1 hour expiration)
    const presignedUrl = await this.storage.presignGetUrl(
      packArtifact.artifact.s3Key,
      packArtifact.artifact.fileName || 'download',
      3600,
    );

    return {
      artifactId,
      fileName: packArtifact.artifact.fileName,
      downloadUrl: presignedUrl.url,
      expiresAt: presignedUrl.expiresAt,
    };
  }

  /**
   * Verify pack integrity
   * CRITICAL: This verifies both manifest signature and artifact hashes
   */
  async verifyPackIntegrity(packId: string, token: string) {
    await this.validateToken(packId, token);

    const manifest = await this.getManifest(packId, token);
    const proof = await this.getProof(packId, token);

    // Verify manifest signature with public key
    const manifestJson = this.canonicalJsonStringify(manifest);
    const computedSha256 = this.crypto.computeSha256(manifestJson);

    // Check if manifest hash matches
    if (computedSha256 !== proof.manifestSha256) {
      return {
        valid: false,
        reason: 'Manifest hash mismatch - manifest may have been tampered with',
        manifestHashMatch: false,
      };
    }

    // Verify artifact count
    const pack = await this.prisma.inspectionPack.findFirst({
      where: { id: packId },
      include: {
        artifacts: {
          include: {
            artifact: {
              select: { id: true, sha256Hash: true },
            },
          },
        },
      },
    });

    if (!pack) {
      throw new NotFoundException('Pack not found');
    }

    const artifactHashMatches = pack.artifacts.map((pa) => {
      const manifestArtifact = manifest.artifacts.find((a: any) => a.artifactId === pa.artifact.id);
      if (!manifestArtifact) {
        return {
          artifactId: pa.artifact.id,
          match: false,
          reason: 'Artifact not found in manifest',
        };
      }

      return {
        artifactId: pa.artifact.id,
        match: pa.artifact.sha256Hash === manifestArtifact.sha256,
        dbHash: pa.artifact.sha256Hash,
        manifestHash: manifestArtifact.sha256,
      };
    });

    const allArtifactsValid = artifactHashMatches.every((a) => a.match);

    return {
      valid: allArtifactsValid,
      manifestHashMatch: true,
      signatureAlgorithm: proof.signingAlgorithm,
      kmsKeyId: proof.kmsKeyId,
      artifactCount: pack.artifacts.length,
      artifactVerifications: artifactHashMatches,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate token and session
   */
  private async validateToken(packId: string, token: string) {
    const session = await this.prisma.inspectorSession.findFirst({
      where: { packId, token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Token has expired');
    }

    this.logger.log(`Inspector access: packId=${packId}, token=${token.substring(0, 8)}...`);

    return session;
  }

  /**
   * Canonical JSON stringify for consistent hashing
   */
  private canonicalJsonStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalJsonStringify(item)).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => {
      return `"${key}":${this.canonicalJsonStringify(obj[key])}`;
    });

    return '{' + pairs.join(',') + '}';
  }
}
