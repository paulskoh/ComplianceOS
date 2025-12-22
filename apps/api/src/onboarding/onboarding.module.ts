import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TemplateInstantiationService } from './template-instantiation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ApplicabilityModule } from '../applicability/applicability.module';

@Module({
  imports: [PrismaModule, AuditLogModule, ApplicabilityModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, TemplateInstantiationService],
  exports: [OnboardingService, TemplateInstantiationService],
})
export class OnboardingModule {}
