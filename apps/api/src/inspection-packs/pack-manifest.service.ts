import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface PackManifest {
  version: string; // Manifest schema version
  packId: string;
  status: 'DRAFT' | 'FINAL' | 'REVOKED';
  generatedAt: string;
  finalizedAt: string | null;
  revokedAt: string | null;

  // Company and inspection metadata
  companyId: string;
  companyName: string;
  inspectionPeriod: {
    startDate: string;
    endDate: string;
  };
  domain: string;
  inspectionType: string;

  // Compliance content
  obligations: Array<{
    id: string;
    code: string;
    title: string;
    titleKo: string;
    domain: string;
    status: string;
  }>;

  controls: Array<{
    id: string;
    code: string;
    name: string;
    controlType: string;
    implementationStatus: string;
    obligationId: string;
  }>;

  evidenceRequirements: Array<{
    id: string;
    name: string;
    controlId: string;
    isMandatory: boolean;
    evidenceType: string;
  }>;

  artifacts: Array<{
    id: string;
    name: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    sha256Hash: string;
    uploadedAt: string;
    s3Key: string;
    evidenceRequirementId: string | null;
  }>;

  // Evaluation snapshot at time of pack creation
  evaluation: {
    readinessScore: number;
    totalObligations: number;
    passingObligations: number;
    failingObligations: number;
    partialObligations: number;
  };

  // Cryptographic integrity
  manifestHash: string; // SHA-256 hash of manifest content (excluding this field)
  signature: string | null; // HMAC signature for verification

  // Audit trail
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  finalizedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

@Injectable()
export class PackManifestService {
  private readonly logger = new Logger(PackManifestService.name);
  private readonly MANIFEST_VERSION = '1.0.0';
  private readonly SECRET_KEY = process.env.PACK_SIGNING_KEY || 'CHANGEME';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a comprehensive, immutable manifest for an inspection pack
   */
  async generateManifest(
    packId: string,
    status: 'DRAFT' | 'FINAL' = 'DRAFT',
  ): Promise<PackManifest> {
    this.logger.log(`Generating ${status} manifest for pack ${packId}`);

    // Fetch pack data
    const pack = await this.prisma.inspectionPack.findUnique({
      where: { id: packId },
      include: {
        tenant: true,
        createdBy: true,
        artifacts: {
          include: {
            artifact: true,
          },
        },
      },
    });

    if (!pack) {
      throw new Error(`Pack ${packId} not found`);
    }

    // Fetch obligations
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId: pack.tenantId },
      include: {
        controls: {
          include: {
            control: {
              include: {
                evidenceRequirements: true,
              },
            },
          },
        },
      },
    });

    // Build manifest (without hash and signature initially)
    const manifest: Partial<PackManifest> = {
      version: this.MANIFEST_VERSION,
      packId: pack.id,
      status,
      generatedAt: new Date().toISOString(),
      finalizedAt: status === 'FINAL' ? new Date().toISOString() : null,
      revokedAt: null,

      companyId: pack.companyId,
      companyName: pack.tenant?.name || 'Unknown',
      inspectionPeriod: {
        startDate: pack.startDate.toISOString(),
        endDate: pack.endDate.toISOString(),
      },
      domain: pack.domain || 'UNKNOWN',
      inspectionType: pack.inspectionType || 'GENERAL',

      obligations: obligations.map((o) => ({
        id: o.id,
        code: o.code || '',
        title: o.title,
        titleKo: o.titleKo,
        domain: o.domain,
        status: o.status,
      })),

      controls: obligations.flatMap((o) =>
        o.controls.map((co) => ({
          id: co.control.id,
          code: co.control.code || '',
          name: co.control.name,
          controlType: co.control.controlType,
          implementationStatus: co.control.implementationStatus,
          obligationId: o.id,
        })),
      ),

      evidenceRequirements: obligations.flatMap((o) =>
        o.controls.flatMap((co) =>
          co.control.evidenceRequirements.map((er) => ({
            id: er.id,
            name: er.name,
            controlId: co.control.id,
            isMandatory: er.isMandatory,
            evidenceType: er.evidenceType,
          })),
        ),
      ),

      artifacts: pack.artifacts.map((pa) => ({
        id: pa.artifact.id,
        name: pa.artifact.name,
        fileName: pa.artifact.fileName || 'unknown',
        fileSize: pa.artifact.fileSize || 0,
        mimeType: pa.artifact.mimeType || 'application/octet-stream',
        sha256Hash: pa.artifact.sha256Hash || '',
        uploadedAt: pa.artifact.uploadedAt.toISOString(),
        s3Key: pa.artifact.s3Key || '',
        evidenceRequirementId: pa.artifact.evidenceRequirementId,
      })),

      evaluation: {
        readinessScore: 0, // TODO: Get from evaluation service
        totalObligations: obligations.length,
        passingObligations: 0,
        failingObligations: 0,
        partialObligations: 0,
      },

      createdBy: {
        id: pack.createdBy.id,
        name: `${pack.createdBy.firstName} ${pack.createdBy.lastName}`,
        email: pack.createdBy.email,
      },
      finalizedBy: null,
    };

    // Calculate manifest hash
    const manifestContent = this.serializeManifestForHashing(manifest);
    const manifestHash = createHash('sha256')
      .update(manifestContent)
      .digest('hex');

    // Generate HMAC signature
    const signature =
      status === 'FINAL'
        ? createHmac('sha256', this.SECRET_KEY)
            .update(manifestContent)
            .digest('hex')
        : null;

    const finalManifest: PackManifest = {
      ...(manifest as PackManifest),
      manifestHash,
      signature,
    };

    this.logger.log(
      `Manifest generated with hash: ${manifestHash.substring(0, 16)}...`,
    );

    return finalManifest;
  }

  /**
   * Verify manifest integrity
   */
  verifyManifest(manifest: PackManifest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verify hash
    const { manifestHash: originalHash, signature: originalSignature, ...content } = manifest;
    const manifestContent = this.serializeManifestForHashing(content);
    const calculatedHash = createHash('sha256')
      .update(manifestContent)
      .digest('hex');

    if (calculatedHash !== originalHash) {
      errors.push('Manifest hash mismatch - content has been tampered with');
    }

    // Verify signature for FINAL packs
    if (manifest.status === 'FINAL') {
      if (!originalSignature) {
        errors.push('FINAL pack must have a signature');
      } else {
        const calculatedSignature = createHmac('sha256', this.SECRET_KEY)
          .update(manifestContent)
          .digest('hex');

        if (calculatedSignature !== originalSignature) {
          errors.push('Signature verification failed - pack may be forged');
        }
      }
    }

    // Verify all artifacts have hashes
    const artifactsWithoutHash = manifest.artifacts.filter(
      (a) => !a.sha256Hash,
    );
    if (artifactsWithoutHash.length > 0) {
      errors.push(
        `${artifactsWithoutHash.length} artifacts missing SHA-256 hash`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transition pack from DRAFT to FINAL (immutable)
   */
  async finalizePack(packId: string, userId: string): Promise<PackManifest> {
    this.logger.log(`Finalizing pack ${packId}`);

    const pack = await this.prisma.inspectionPack.findUnique({
      where: { id: packId },
    });

    if (!pack) {
      throw new Error(`Pack ${packId} not found`);
    }

    if (pack.status === 'COMPLETED') {
      throw new Error('Pack is already final and cannot be modified');
    }

    // Generate FINAL manifest
    const finalManifest = await this.generateManifest(packId, 'FINAL');

    // Update pack status
    await this.prisma.inspectionPack.update({
      where: { id: packId },
      data: {
        status: 'COMPLETED',
        finalizedAt: new Date(),
        finalizedById: userId,
        manifestHash: finalManifest.manifestHash,
        manifestSignature: finalManifest.signature,
      },
    });

    this.logger.log(`Pack ${packId} finalized successfully`);

    return finalManifest;
  }

  /**
   * Revoke a pack (for auditing purposes)
   */
  async revokePack(packId: string, reason: string): Promise<void> {
    this.logger.warn(`Revoking pack ${packId}: ${reason}`);

    await this.prisma.inspectionPack.update({
      where: { id: packId },
      data: {
        status: 'FAILED', // Use FAILED status for revoked packs
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  /**
   * Serialize manifest content for hashing (deterministic)
   */
  private serializeManifestForHashing(manifest: any): string {
    // Sort keys recursively for deterministic output
    const sortedManifest = this.sortObjectKeys(manifest);
    return JSON.stringify(sortedManifest);
  }

  /**
   * Recursively sort object keys for deterministic serialization
   */
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = this.sortObjectKeys(obj[key]);
            return sorted;
          },
          {} as any,
        );
    }
    return obj;
  }
}
