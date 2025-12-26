import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { ArtifactsService } from '../artifacts/artifacts.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private artifacts: ArtifactsService,
  ) {}

  /**
   * Auto-sync all active integrations (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoSyncAllIntegrations() {
    this.logger.log('Starting auto-sync for all integrations');

    const integrations = await this.prisma.integration.findMany({
      where: {
        status: 'ACTIVE',
        config: {
          path: ['autoSync'],
          equals: true,
        },
      },
      include: {
        tenant: { include: { users: { where: { role: 'ORG_ADMIN' }, take: 1 } } },
      },
    });

    this.logger.log(`Found ${integrations.length} integrations to sync`);

    for (const integration of integrations) {
      try {
        await this.syncIntegration(
          integration.tenantId,
          integration.tenant.users[0]?.id || 'system',
          integration.id,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync integration ${integration.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Sync a specific integration
   */
  async syncIntegration(tenantId: string, userId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    this.logger.log(
      `Syncing ${integration.type} integration for tenant ${tenantId}`,
    );

    // Update last sync
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    let syncedCount = 0;

    switch (integration.type) {
      case 'GOOGLE_DRIVE':
        syncedCount = await this.syncGoogleDrive(tenantId, userId, integration);
        break;
      case 'GENERIC_API':
        // Handle HR_SYSTEM and TIME_TRACKING as GENERIC_API
        const apiType = (integration.config as any)?.apiType;
        if (apiType === 'HR_SYSTEM') {
          syncedCount = await this.syncHRSystem(tenantId, userId, integration);
        } else if (apiType === 'TIME_TRACKING') {
          syncedCount = await this.syncTimeTracking(tenantId, userId, integration);
        }
        break;
      case 'MANUAL_UPLOAD':
        // No auto-sync needed
        break;
      default:
        this.logger.warn(`Unknown integration type: ${integration.type}`);
    }

    this.logger.log(
      `Synced ${syncedCount} items from ${integration.type} for tenant ${tenantId}`,
    );

    return { synced: syncedCount };
  }

  /**
   * Sync Google Drive (simulated for now)
   */
  private async syncGoogleDrive(
    tenantId: string,
    userId: string,
    integration: any,
  ): Promise<number> {
    // In production, this would use Google Drive API
    // For now, simulate finding new documents

    const config = integration.config as any;
    const folderId = config.folderId;

    if (!folderId) {
      this.logger.warn('Google Drive folder ID not configured');
      return 0;
    }

    // Simulate: Find files modified in last hour
    // In real implementation: Use Google Drive API to list files
    const simulatedFiles = await this.simulateGoogleDriveFiles(tenantId, folderId);

    let syncedCount = 0;

    for (const file of simulatedFiles) {
      // Check if already synced
      const existing = await this.prisma.artifact.findFirst({
        where: {
          tenantId,
          metadata: {
            path: ['externalId'],
            equals: file.id,
          },
        },
      });

      if (existing) continue;

      // Create artifact
      await this.prisma.artifact.create({
        data: {
          tenantId,
          uploadedById: userId,
          name: file.name,
          description: `[자동 수집] Google Drive에서 동기화`,
          hash: file.hash,
          metadata: {
            externalId: file.id,
            source: 'GOOGLE_DRIVE',
            syncedAt: new Date(),
          },
        } as any,
      });

      syncedCount++;
    }

    return syncedCount;
  }

  /**
   * Sync HR System (simulated payroll/attendance data)
   */
  private async syncHRSystem(
    tenantId: string,
    userId: string,
    _integration: any,
  ): Promise<number> {
    // In production, this would call HR system API (Flex, Jobplanet, etc.)
    // For now, generate simulated payroll records

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if already synced for this month
    const existing = await this.prisma.artifact.findFirst({
      where: {
        tenantId,
        metadata: {
          path: ['month'],
          equals: currentMonth,
        },
        name: { contains: '급여대장' },
      },
    });

    if (existing) {
      this.logger.log(`HR data for ${currentMonth} already synced`);
      return 0;
    }

    // Create payroll artifact
    await this.prisma.artifact.create({
      data: {
        tenantId,
        uploadedById: userId,
        name: `${currentMonth} 급여대장`,
        description: `[자동 수집] HR 시스템에서 급여 데이터 동기화`,
        hash: this.generateHash(`payroll-${currentMonth}`),
        metadata: {
          source: 'HR_SYSTEM',
          month: currentMonth,
          syncedAt: new Date(),
          recordType: 'PAYROLL',
        },
      } as any,
    });

    // Create attendance artifact
    await this.prisma.artifact.create({
      data: {
        tenantId,
        uploadedById: userId,
        name: `${currentMonth} 근태 기록`,
        description: `[자동 수집] HR 시스템에서 근태 데이터 동기화`,
        hash: this.generateHash(`attendance-${currentMonth}`),
        metadata: {
          source: 'HR_SYSTEM',
          month: currentMonth,
          syncedAt: new Date(),
          recordType: 'ATTENDANCE',
        },
      } as any,
    });

    return 2;
  }

  /**
   * Sync Time Tracking (simulated overtime approvals)
   */
  private async syncTimeTracking(
    tenantId: string,
    userId: string,
    _integration: any,
  ): Promise<number> {
    // Simulate finding overtime approvals from the last day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create overtime approval record
    await this.prisma.artifact.create({
      data: {
        tenantId,
        uploadedById: userId,
        name: `연장근로 승인 기록 (${yesterday.toISOString().split('T')[0]})`,
        description: `[자동 수집] 근태 시스템에서 연장근로 승인 내역 동기화`,
        hash: this.generateHash(`overtime-${yesterday.getTime()}`),
        metadata: {
          source: 'TIME_TRACKING',
          date: yesterday.toISOString(),
          syncedAt: new Date(),
          recordType: 'OVERTIME_APPROVAL',
        },
      } as any,
    });

    return 1;
  }

  /**
   * Simulate Google Drive files
   */
  private async simulateGoogleDriveFiles(
    _tenantId: string,
    _folderId: string,
  ): Promise<any[]> {
    // In real implementation, this would call Google Drive API
    // For now, return empty or generate test data periodically

    const hourOfDay = new Date().getHours();

    // Only generate new files during business hours for realism
    if (hourOfDay < 9 || hourOfDay > 18) {
      return [];
    }

    // Randomly generate 0-2 files
    const fileCount = Math.floor(Math.random() * 3);
    const files: any[] = [];

    for (let i = 0; i < fileCount; i++) {
      files.push({
        id: `gdrive-${Date.now()}-${i}`,
        name: `Document-${Date.now()}.pdf`,
        hash: this.generateHash(`gdrive-${Date.now()}-${i}`),
        mimeType: 'application/pdf',
      });
    }

    return files;
  }

  /**
   * Generate hash for artifact
   */
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get sync status for an integration
   */
  async getSyncStatus(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Count artifacts from this integration
    const artifactCount = await this.prisma.artifact.count({
      where: {
        tenantId,
        metadata: {
          path: ['source'],
          equals: integration.type,
        },
      },
    });

    // Get last synced artifact
    const lastArtifact = await this.prisma.artifact.findFirst({
      where: {
        tenantId,
        metadata: {
          path: ['source'],
          equals: integration.type,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      integrationId,
      type: integration.type,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      totalArtifactsSynced: artifactCount,
      lastSyncedArtifact: lastArtifact
        ? {
            name: lastArtifact.name,
            createdAt: lastArtifact.createdAt,
          }
        : null,
      nextSyncScheduled: integration.status === 'ACTIVE'
        ? new Date(Date.now() + 60 * 60 * 1000) // Next hour
        : null,
    };
  }
}
