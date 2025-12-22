import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArtifactEventType } from '@prisma/client';

export interface CreateArtifactEventDto {
  artifactId: string;
  eventType: ArtifactEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class ArtifactEventsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record an artifact event (chain of custody)
   */
  async recordEvent(
    tenantId: string,
    dto: CreateArtifactEventDto,
  ) {
    return this.prisma.artifactEvent.create({
      data: {
        tenantId,
        artifactId: dto.artifactId,
        eventType: dto.eventType,
        userId: dto.userId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        metadata: dto.metadata as any,
      },
    });
  }

  /**
   * Get chain of custody for an artifact
   */
  async getChainOfCustody(tenantId: string, artifactId: string) {
    const events = await this.prisma.artifactEvent.findMany({
      where: {
        tenantId,
        artifactId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return events;
  }

  /**
   * Get all download events for an artifact (audit trail)
   */
  async getDownloadHistory(tenantId: string, artifactId: string) {
    return this.prisma.artifactEvent.findMany({
      where: {
        tenantId,
        artifactId,
        eventType: ArtifactEventType.DOWNLOADED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all approval events across tenant (for reporting)
   */
  async getApprovalHistory(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      tenantId,
      eventType: ArtifactEventType.APPROVED,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.artifactEvent.findMany({
      where,
      include: {
        artifact: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Record artifact download with IP and user agent tracking
   */
  async recordDownload(
    tenantId: string,
    artifactId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.recordEvent(tenantId, {
      artifactId,
      eventType: ArtifactEventType.DOWNLOADED,
      userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Record artifact approval
   */
  async recordApproval(
    tenantId: string,
    artifactId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.recordEvent(tenantId, {
      artifactId,
      eventType: ArtifactEventType.APPROVED,
      userId,
      ipAddress,
      metadata: {
        madeImmutable: true,
      },
    });
  }

  /**
   * Record artifact linking to control or obligation
   */
  async recordLinking(
    tenantId: string,
    artifactId: string,
    userId: string,
    linkType: 'control' | 'obligation',
    linkedId: string,
  ) {
    return this.recordEvent(tenantId, {
      artifactId,
      eventType: linkType === 'control'
        ? ArtifactEventType.LINKED_TO_CONTROL
        : ArtifactEventType.LINKED_TO_OBLIGATION,
      userId,
      metadata: {
        linkType,
        linkedId,
      },
    });
  }

  /**
   * Record metadata edit
   */
  async recordMetadataEdit(
    tenantId: string,
    artifactId: string,
    userId: string,
    changes: any,
  ) {
    return this.recordEvent(tenantId, {
      artifactId,
      eventType: ArtifactEventType.METADATA_EDITED,
      userId,
      metadata: {
        changes,
      },
    });
  }

  /**
   * Record inclusion in inspection pack
   */
  async recordPackInclusion(
    tenantId: string,
    artifactId: string,
    packId: string,
    userId: string,
  ) {
    return this.recordEvent(tenantId, {
      artifactId,
      eventType: ArtifactEventType.INCLUDED_IN_PACK,
      userId,
      metadata: {
        packId,
      },
    });
  }
}
