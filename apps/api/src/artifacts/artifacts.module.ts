import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsV2Service } from './artifacts-v2.service';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactEventsService } from './artifact-events.service';
import { SyncAnalysisService } from './sync-analysis.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [ArtifactsService, ArtifactsV2Service, ArtifactEventsService, SyncAnalysisService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService, ArtifactsV2Service, ArtifactEventsService, SyncAnalysisService],
})
export class ArtifactsModule {}
