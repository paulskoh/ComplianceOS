import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsController } from './artifacts.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [ArtifactsService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
