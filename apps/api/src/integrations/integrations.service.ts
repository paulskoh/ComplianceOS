import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManualUploadConnector } from './connectors/manual-upload.connector';
import { GoogleDriveConnector } from './connectors/google-drive.connector';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private manualUploadConnector: ManualUploadConnector,
    private googleDriveConnector: GoogleDriveConnector,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId },
      include: {
        runs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.integration.findFirst({
      where: { id, tenantId },
      include: {
        runs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async runIntegration(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const run = await this.prisma.integrationRun.create({
      data: {
        integrationId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Run integration asynchronously
    this.executeIntegration(integration, run.id).catch(console.error);

    return run;
  }

  private async executeIntegration(integration: any, runId: string) {
    try {
      let result;

      switch (integration.type) {
        case 'MANUAL_UPLOAD':
          result = await this.manualUploadConnector.run(integration.config);
          break;
        case 'GOOGLE_DRIVE':
          result = await this.googleDriveConnector.run(integration.config);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      await this.prisma.integrationRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          artifactsCollected: result.artifactsCollected,
          completedAt: new Date(),
        },
      });

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      await this.prisma.integrationRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    }
  }
}
