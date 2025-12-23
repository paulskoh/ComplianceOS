import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';

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
import { PlansModule } from './plans/plans.module';
import { InspectionModule } from './inspection/inspection.module';
import { ApplicabilityModule } from './applicability/applicability.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { HealthModule } from './health/health.module';
import { AwsModule } from './aws/aws.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { StructuredLogger } from './common/services/structured-logger.service';

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
    AwsModule,
    HealthModule,
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
    PlansModule,
    InspectionModule,
    ApplicabilityModule,
    EvaluationModule,
  ],
  providers: [
    StructuredLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
