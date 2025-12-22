import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExceptionStatus } from '@prisma/client';

export interface CreateExceptionDto {
  controlId: string;
  reason: string;
  compensatingControls?: string;
  durationDays: number;
}

export interface ApproveExceptionDto {
  approvedBy: string;
  comments?: string;
}

export interface RejectExceptionDto {
  rejectedBy: string;
  reason: string;
}

@Injectable()
export class ExceptionsService {
  private readonly logger = new Logger(ExceptionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new exception request
   */
  async create(tenantId: string, userId: string, dto: CreateExceptionDto) {
    // Validate control exists
    const control = await this.prisma.control.findFirst({
      where: { id: dto.controlId, tenantId },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    // Check if there's already an active exception for this control
    const existing = await this.prisma.exceptionRequest.findFirst({
      where: {
        tenantId,
        controlId: dto.controlId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'An active exception request already exists for this control',
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.durationDays);

    const exception = await this.prisma.exceptionRequest.create({
      data: {
        tenantId,
        controlId: dto.controlId,
        reason: dto.reason,
        compensatingControls: dto.compensatingControls,
        durationDays: dto.durationDays,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    return exception;
  }

  /**
   * Get all exception requests for a tenant
   */
  async findAll(tenantId: string, status?: ExceptionStatus) {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const exceptions = await this.prisma.exceptionRequest.findMany({
      where,
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return exceptions;
  }

  /**
   * Get a single exception request
   */
  async findOne(tenantId: string, id: string) {
    const exception = await this.prisma.exceptionRequest.findFirst({
      where: { id, tenantId },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    if (!exception) {
      throw new NotFoundException('Exception request not found');
    }

    return exception;
  }

  /**
   * Approve an exception request
   */
  async approve(tenantId: string, id: string, dto: ApproveExceptionDto) {
    const exception = await this.findOne(tenantId, id);

    if (exception.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending exception requests can be approved',
      );
    }

    const updated = await this.prisma.exceptionRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      tenantId,
      dto.approvedBy,
      'APPROVE_EXCEPTION',
      `Approved exception for control: ${exception.control.name}`,
      {
        exceptionId: id,
        controlId: exception.controlId,
        reason: exception.reason,
        durationDays: exception.durationDays,
        expiresAt: exception.expiresAt,
        comments: dto.comments,
      },
    );

    return updated;
  }

  /**
   * Reject an exception request
   */
  async reject(tenantId: string, id: string, dto: RejectExceptionDto) {
    const exception = await this.findOne(tenantId, id);

    if (exception.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending exception requests can be rejected',
      );
    }

    const updated = await this.prisma.exceptionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      tenantId,
      dto.rejectedBy,
      'REJECT_EXCEPTION',
      `Rejected exception for control: ${exception.control.name}`,
      {
        exceptionId: id,
        controlId: exception.controlId,
        rejectionReason: dto.reason,
      },
    );

    return updated;
  }

  /**
   * Revoke an approved exception
   */
  async revoke(tenantId: string, id: string, userId: string, reason: string) {
    const exception = await this.findOne(tenantId, id);

    if (exception.status !== 'APPROVED') {
      throw new BadRequestException('Only approved exceptions can be revoked');
    }

    const updated = await this.prisma.exceptionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'REVOKE_EXCEPTION',
      `Revoked exception for control: ${exception.control.name}`,
      {
        exceptionId: id,
        controlId: exception.controlId,
        revocationReason: reason,
      },
    );

    return updated;
  }

  /**
   * Check and expire old exceptions (runs daily at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOldExceptions() {
    this.logger.log('Checking for expired exceptions...');
    const now = new Date();

    const expired = await this.prisma.exceptionRequest.findMany({
      where: {
        status: 'APPROVED',
        expiresAt: { lt: now },
      },
    });

    for (const exception of expired) {
      await this.prisma.exceptionRequest.update({
        where: { id: exception.id },
        data: { status: 'EXPIRED' },
      });

      // Create audit log
      await this.createAuditLog(
        exception.tenantId,
        'system',
        'EXPIRE_EXCEPTION',
        `Exception expired for control: ${exception.controlId}`,
        {
          exceptionId: exception.id,
          controlId: exception.controlId,
          expiredAt: now,
        },
      );
    }

    this.logger.log(`Expired ${expired.length} old exceptions`);
    return { expired: expired.length };
  }

  /**
   * Get exception statistics for a tenant
   */
  async getStats(tenantId: string) {
    const [pending, approved, rejected, expired, total] = await Promise.all([
      this.prisma.exceptionRequest.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.exceptionRequest.count({
        where: { tenantId, status: 'APPROVED' },
      }),
      this.prisma.exceptionRequest.count({
        where: { tenantId, status: 'REJECTED' },
      }),
      this.prisma.exceptionRequest.count({
        where: { tenantId, status: 'EXPIRED' },
      }),
      this.prisma.exceptionRequest.count({ where: { tenantId } }),
    ]);

    // Get expiring soon (within 7 days)
    const expiringSoon = await this.prisma.exceptionRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        expiresAt: {
          gt: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      total,
      pending,
      approved,
      rejected,
      expired,
      expiringSoon,
    };
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    tenantId: string,
    userId: string,
    action: string,
    description: string,
    metadata: any,
  ) {
    try {
      await this.prisma.auditLogEvent.create({
        data: {
          tenantId,
          userId,
          eventType: action as any,
          metadata: metadata as any,
        },
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get pending exceptions requiring approval
   */
  async getPendingApprovals(tenantId: string) {
    const pending = await this.prisma.exceptionRequest.findMany({
      where: {
        tenantId,
        status: 'PENDING',
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return pending;
  }

  /**
   * Get active exceptions (approved and not expired)
   */
  async getActiveExceptions(tenantId: string) {
    const now = new Date();

    const active = await this.prisma.exceptionRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        expiresAt: { gt: now },
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return active;
  }
}
