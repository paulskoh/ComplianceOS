import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly artifactsBucket: string;
  private readonly packsBucket: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    this.artifactsBucket = process.env.S3_BUCKET_ARTIFACTS || 'evidence-artifacts';
    this.packsBucket = process.env.S3_BUCKET_PACKS || 'inspection-packs';
  }

  async uploadArtifact(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ s3Key: string; hash: string }> {
    const hash = this.calculateHash(buffer);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.artifactsBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          hash,
        },
      }),
    );

    return { s3Key: key, hash };
  }

  async uploadPack(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ s3Key: string }> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.packsBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return { s3Key: key };
  }

  async uploadPackStream(
    stream: Readable,
    key: string,
    contentType: string,
  ): Promise<{ s3Key: string }> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.packsBucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
      }),
    );

    return { s3Key: key };
  }

  async getArtifactUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.artifactsBucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPackUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.packsBucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteArtifact(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.artifactsBucket,
        Key: key,
      }),
    );
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  generateKey(tenantId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${tenantId}/${timestamp}-${sanitized}`;
  }
}
