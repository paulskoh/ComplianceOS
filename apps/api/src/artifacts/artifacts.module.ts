import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactEventsService } from './artifact-events.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [ArtifactsService, ArtifactEventsService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService, ArtifactEventsService],
})
export class ArtifactsModule {}
