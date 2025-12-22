import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SyncService } from './sync.service';
import { ManualUploadConnector } from './connectors/manual-upload.connector';
import { GoogleDriveConnector } from './connectors/google-drive.connector';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [PrismaModule, S3Module, ArtifactsModule],
  providers: [IntegrationsService, SyncService, ManualUploadConnector, GoogleDriveConnector],
  controllers: [IntegrationsController],
  exports: [SyncService],
})
export class IntegrationsModule {}
