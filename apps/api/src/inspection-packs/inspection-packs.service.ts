import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ArtifactEventsService } from '../artifacts/artifact-events.service';
import { PackGeneratorService } from './pack-generator.service';
import { CreateInspectionPackDto } from '@complianceos/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class InspectionPacksService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private auditLog: AuditLogService,
    private packGenerator: PackGeneratorService,
    private artifactEvents: ArtifactEventsService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateInspectionPackDto) {
    const data: any = {
      ...dto,
      tenantId,
      createdById: userId,
      status: 'GENERATING',
    };

    const pack = await this.prisma.inspectionPack.create({ data });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'PACK_GENERATED',
      resourceType: 'InspectionPack',
      resourceId: pack.id,
    });

    // Generate pack asynchronously (in production, use a background job)
    this.generatePack(pack.id, tenantId, dto).catch(console.error);

    return pack;
  }

  private async generatePack(
    packId: string,
    tenantId: string,
    dto: CreateInspectionPackDto,
  ) {
    try {
      // Fetch all relevant data
      const [obligations, controls, artifacts] = await Promise.all([
        this.prisma.obligation.findMany({
          where: {
            tenantId,
            domain: dto.domain,
            ...(dto.obligationIds && { id: { in: dto.obligationIds } }),
          },
          include: { owner: true, template: true },
        }),
        this.prisma.control.findMany({
          where: {
            tenantId,
            obligations: {
              some: {
                obligation: {
                  domain: dto.domain,
                },
              },
            },
          },
          include: { owner: true, evidenceRequirements: true },
        }),
        this.prisma.artifact.findMany({
          where: {
            tenantId,
            isDeleted: false,
            createdAt: {
              gte: new Date(dto.startDate),
              lte: new Date(dto.endDate),
            },
            obligations: {
              some: {
                obligation: {
                  domain: dto.domain,
                },
              },
            },
          },
          include: { binary: true },
        }),
      ]);

      // Generate PDF summary
      const summaryPdf = await this.packGenerator.generateSummaryPdf({
        packName: dto.name,
        domain: dto.domain,
        dateRange: { start: dto.startDate, end: dto.endDate },
        obligations,
        controls,
        artifacts,
      });

      const summaryKey = `packs/${packId}/summary.pdf`;
      await this.s3.uploadPack(summaryKey, summaryPdf, 'application/pdf');

      // Generate manifest
      const manifest = this.packGenerator.generateManifest({
        packId,
        obligations,
        controls,
        artifacts,
      });

      const manifestKey = `packs/${packId}/manifest.json`;
      await this.s3.uploadPack(
        manifestKey,
        Buffer.from(JSON.stringify(manifest, null, 2)),
        'application/json',
      );

      // Generate ZIP bundle
      const bundleStream = await this.packGenerator.generateZipBundle(artifacts);
      const bundleKey = `packs/${packId}/evidence.zip`;
      await this.s3.uploadPackStream(bundleStream, bundleKey, 'application/zip');

      // Link artifacts to pack
      await this.prisma.packArtifact.createMany({
        data: artifacts.map((artifact) => ({
          packId,
          artifactId: artifact.id,
        })),
      });

      // CRITICAL: Record chain of custody events for pack inclusion
      // Log when each artifact was included in this inspection pack
      // SECURITY: Use tenantId check to prevent cross-tenant access
      const pack = await this.prisma.inspectionPack.findFirst({
        where: { id: packId, tenantId },
        select: { createdById: true },
      });

      const userId = pack?.createdById;

      for (const artifact of artifacts) {
        await this.artifactEvents.recordPackInclusion(
          tenantId,
          artifact.id,
          packId,
          userId || 'system',
        );
      }

      // SECURITY: Update with tenantId check
      await this.prisma.inspectionPack.updateMany({
        where: { id: packId, tenantId },
        data: {
          status: 'COMPLETED',
          summaryS3Key: summaryKey,
          manifestS3Key: manifestKey,
          bundleS3Key: bundleKey,
        },
      });
    } catch (error) {
      console.error('Pack generation failed:', error);
      // SECURITY: Update with tenantId check
      await this.prisma.inspectionPack.updateMany({
        where: { id: packId, tenantId },
        data: { status: 'FAILED' },
      });
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.inspectionPack.findMany({
      where: { tenantId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        artifacts: { include: { artifact: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.inspectionPack.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: true,
        artifacts: { include: { artifact: { include: { binary: true } } } },
        shareLinks: true,
      },
    });
  }

  async createShareLink(tenantId: string, packId: string, expiresInHours = 72) {
    const pack = await this.findOne(tenantId, packId);
    if (!pack) {
      throw new Error('Pack not found');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    return this.prisma.packShareLink.create({
      data: {
        packId,
        token,
        expiresAt,
      },
    });
  }

  async getDownloadUrls(tenantId: string, packId: string) {
    const pack = await this.findOne(tenantId, packId);
    if (!pack || pack.status !== 'COMPLETED') {
      throw new Error('Pack not ready');
    }

    const [summaryUrl, manifestUrl, bundleUrl] = await Promise.all([
      pack.summaryS3Key ? this.s3.getPackUrl(pack.summaryS3Key) : null,
      pack.manifestS3Key ? this.s3.getPackUrl(pack.manifestS3Key) : null,
      pack.bundleS3Key ? this.s3.getPackUrl(pack.bundleS3Key) : null,
    ]);

    return { summaryUrl, manifestUrl, bundleUrl };
  }
}
