import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { CryptoService } from '../aws/crypto.service';
import { randomUUID } from 'crypto';

export interface InspectionPackManifest {
  packId: string;
  tenantId: string;
  createdAt: string;
  scope: 'FULL' | 'OBLIGATIONS_ONLY' | 'CUSTOM';
  artifacts: Array<{
    artifactId: string;
    version: number;
    filename: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
    s3Bucket: string;
    s3Key: string;
    linkedEvidenceRequirementIds: string[];
  }>;
  readinessSnapshot?: any; // From ReadinessService
  hashAlgorithm: 'SHA-256';
}

export interface VerificationProof {
  manifestSha256: string;
  signatureBase64: string;
  kmsKeyId: string;
  signingAlgorithm: string;
  publicKeyPem?: string;
  verificationInstructionsKo: string;
}

export interface InspectionPackBuildResult {
  tenantId: string;
  packId: string;
  manifest: InspectionPackManifest;
  manifestS3Bucket: string;
  manifestS3Key: string;
  proof: VerificationProof;
  portal: {
    shareUrl: string;
    expiresAt: string;
  };
  builtAt: string;
}

@Injectable()
export class PackManifestV2Service {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private crypto: CryptoService,
  ) {}

  /**
   * Build inspection pack with KMS-signed manifest
   * CRITICAL: This provides cryptographic proof of pack contents
   */
  async buildInspectionPack(
    tenantId: string,
    packId: string,
    scope: 'FULL' | 'OBLIGATIONS_ONLY' | 'CUSTOM' = 'FULL',
    obligationIds?: string[],
  ): Promise<InspectionPackBuildResult> {
    // Fetch all artifacts for this pack
    const artifactsQuery = scope === 'FULL'
      ? { tenantId, isDeleted: false, status: 'READY' }
      : {
          tenantId,
          isDeleted: false,
          status: 'READY',
          obligations: { some: { obligationId: { in: obligationIds || [] } } },
        };

    const artifacts = await this.prisma.artifact.findMany({
      where: artifactsQuery as any,
      include: {
        evidenceRequirements: {
          select: { evidenceRequirementId: true },
        },
      },
    });

    // Build manifest
    const manifest: InspectionPackManifest = {
      packId,
      tenantId,
      createdAt: new Date().toISOString(),
      scope,
      artifacts: artifacts.map((a) => ({
        artifactId: a.id,
        version: a.version,
        filename: a.fileName || 'unknown',
        contentType: a.mimeType || 'application/octet-stream',
        sizeBytes: a.fileSize || 0,
        sha256: a.sha256Hash || '',
        s3Bucket: a.s3Bucket || '',
        s3Key: a.s3Key || '',
        linkedEvidenceRequirementIds: a.evidenceRequirements.map((er) => er.evidenceRequirementId),
      })),
      hashAlgorithm: 'SHA-256',
    };

    // Canonical JSON serialization (stable key ordering)
    const manifestJson = this.canonicalJsonStringify(manifest);
    const manifestSha256 = this.crypto.computeSha256(manifestJson);

    // Sign manifest with KMS
    const signatureResponse = await this.crypto.signManifest(manifestJson);

    // Get public key for verification
    const publicKeyPem = await this.crypto.getPublicKeyKms();

    // Create verification proof
    const proof: VerificationProof = {
      manifestSha256,
      signatureBase64: signatureResponse.signatureBase64,
      kmsKeyId: signatureResponse.keyId,
      signingAlgorithm: signatureResponse.signingAlgorithm,
      publicKeyPem,
      verificationInstructionsKo: this.generateVerificationInstructions(),
    };

    // Store manifest and proof in S3
    const manifestS3Key = this.storage.generateKey(tenantId, 'packs', packId) + '/manifest.json';
    const proofS3Key = this.storage.generateKey(tenantId, 'packs', packId) + '/proof.json';

    await this.storage.putJson(manifestS3Key, manifest);
    await this.storage.putJson(proofS3Key, proof);

    // Create inspector share link (time-limited)
    const shareToken = randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await this.prisma.inspectorSession.create({
      data: {
        packId,
        token: shareToken,
        expiresAt,
      },
    });

    const shareUrl = `${process.env.API_URL || 'http://localhost:3001'}/inspector/packs/${packId}?token=${shareToken}`;

    // Update pack status
    await this.prisma.inspectionPack.updateMany({
      where: { id: packId, tenantId },
      data: {
        status: 'COMPLETED',
        manifestS3Key,
      },
    });

    return {
      tenantId,
      packId,
      manifest,
      manifestS3Bucket: process.env.S3_BUCKET || 'complianceos-artifacts',
      manifestS3Key,
      proof,
      portal: {
        shareUrl,
        expiresAt: expiresAt.toISOString(),
      },
      builtAt: new Date().toISOString(),
    };
  }

  /**
   * Canonical JSON stringify for consistent hashing
   * CRITICAL: Keys must be sorted alphabetically
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

  private generateVerificationInstructions(): string {
    return `
검증 방법 (Verification Instructions):

1. manifest.json 파일의 SHA-256 해시를 계산합니다.
   Calculate SHA-256 hash of manifest.json file.

2. proof.json에 포함된 공개키(publicKeyPem)를 사용하여 서명을 검증합니다.
   Verify the signature using the public key (publicKeyPem) from proof.json.

3. OpenSSL을 사용한 검증 예시:
   Example verification using OpenSSL:

   # Extract public key from proof.json
   cat proof.json | jq -r '.publicKeyPem' > public_key.pem

   # Extract signature
   cat proof.json | jq -r '.signatureBase64' | base64 -d > signature.bin

   # Compute manifest hash
   shasum -a 256 manifest.json | awk '{print $1}' | xxd -r -p > manifest_hash.bin

   # Verify signature
   openssl dgst -sha256 -verify public_key.pem -signature signature.bin manifest_hash.bin

4. 서명이 유효하면 manifest.json의 내용이 변조되지 않았음을 보장합니다.
   If the signature is valid, it guarantees that manifest.json has not been tampered with.

5. manifest.json의 각 artifact에 대한 SHA-256 해시를 실제 파일과 비교하여 integrity를 검증합니다.
   Verify integrity by comparing SHA-256 hashes in manifest.json with actual files.
    `.trim();
  }
}
