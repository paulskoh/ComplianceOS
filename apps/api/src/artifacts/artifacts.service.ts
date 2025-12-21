import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateArtifactDto, LinkArtifactDto } from '@complianceos/shared';

@Injectable()
export class ArtifactsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private auditLog: AuditLogService,
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

    const { controlIds, obligationIds, ...artifactData } = dto;

    const data: any = {
      ...artifactData,
      tenantId,
      uploadedById: userId,
      hash,
      binary: {
        create: {
          s3Key,
          s3Bucket: process.env.S3_BUCKET_ARTIFACTS,
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
    };

    const artifact = await this.prisma.artifact.create({
      data,
      include: {
        binary: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
      },
    });

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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.artifact.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        binary: true,
        uploadedBy: true,
        controls: { include: { control: true } },
        obligations: { include: { obligation: true } },
      },
    });
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
    const artifact = await this.prisma.artifact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_DELETED',
      resourceType: 'Artifact',
      resourceId: id,
    });

    return artifact;
  }
}
