import { Module } from '@nestjs/common';
import { InspectionPacksController } from './inspection-packs.controller';
import {
  InspectorController,
  InspectorAccessController,
} from './inspector.controller';
import { InspectionPacksService } from './inspection-packs.service';
import { PackGeneratorService } from './pack-generator.service';
import { PackManifestService } from './pack-manifest.service';
import { InspectorAccessService } from './inspector-access.service';
import { InspectorAuthGuard } from './guards/inspector-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [PrismaModule, S3Module, AuditLogModule, ArtifactsModule],
  controllers: [
    InspectionPacksController,
    InspectorController,
    InspectorAccessController,
  ],
  providers: [
    InspectionPacksService,
    PackGeneratorService,
    PackManifestService,
    InspectorAccessService,
    InspectorAuthGuard,
  ],
  exports: [
    InspectionPacksService,
    PackManifestService,
    InspectorAccessService,
  ],
})
export class InspectionPacksModule {}
