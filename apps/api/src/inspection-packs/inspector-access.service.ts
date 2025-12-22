import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

export interface InspectorAccess {
  id: string;
  packId: string;
  token: string;
  inspectorEmail: string;
  inspectorName: string;
  inspectorOrganization: string;
  expiresAt: Date;
  isActive: boolean;
  permissions: InspectorPermissions;
}

export interface InspectorPermissions {
  canViewPack: boolean;
  canDownloadArtifacts: boolean;
  canViewManifest: boolean;
  canExportReport: boolean;
}

@Injectable()
export class InspectorAccessService {
  private readonly logger = new Logger(InspectorAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grant inspector access to a pack
   * Creates a time-limited, read-only access token
   */
  async grantInspectorAccess(
    packId: string,
    inspectorEmail: string,
    inspectorName: string,
    inspectorOrganization: string,
    expiresInHours: number = 72,
    permissions?: Partial<InspectorPermissions>,
  ): Promise<InspectorAccess> {
    this.logger.log(
      `Granting inspector access to pack ${packId} for ${inspectorEmail}`,
    );

    // Verify pack exists and is FINAL
    const pack = await this.prisma.inspectionPack.findUnique({
      where: { id: packId },
    });

    if (!pack) {
      throw new Error(`Pack ${packId} not found`);
    }

    if (pack.status !== 'COMPLETED') {
      throw new Error('Only COMPLETED packs can be shared with inspectors');
    }

    // Generate secure access token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Default permissions: read-only access
    const defaultPermissions: InspectorPermissions = {
      canViewPack: true,
      canDownloadArtifacts: true,
      canViewManifest: true,
      canExportReport: true,
    };

    const finalPermissions = { ...defaultPermissions, ...permissions };

    // Create inspector access record
    const access = await this.prisma.inspectorAccess.create({
      data: {
        packId,
        token,
        inspectorEmail,
        inspectorName,
        inspectorOrganization,
        expiresAt,
        isActive: true,
        permissions: finalPermissions,
      },
    });

    this.logger.log(
      `Inspector access granted, expires at ${expiresAt.toISOString()}`,
    );

    return access as unknown as InspectorAccess;
  }

  /**
   * Verify inspector access token
   */
  async verifyInspectorAccess(token: string): Promise<InspectorAccess> {
    const access = await this.prisma.inspectorAccess.findUnique({
      where: { token },
      include: {
        pack: true,
      },
    });

    if (!access) {
      throw new UnauthorizedException('Invalid inspector access token');
    }

    if (!access.isActive) {
      throw new UnauthorizedException('Inspector access has been revoked');
    }

    if (new Date() > access.expiresAt) {
      throw new UnauthorizedException('Inspector access has expired');
    }

    // Log access
    await this.logInspectorActivity(access.id, 'ACCESS_VERIFIED');

    return access as unknown as InspectorAccess;
  }

  /**
   * Revoke inspector access
   */
  async revokeInspectorAccess(accessId: string, reason: string): Promise<void> {
    this.logger.warn(`Revoking inspector access ${accessId}: ${reason}`);

    await this.prisma.inspectorAccess.update({
      where: { id: accessId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    await this.logInspectorActivity(accessId, 'ACCESS_REVOKED', { reason });
  }

  /**
   * List all inspector accesses for a pack
   */
  async listInspectorAccesses(packId: string): Promise<InspectorAccess[]> {
    const accesses = await this.prisma.inspectorAccess.findMany({
      where: { packId },
      orderBy: { createdAt: 'desc' },
    });

    return accesses as unknown as InspectorAccess[];
  }

  /**
   * Get inspector access by token (for public inspector portal)
   */
  async getPackByInspectorToken(token: string) {
    const access = await this.verifyInspectorAccess(token);

    // Log view activity
    await this.logInspectorActivity(access.id, 'PACK_VIEWED');

    // Fetch pack with limited fields (read-only view)
    const pack = await this.prisma.inspectionPack.findUnique({
      where: { id: access.packId },
      include: {
        tenant: {
          select: {
            name: true,
            // Don't expose sensitive company info
          },
        },
        artifacts: {
          include: {
            artifact: {
              select: {
                id: true,
                name: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                uploadedAt: true,
                // Don't expose S3 keys or other sensitive data
              },
            },
          },
        },
      },
    });

    return {
      pack,
      inspector: {
        name: access.inspectorName,
        organization: access.inspectorOrganization,
        email: access.inspectorEmail,
      },
      access: {
        expiresAt: access.expiresAt,
        permissions: access.permissions,
      },
    };
  }

  /**
   * Log inspector activity for audit trail
   */
  private async logInspectorActivity(
    accessId: string,
    activityType: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.inspectorActivityLog.create({
        data: {
          inspectorAccessId: accessId,
          activityType,
          metadata,
          occurredAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log inspector activity:', error);
    }
  }

  /**
   * Get activity log for an inspector access
   */
  async getInspectorActivityLog(accessId: string) {
    return this.prisma.inspectorActivityLog.findMany({
      where: { inspectorAccessId: accessId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Extend inspector access expiration
   */
  async extendInspectorAccess(
    accessId: string,
    additionalHours: number,
  ): Promise<InspectorAccess> {
    const access = await this.prisma.inspectorAccess.findUnique({
      where: { id: accessId },
    });

    if (!access) {
      throw new Error(`Inspector access ${accessId} not found`);
    }

    const newExpiresAt = new Date(access.expiresAt);
    newExpiresAt.setHours(newExpiresAt.getHours() + additionalHours);

    const updated = await this.prisma.inspectorAccess.update({
      where: { id: accessId },
      data: { expiresAt: newExpiresAt },
    });

    this.logger.log(
      `Extended inspector access ${accessId} to ${newExpiresAt.toISOString()}`,
    );

    await this.logInspectorActivity(accessId, 'ACCESS_EXTENDED', {
      additionalHours,
      newExpiresAt: newExpiresAt.toISOString(),
    });

    return updated as unknown as InspectorAccess;
  }
}
