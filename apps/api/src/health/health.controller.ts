import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { S3HealthIndicator } from './s3.health';
import { AIHealthIndicator } from './ai.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private s3Health: S3HealthIndicator,
    private aiHealth: AIHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (database + S3 + AI)' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () => this.s3Health.isHealthy('s3'),
      () => this.aiHealth.isHealthy('openai'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  readiness() {
    // Readiness probe - checks if app can serve traffic
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () => this.s3Health.isHealthy('s3'),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  liveness() {
    // Liveness probe - simple check that app is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ai')
  @HealthCheck()
  @ApiOperation({ summary: 'AI service health check (OpenAI connectivity)' })
  checkAIHealth() {
    return this.health.check([
      () => this.aiHealth.isHealthy('openai'),
    ]);
  }

  @Get('ai/metrics')
  @ApiOperation({ summary: 'AI observability metrics (CEO Demo)' })
  async aiMetrics() {
    return this.aiHealth.getDetailedMetrics();
  }

  @Get('ai/stats')
  @ApiOperation({ summary: 'Quick AI analysis stats (24h)' })
  async aiStats() {
    return this.aiHealth.getAnalysisStats();
  }
}
