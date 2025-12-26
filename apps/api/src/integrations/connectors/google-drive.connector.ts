import { Injectable, NotImplementedException, Logger } from '@nestjs/common';

/**
 * Google Drive Connector - COMING SOON
 *
 * This integration is not yet available for soft-launch.
 * It will be enabled in a future release.
 */
@Injectable()
export class GoogleDriveConnector {
  private readonly logger = new Logger(GoogleDriveConnector.name);

  // Integration status - set to false until fully implemented
  static readonly IS_AVAILABLE = false;
  static readonly COMING_SOON_MESSAGE = 'Google Drive integration is coming soon. For now, please use manual file upload.';

  async run(_config: any): Promise<{ artifactsCollected: number; status: string; message: string }> {
    this.logger.warn('Google Drive connector called but not yet implemented');

    // SOFT-LAUNCH: Never simulate success - explicitly indicate unavailability
    throw new NotImplementedException(
      GoogleDriveConnector.COMING_SOON_MESSAGE
    );
  }

  /**
   * Check if this integration is available
   */
  isAvailable(): boolean {
    return GoogleDriveConnector.IS_AVAILABLE;
  }

  /**
   * Get status message for UI
   */
  getStatusMessage(): string {
    return GoogleDriveConnector.COMING_SOON_MESSAGE;
  }
}
