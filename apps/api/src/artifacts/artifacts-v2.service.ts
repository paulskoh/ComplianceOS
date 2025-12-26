import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { CryptoService } from '../aws/crypto.service';
import { QueueService } from '../aws/queue.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ArtifactEventsService } from './artifact-events.service';
import {
  ArtifactCreateIntentDto,
  ArtifactCreateIntentResponseDto,
  ArtifactFinalizeDto,
} from './dto/upload-intent.dto';
import { ArtifactStatus } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ArtifactsV2Service {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private crypto: CryptoService,
    private queue: QueueService,
    private auditLog: AuditLogService,
    private artifactEvents: ArtifactEventsService,
  ) {}

  /**
   * Phase 1: Create upload intent and return presigned PUT URL
   * CRITICAL: API never receives file body - client uploads directly to S3
   */
  async createUploadIntent(
    userId: string,
    dto: ArtifactCreateIntentDto,
  ): Promise<ArtifactCreateIntentResponseDto> {
    const { tenantId, filename, contentType, sizeBytes, evidenceRequirementId, controlId, obligationId, tags } = dto;

    // Validate file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Create artifact record with PENDING_UPLOAD status
    const artifact = await this.prisma.artifact.create({
      data: {
        tenantId,
        name: filename,
        fileName: filename,
        fileSize: sizeBytes,
        mimeType: contentType,
        type: 'OTHER', // Will be classified later
        source: 'UPLOAD',
        accessClassification: 'INTERNAL',
        uploadedById: userId,
        status: ArtifactStatus.PENDING_UPLOAD,
        version: 1,
        metadata: tags,
        evidenceRequirementId, // Direct field on Artifact model
      },
    });

    // Link to control and obligation via join tables if provided
    if (controlId) {
      await this.prisma.artifactControl.create({
        data: {
          artifactId: artifact.id,
          controlId,
        },
      });
    }

    if (obligationId) {
      await this.prisma.artifactObligation.create({
        data: {
          artifactId: artifact.id,
          obligationId,
        },
      });
    }

    // Generate S3 key with tenant isolation
    const s3Key = this.storage.generateKey(tenantId, 'artifacts', artifact.id, artifact.version);

    // Update artifact with S3 key
    await this.prisma.artifact.update({
      where: { id: artifact.id },
      data: { s3Key, s3Bucket: process.env.S3_BUCKET || 'complianceos-artifacts' },
    });

    // Generate presigned PUT URL (1 hour expiration)
    const presignedUrl = await this.storage.presignPutUrl(s3Key, contentType, 3600);

    // Record intent event
    await this.artifactEvents.recordEvent(tenantId, {
      artifactId: artifact.id,
      eventType: 'CREATED',
      userId,
      metadata: {
        filename,
        contentType,
        sizeBytes,
        s3Key,
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_UPLOAD_INTENT_CREATED',
      resourceType: 'Artifact',
      resourceId: artifact.id,
    });

    return {
      artifactId: artifact.id,
      version: artifact.version,
      upload: {
        method: 'PUT',
        url: presignedUrl.url,
        headers: presignedUrl.headers,
        expiresAt: presignedUrl.expiresAt,
      },
    };
  }

  /**
   * Phase 2: Finalize upload after client completes S3 PUT
   * Verifies object exists, computes SHA-256, updates status
   */
  async finalizeUpload(userId: string, dto: ArtifactFinalizeDto) {
    const { tenantId, artifactId, version, etag } = dto;

    // Fetch artifact with tenant check
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId, version },
    });

    if (!artifact) {
      throw new BadRequestException('Artifact not found or access denied');
    }

    if (artifact.status !== ArtifactStatus.PENDING_UPLOAD) {
      // Idempotent: if already finalized with same etag, return success
      if (artifact.status === ArtifactStatus.READY && artifact.etag === etag) {
        return artifact;
      }
      throw new BadRequestException(`Artifact is in ${artifact.status} state, cannot finalize`);
    }

    if (!artifact.s3Key) {
      throw new BadRequestException('Artifact has no S3 key');
    }

    // Verify object exists in S3
    let s3Object;
    try {
      s3Object = await this.storage.headObject(artifact.s3Key);
    } catch (error) {
      throw new BadRequestException('File not found in S3. Upload may have failed.');
    }

    // Verify etag matches (optional but recommended)
    if (s3Object.etag && s3Object.etag !== etag) {
      throw new BadRequestException('ETag mismatch. File may be corrupted.');
    }

    // Compute SHA-256 by streaming from S3
    const stream = await this.storage.getObjectStream(artifact.s3Key);
    const sha256 = await this.computeSha256FromStream(stream);

    // Update artifact to READY status
    const updated = await this.prisma.artifact.updateMany({
      where: { id: artifactId, tenantId },
      data: {
        status: ArtifactStatus.READY,
        sha256Hash: sha256,
        hash: sha256,
        etag,
        uploadedAt: new Date(),
      },
    });

    // Enqueue document extraction job
    await this.queue.enqueueJob({
      tenantId,
      type: 'DOC_EXTRACT',
      payload: {
        artifactId,
        version,
        s3Key: artifact.s3Key,
        contentType: artifact.mimeType,
      },
    });

    // Record finalize event
    await this.artifactEvents.recordEvent(tenantId, {
      artifactId,
      eventType: 'CREATED',
      userId,
      metadata: {
        sha256,
        etag,
        finalizedAt: new Date().toISOString(),
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'ARTIFACT_FINALIZED',
      resourceType: 'Artifact',
      resourceId: artifactId,
    });

    return this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId },
    });
  }

  /**
   * Compute SHA-256 from stream without buffering entire file
   */
  private async computeSha256FromStream(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
