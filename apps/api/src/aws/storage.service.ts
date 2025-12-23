import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import awsConfig from '../config/aws.config';

export interface PresignedPutUrl {
  url: string;
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface S3Object {
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(awsConfig.KEY)
    private config: ConfigType<typeof awsConfig>,
  ) {
    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.s3.endpoint,
      forcePathStyle: this.config.s3.forcePathStyle,
      credentials: this.config.credentials,
    });
    this.bucket = this.config.s3.bucket;
  }

  /**
   * Generate a presigned PUT URL for client-side upload
   * SECURITY: Key must include tenantId to enforce isolation
   */
  async presignPutUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<PresignedPutUrl> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      url,
      headers: {
        'Content-Type': contentType,
      },
      expiresAt,
    };
  }

  /**
   * Get object metadata without downloading body
   */
  async headObject(key: string): Promise<S3Object> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
      lastModified: response.LastModified,
    };
  }

  /**
   * Get object as a readable stream (for processing/download)
   */
  async getObjectStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (response.Body instanceof Readable) {
      return response.Body;
    }

    throw new Error('S3 response body is not a readable stream');
  }

  /**
   * Put JSON object to S3
   */
  async putJson(key: string, data: any): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });

    await this.s3Client.send(command);
  }

  /**
   * Get JSON object from S3
   */
  async getJson<T = any>(key: string): Promise<T> {
    const stream = await this.getObjectStream(key);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const json = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(json);
  }

  /**
   * Delete object from S3
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Generate presigned GET URL for downloads
   */
  async presignGetUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Generate S3 key with tenant isolation
   * Pattern: {env}/{tenantId}/{type}/{id}/v{version}
   */
  generateKey(
    tenantId: string,
    type: 'artifacts' | 'packs' | 'extractions',
    id: string,
    version?: number,
  ): string {
    const env = process.env.NODE_ENV || 'development';
    const versionSuffix = version ? `/v${version}` : '';
    return `${env}/${tenantId}/${type}/${id}${versionSuffix}`;
  }
}
