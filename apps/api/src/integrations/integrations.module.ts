import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ManualUploadConnector } from './connectors/manual-upload.connector';
import { GoogleDriveConnector } from './connectors/google-drive.connector';

@Module({
  providers: [IntegrationsService, ManualUploadConnector, GoogleDriveConnector],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
