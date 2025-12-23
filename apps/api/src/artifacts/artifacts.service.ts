import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ArtifactEventsService } from './artifact-events.service';
import { CreateArtifactDto, LinkArtifactDto } from '@complianceos/shared';
import { ArtifactEventType } from '@prisma/client';

@Injectable()
export class ArtifactsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private auditLog: AuditLogService,
    private artifactEvents: ArtifactEventsService,
  ) {}

  async uploadFile(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateArtifactDto,
  ) {
    const s3Key = this.s3.generateKey(tenantId, file.originalname);
    const { hash } = await this.s3.uploadArtifact(
      s3Key,
      file.buffer,
      file.mimetype,
    );

    const { controlIds, obligationIds, evidenceRequirementIds, ...artifactData } = dto;

    const data: any = {
      ...artifactData,
      tenantId,
      uploadedById: userId,
      hash,
      sha256Hash: hash, // Store SHA-256 for manifest verification
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key,
      uploadedAt: new Date(),
      binary: {
        create: {
          s3Key,
          s3Bucket: process.env.S3_BUCKET_ARTIFACTS || 'artifacts',
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      },
      controls: {
        create: controlIds.map((controlId) => ({ controlId })),
      },
      obligations: {
        create: obligationIds.map((obligationId) => ({ obligationId })),
      },
      evidenceRequirements: {
        create: evidenceRequirementIds.map((evidenceRequirementId) => ({
          evidenceRequirementId,
          createdByUserId: userId,
        })),
      },
    };

    const artifact = await this.prisma.artifact.create({
      data,
      include: {
        binary: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
        evidenceRequirements: { include: { evidenceRequirement: true } },
      },
    });

    // Record creation event (chain of custody)
    await this.artifactEvents.recordEvent(tenantId, {
      artifactId: artifact.id,
      eventType: ArtifactEventType.CREATED,
      userId,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        hash,
      },
    });

    // Record evidence requirement linking events
    for (const evidenceRequirementId of evidenceRequirementIds) {
      await this.artifactEvents.recordEvent(tenantId, {
        artifactId: artifact.id,
        eventType: ArtifactEventType.LINKED_EVIDENCE_REQUIREMENT,
        userId,
        metadata: {
          evidenceRequirementId,
        },
      });
    }

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_UPLOADED',
      resourceType: 'Artifact',
      resourceId: artifact.id,
    });

    return artifact;
  }

  async findAll(tenantId: string) {
    return this.prisma.artifact.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        binary: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        controls: { include: { control: { select: { id: true, name: true } } } },
        obligations: { include: { obligation: { select: { id: true, title: true } } } },
        evidenceRequirements: {
          include: {
            evidenceRequirement: { select: { id: true, name: true, controlId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const artifact = await this.prisma.artifact.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        binary: true,
        uploadedBy: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
        evidenceRequirements: {
          include: {
            evidenceRequirement: true,
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50, // Last 50 events
        },
      },
    });

    return artifact;
  }

  /**
   * Get artifact with full chain of custody
   */
  async findOneWithChainOfCustody(tenantId: string, id: string) {
    const artifact = await this.findOne(tenantId, id);
    if (!artifact) return null;

    const chainOfCustody = await this.artifactEvents.getChainOfCustody(tenantId, id);

    return {
      ...artifact,
      chainOfCustody,
    };
  }

  async getDownloadUrl(tenantId: string, id: string) {
    const artifact = await this.findOne(tenantId, id);
    if (!artifact?.binary) {
      throw new Error('Artifact not found');
    }

    return this.s3.getArtifactUrl(artifact.binary.s3Key);
  }

  async linkToResources(
    tenantId: string,
    userId: string,
    id: string,
    dto: LinkArtifactDto,
  ) {
    // Verify artifact exists and belongs to tenant
    const artifact = await this.findOne(tenantId, id);
    if (!artifact) {
      throw new BadRequestException('Artifact not found');
    }

    if (dto.controlIds) {
      await this.prisma.artifactControl.deleteMany({
        where: { artifactId: id },
      });
      await this.prisma.artifactControl.createMany({
        data: dto.controlIds.map((controlId) => ({
          artifactId: id,
          controlId,
        })),
      });
    }

    if (dto.obligationIds) {
      await this.prisma.artifactObligation.deleteMany({
        where: { artifactId: id },
      });
      await this.prisma.artifactObligation.createMany({
        data: dto.obligationIds.map((obligationId) => ({
          artifactId: id,
          obligationId,
        })),
      });
    }

    // Handle evidence requirement linking with diff logic
    if (dto.evidenceRequirementIds !== undefined) {
      // Get existing links
      const existing = await this.prisma.artifactEvidenceRequirement.findMany({
        where: { artifactId: id },
        select: { evidenceRequirementId: true },
      });
      const existingIds = new Set(existing.map(e => e.evidenceRequirementId));
      const newIds = new Set(dto.evidenceRequirementIds);

      // Determine added and removed
      const added = dto.evidenceRequirementIds.filter(id => !existingIds.has(id));
      const removed = Array.from(existingIds).filter(id => !newIds.has(id));

      // Remove unlinked
      if (removed.length > 0) {
        await this.prisma.artifactEvidenceRequirement.deleteMany({
          where: {
            artifactId: id,
            evidenceRequirementId: { in: removed },
          },
        });

        // Emit unlink events
        for (const evidenceRequirementId of removed) {
          await this.artifactEvents.recordEvent(tenantId, {
            artifactId: id,
            eventType: ArtifactEventType.UNLINKED_EVIDENCE_REQUIREMENT,
            userId,
            metadata: { evidenceRequirementId },
          });
        }
      }

      // Add new links
      if (added.length > 0) {
        await this.prisma.artifactEvidenceRequirement.createMany({
          data: added.map((evidenceRequirementId) => ({
            artifactId: id,
            evidenceRequirementId,
            createdByUserId: userId,
          })),
        });

        // Emit link events
        for (const evidenceRequirementId of added) {
          await this.artifactEvents.recordEvent(tenantId, {
            artifactId: id,
            eventType: ArtifactEventType.LINKED_EVIDENCE_REQUIREMENT,
            userId,
            metadata: { evidenceRequirementId },
          });
        }
      }
    }

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_LINKED',
      resourceType: 'Artifact',
      resourceId: id,
    });

    return this.findOne(tenantId, id);
  }

  async softDelete(tenantId: string, userId: string, id: string) {
    // Check if artifact is immutable
    const artifact = await this.findOne(tenantId, id);
    if (artifact?.isImmutable) {
      throw new ForbiddenException('Cannot delete immutable artifact. Artifact has been approved and is part of the compliance record.');
    }

    const updated = await this.prisma.artifact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Record tombstone event
    await this.artifactEvents.recordEvent(tenantId, {
      artifactId: id,
      eventType: ArtifactEventType.TOMBSTONED,
      userId,
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_DELETED',
      resourceType: 'Artifact',
      resourceId: id,
    });

    return updated;
  }

  /**
   * Approve artifact - makes it immutable
   * CRITICAL: Once approved, the binary cannot be replaced or modified
   */
  async approveArtifact(
    tenantId: string,
    userId: string,
    id: string,
    ipAddress?: string,
  ) {
    const artifact = await this.findOne(tenantId, id);
    if (!artifact) {
      throw new BadRequestException('Artifact not found');
    }

    if (artifact.isApproved) {
      throw new BadRequestException('Artifact is already approved');
    }

    // Mark as approved and immutable
    const approved = await this.prisma.artifact.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: userId,
        approvedAt: new Date(),
        isImmutable: true, // Once approved, binary is locked
      },
      include: {
        binary: true,
        uploadedBy: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
      },
    });

    // Record approval event
    await this.artifactEvents.recordApproval(tenantId, id, userId, ipAddress);

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_APPROVED',
      resourceType: 'Artifact',
      resourceId: id,
    });

    return approved;
  }

  /**
   * Get download URL with event tracking
   * Records who downloaded what and when (for audit trail)
   */
  async getDownloadUrlWithTracking(
    tenantId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const artifact = await this.findOne(tenantId, id);
    if (!artifact?.binary) {
      throw new BadRequestException('Artifact not found');
    }

    // Record download event
    await this.artifactEvents.recordDownload(
      tenantId,
      id,
      userId,
      ipAddress,
      userAgent,
    );

    return this.s3.getArtifactUrl(artifact.binary.s3Key);
  }

  /**
   * Update artifact metadata (whitelisted fields only)
   * Binary cannot be modified if immutable
   */
  async updateMetadata(
    tenantId: string,
    userId: string,
    id: string,
    updates: {
      name?: string;
      description?: string;
      accessClassification?: string;
      retentionDays?: number;
    },
  ) {
    const artifact = await this.findOne(tenantId, id);
    if (!artifact) {
      throw new BadRequestException('Artifact not found');
    }

    // Track what changed
    const changes: any = {};
    if (updates.name && updates.name !== artifact.name) {
      changes.name = { from: artifact.name, to: updates.name };
    }
    if (updates.description !== undefined && updates.description !== artifact.description) {
      changes.description = { from: artifact.description, to: updates.description };
    }
    if (updates.accessClassification && updates.accessClassification !== artifact.accessClassification) {
      changes.accessClassification = { from: artifact.accessClassification, to: updates.accessClassification };
    }
    if (updates.retentionDays && updates.retentionDays !== artifact.retentionDays) {
      changes.retentionDays = { from: artifact.retentionDays, to: updates.retentionDays };
    }

    const updated = await this.prisma.artifact.update({
      where: { id },
      data: updates as any,
      include: {
        binary: true,
        uploadedBy: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
      },
    });

    // Record metadata edit event
    if (Object.keys(changes).length > 0) {
      await this.artifactEvents.recordMetadataEdit(tenantId, id, userId, changes);
    }

    return updated;
  }

  /**
   * Get immutability status and approval info
   */
  async getImmutabilityStatus(tenantId: string, id: string) {
    const artifact = await this.prisma.artifact.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        hash: true,
        isApproved: true,
        isImmutable: true,
        approvedById: true,
        approvedAt: true,
      },
    });

    return artifact;
  }
}
