import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsV2Service } from './artifacts-v2.service';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactEventsService } from './artifact-events.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [ArtifactsService, ArtifactsV2Service, ArtifactEventsService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService, ArtifactsV2Service, ArtifactEventsService],
})
export class ArtifactsModule {}
