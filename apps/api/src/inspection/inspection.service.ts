import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as crypto from 'crypto';

@Injectable()
export class InspectionService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Get inspection pack by time-limited token
   */
  async getPackByToken(token: string, ipAddress?: string, userAgent?: string) {
    const shareLink = await this.prisma.packShareLink.findUnique({
      where: { token },
      include: { pack: true },
    });

    if (!shareLink) {
      throw new NotFoundException('Invalid or expired link');
    }

    if (shareLink.expiresAt < new Date()) {
      throw new ForbiddenException('This inspection link has expired');
    }

    // Increment access count
    await this.prisma.packShareLink.update({
      where: { id: shareLink.id },
      data: { accessCount: { increment: 1 } },
    });

    // Log access
    await this.auditLog.log({
      tenantId: shareLink.pack.tenantId,
      eventType: 'PACK_DOWNLOADED',
      resourceType: 'InspectionPack',
      resourceId: shareLink.packId,
      metadata: {
        accessedViaToken: token,
        ipAddress,
        userAgent,
        accessCount: shareLink.accessCount + 1,
      },
    });

    return {
      pack: shareLink.pack,
      accessInfo: {
        accessCount: shareLink.accessCount + 1,
        expiresAt: shareLink.expiresAt,
        isReadOnly: true,
      },
    };
  }

  /**
   * Generate time-limited share link for auditors
   */
  async createShareLink(
    tenantId: string,
    userId: string,
    packId: string,
    expiresInDays: number,
  ) {
    // Verify pack exists and belongs to tenant
    const pack = await this.prisma.inspectionPack.findFirst({
      where: { id: packId, tenantId },
    });

    if (!pack) {
      throw new NotFoundException('Inspection pack not found');
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const link = await this.prisma.packShareLink.create({
      data: {
        packId,
        token,
        expiresAt,
        createdById: userId,
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'SHARE_LINK_CREATED',
      resourceType: 'InspectionPack',
      resourceId: packId,
      metadata: {
        token,
        expiresAt,
        expiresInDays,
      },
    });

    return {
      url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/inspection/${token}`,
      token,
      expiresAt,
      expiresInDays,
    };
  }

  /**
   * Revoke a share link
   */
  async revokeShareLink(tenantId: string, userId: string, token: string) {
    const shareLink = await this.prisma.packShareLink.findUnique({
      where: { token },
      include: { pack: true },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    if (shareLink.pack.tenantId !== tenantId) {
      throw new ForbiddenException('Unauthorized');
    }

    await this.prisma.packShareLink.delete({
      where: { token },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'SHARE_LINK_REVOKED',
      resourceType: 'InspectionPack',
      resourceId: shareLink.packId,
      metadata: { token },
    });

    return { success: true, message: 'Share link revoked' };
  }
}
