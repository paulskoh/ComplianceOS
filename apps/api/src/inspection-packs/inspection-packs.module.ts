import { Module } from '@nestjs/common';
import { InspectionPacksController } from './inspection-packs.controller';
import {
  InspectorController,
  InspectorAccessController,
} from './inspector.controller';
import { InspectorPortalController } from './inspector-portal.controller';
import { InspectionPacksService } from './inspection-packs.service';
import { PackGeneratorService } from './pack-generator.service';
import { PackManifestService } from './pack-manifest.service';
import { PackManifestV2Service } from './pack-manifest-v2.service';
import { InspectorAccessService } from './inspector-access.service';
import { InspectorPortalService } from './inspector-portal.service';
import { InspectorAuthGuard } from './guards/inspector-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { AwsModule } from '../aws/aws.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [PrismaModule, S3Module, AwsModule, AuditLogModule, ArtifactsModule],
  controllers: [
    InspectionPacksController,
    InspectorController,
    InspectorAccessController,
    InspectorPortalController,
  ],
  providers: [
    InspectionPacksService,
    PackGeneratorService,
    PackManifestService,
    PackManifestV2Service,
    InspectorAccessService,
    InspectorPortalService,
    InspectorAuthGuard,
  ],
  exports: [
    InspectionPacksService,
    PackManifestService,
    PackManifestV2Service,
    InspectorAccessService,
    InspectorPortalService,
  ],
})
export class InspectionPacksModule {}
