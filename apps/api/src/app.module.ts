import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ObligationsModule } from './obligations/obligations.module';
import { ControlsModule } from './controls/controls.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { RisksModule } from './risks/risks.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { PoliciesModule } from './policies/policies.module';
import { TrainingModule } from './training/training.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InspectionPacksModule } from './inspection-packs/inspection-packs.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ReadinessModule } from './readiness/readiness.module';
import { S3Module } from './s3/s3.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    S3Module,
    AuthModule,
    UsersModule,
    ObligationsModule,
    ControlsModule,
    ArtifactsModule,
    RisksModule,
    TasksModule,
    WorkflowsModule,
    ExceptionsModule,
    PoliciesModule,
    TrainingModule,
    IntegrationsModule,
    InspectionPacksModule,
    AuditLogModule,
    ReadinessModule,
    OnboardingModule,
  ],
})
export class AppModule {}
