import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current plan usage for a tenant
   */
  async getPlanUsage(tenantId: string) {
    const plan = await this.prisma.tenantPlan.findUnique({
      where: { tenantId },
    });

    if (!plan) {
      // Return default free tier if no plan found
      return {
        plan: 'STARTER',
        limits: {
          obligations: { used: 0, max: 10 },
          integrations: { used: 0, max: 1 },
          packsThisMonth: { used: 0, max: 3 },
          storage: { used: 0, max: 5, unit: 'GB' },
          users: { used: 0, max: 5 },
        },
        billingPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      };
    }

    const [obligationsCount, integrationsCount, usersCount, storageBytes] =
      await Promise.all([
        this.prisma.obligation.count({
          where: { tenantId, isActive: true },
        }),
        this.prisma.integration.count({
          where: { tenantId, status: 'ACTIVE' },
        }),
        this.prisma.user.count({
          where: { tenantId, isActive: true },
        }),
        this.calculateStorageUsage(tenantId),
      ]);

    return {
      plan: plan.tier,
      limits: {
        obligations: { used: obligationsCount, max: plan.maxObligations },
        integrations: { used: integrationsCount, max: plan.maxIntegrations },
        packsThisMonth: {
          used: plan.packsGeneratedThisMonth,
          max: plan.maxPacksPerMonth,
        },
        storage: {
          used: storageBytes / 1024 ** 3,
          max: plan.maxStorageGB,
          unit: 'GB',
        },
        users: { used: usersCount, max: plan.maxUsers },
      },
      billingPeriod: {
        start: plan.billingPeriodStart,
        end: plan.billingPeriodEnd,
      },
    };
  }

  /**
   * Reset monthly counters (run on 1st of each month)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetMonthlyCounters() {
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;

    if (isFirstOfMonth) {
      await this.prisma.tenantPlan.updateMany({
        data: { packsGeneratedThisMonth: 0 },
      });
    }
  }

  /**
   * Calculate total storage usage for a tenant
   */
  private async calculateStorageUsage(tenantId: string): Promise<number> {
    const result = await this.prisma.artifactBinary.aggregate({
      where: {
        artifact: { tenantId, isDeleted: false },
      },
      _sum: { fileSize: true },
    });

    return result._sum.fileSize || 0;
  }

  /**
   * Increment obligation usage counter
   */
  async incrementObligationUsage(tenantId: string) {
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { obligationsUsed: { increment: 1 } },
    });
  }

  /**
   * Decrement obligation usage counter
   */
  async decrementObligationUsage(tenantId: string) {
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { obligationsUsed: { decrement: 1 } },
    });
  }

  /**
   * Increment integration usage counter
   */
  async incrementIntegrationUsage(tenantId: string) {
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { integrationsUsed: { increment: 1 } },
    });
  }

  /**
   * Decrement integration usage counter
   */
  async decrementIntegrationUsage(tenantId: string) {
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { integrationsUsed: { decrement: 1 } },
    });
  }

  /**
   * Increment pack generation counter
   */
  async incrementPackCounter(tenantId: string) {
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { packsGeneratedThisMonth: { increment: 1 } },
    });
  }

  /**
   * Update storage usage
   */
  async updateStorageUsage(tenantId: string, bytes: number) {
    const gb = bytes / 1024 ** 3;
    await this.prisma.tenantPlan.update({
      where: { tenantId },
      data: { storageUsedGB: gb },
    });
  }

  /**
   * Check if tenant can perform an action based on plan limits
   */
  async canPerformAction(
    tenantId: string,
    resource: 'obligations' | 'integrations' | 'packs' | 'storage' | 'users',
  ): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getPlanUsage(tenantId);

    switch (resource) {
      case 'obligations':
        if (usage.limits.obligations.used >= usage.limits.obligations.max) {
          return {
            allowed: false,
            reason: `Obligation limit reached (${usage.limits.obligations.max})`,
          };
        }
        break;

      case 'integrations':
        if (
          usage.limits.integrations.used >= usage.limits.integrations.max
        ) {
          return {
            allowed: false,
            reason: `Integration limit reached (${usage.limits.integrations.max})`,
          };
        }
        break;

      case 'packs':
        if (
          usage.limits.packsThisMonth.used >= usage.limits.packsThisMonth.max
        ) {
          return {
            allowed: false,
            reason: `Monthly pack limit reached (${usage.limits.packsThisMonth.max})`,
          };
        }
        break;

      case 'storage':
        if (usage.limits.storage.used >= usage.limits.storage.max) {
          return {
            allowed: false,
            reason: `Storage limit reached (${usage.limits.storage.max}GB)`,
          };
        }
        break;

      case 'users':
        if (usage.limits.users.used >= usage.limits.users.max) {
          return {
            allowed: false,
            reason: `User limit reached (${usage.limits.users.max})`,
          };
        }
        break;
    }

    return { allowed: true };
  }
}
