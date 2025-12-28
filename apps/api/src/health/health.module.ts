import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { S3HealthIndicator } from './s3.health';
import { AIHealthIndicator } from './ai.health';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [TerminusModule, PrismaModule, S3Module],
  controllers: [HealthController],
  providers: [S3HealthIndicator, AIHealthIndicator],
  exports: [AIHealthIndicator],
})
export class HealthModule {}
