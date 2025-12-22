import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlanLimit {
  resource: 'obligations' | 'integrations' | 'packs' | 'storage' | 'users';
  operation: 'create' | 'generate' | 'upload';
}

/**
 * PlanLimitsGuard enforces tenant plan limits for various resources.
 * Checks usage against plan limits before allowing resource creation.
 */
@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle authentication
    }

    const limit: PlanLimit = this.reflector.get<PlanLimit>(
      'planLimit',
      context.getHandler(),
    );

    if (!limit) return true; // No limit specified

    const plan = await this.prisma.tenantPlan.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!plan) {
      throw new ForbiddenException('No plan found for tenant');
    }

    // Check limits based on resource type
    switch (limit.resource) {
      case 'obligations':
        if (
          limit.operation === 'create' &&
          plan.obligationsUsed >= plan.maxObligations
        ) {
          throw new ForbiddenException(
            `Plan limit reached: Maximum ${plan.maxObligations} obligations allowed. Upgrade to add more.`,
          );
        }
        break;

      case 'integrations':
        if (
          limit.operation === 'create' &&
          plan.integrationsUsed >= plan.maxIntegrations
        ) {
          throw new ForbiddenException(
            `Plan limit reached: Maximum ${plan.maxIntegrations} integrations allowed. Upgrade for more integrations.`,
          );
        }
        break;

      case 'packs':
        if (
          limit.operation === 'generate' &&
          plan.packsGeneratedThisMonth >= plan.maxPacksPerMonth
        ) {
          throw new ForbiddenException(
            `Monthly pack limit reached: ${plan.maxPacksPerMonth} packs per month. Limit resets on ${plan.billingPeriodEnd?.toLocaleDateString()}.`,
          );
        }
        break;

      case 'storage':
        if (
          limit.operation === 'upload' &&
          plan.storageUsedGB >= plan.maxStorageGB
        ) {
          throw new ForbiddenException(
            `Storage limit reached: ${plan.maxStorageGB}GB maximum. Please upgrade your plan or delete old artifacts.`,
          );
        }
        break;

      case 'users':
        const userCount = await this.prisma.user.count({
          where: { tenantId: user.tenantId, isActive: true },
        });
        if (limit.operation === 'create' && userCount >= plan.maxUsers) {
          throw new ForbiddenException(
            `User limit reached: Maximum ${plan.maxUsers} users allowed.`,
          );
        }
        break;
    }

    return true;
  }
}

/**
 * Decorator for specifying plan limits on controller endpoints
 * @param resource Resource type (obligations, integrations, packs, storage, users)
 * @param operation Operation type (create, generate, upload)
 */
export const PlanLimit = (
  resource: PlanLimit['resource'],
  operation: PlanLimit['operation'],
) => SetMetadata('planLimit', { resource, operation } as PlanLimit);
