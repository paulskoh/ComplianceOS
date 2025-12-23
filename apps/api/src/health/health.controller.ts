import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { S3HealthIndicator } from './s3.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private s3Health: S3HealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () => this.s3Health.isHealthy('s3'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    // Readiness probe - checks if app can serve traffic
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () => this.s3Health.isHealthy('s3'),
    ]);
  }

  @Get('live')
  liveness() {
    // Liveness probe - simple check that app is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
