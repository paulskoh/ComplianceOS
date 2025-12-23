import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private s3Service: S3Service) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test S3 connectivity by attempting to generate a presigned URL
      // This validates that credentials work and S3 is accessible
      const testKey = 'health-check-test';
      await this.s3Service.getArtifactUrl(testKey);

      return this.getStatus(key, true, {
        message: 'S3 storage is healthy',
      });
    } catch (error) {
      throw new HealthCheckError(
        'S3 health check failed',
        this.getStatus(key, false, {
          message: error.message,
        }),
      );
    }
  }
}
