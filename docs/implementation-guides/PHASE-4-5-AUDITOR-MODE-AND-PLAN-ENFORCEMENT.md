# Phases 4 & 5: Auditor Mode + Plan Enforcement

## Phase 4: Auditor/Inspector Read-Only Mode

### Backend: Update JWT Strategy
**File:** `apps/api/src/common/guards/auditor-guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuditorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.role === 'AUDITOR') {
      // AUDITOR can only GET, not POST/PUT/DELETE/PATCH
      const method = request.method;
      if (method !== 'GET') {
        throw new ForbiddenException(
          'Auditors have read-only access. Cannot perform write operations.',
        );
      }
    }

    return true;
  }
}
```

### Add Auditor-Specific Endpoints
**File:** `apps/api/src/inspection/inspection.controller.ts` (NEW)

```typescript
import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('inspection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection')
export class InspectionController {
  constructor(
    private packService: InspectionPacksService,
    private artifactsService: ArtifactsService,
  ) {}

  /**
   * Get inspection pack with secure time-limited access
   */
  @Get('pack/:token')
  async getPackByToken(@Param('token') token: string, @Req() req: any) {
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
    await this.prisma.auditLogEvent.create({
      data: {
        tenantId: shareLink.pack.tenantId,
        eventType: 'PACK_DOWNLOADED',
        resourceType: 'InspectionPack',
        resourceId: shareLink.packId,
        metadata: {
          accessedViaToken: token,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });

    return shareLink.pack;
  }

  /**
   * Generate time-limited share link for auditors
   */
  @Post('pack/:id/share-link')
  async createShareLink(
    @CurrentUser() user: any,
    @Param('id') packId: string,
    @Body() dto: { expiresInDays: number },
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);

    const link = await this.prisma.packShareLink.create({
      data: {
        packId,
        token,
        expiresAt,
      },
    });

    return {
      url: `${process.env.PUBLIC_URL}/inspection/${token}`,
      expiresAt,
    };
  }
}
```

### Frontend: Inspection View
**File:** `apps/web/src/app/inspection/[token]/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function InspectionViewPage() {
  const { token } = useParams()
  const [pack, setPack] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/inspection/pack/${token}`)
      .then(res => res.json())
      .then(data => setPack(data))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Auditor watermark */}
      <div className="text-center mb-4 text-gray-500 text-sm">
        🔒 Read-Only Inspection View
      </div>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{pack.name}</h1>

        {/* No edit controls - pure read-only */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Show pack contents, evidence, etc */}
        </div>
      </div>
    </div>
  )
}
```

---

## Phase 5: Plan Enforcement

### Backend: Plan Enforcement Middleware
**File:** `apps/api/src/common/guards/plan-limits.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlanLimit {
  resource: 'obligations' | 'integrations' | 'packs' | 'storage' | 'users';
  operation: 'create' | 'generate' | 'upload';
}

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const limit: PlanLimit = Reflect.getMetadata('planLimit', context.getHandler());

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
        if (limit.operation === 'create' && plan.obligationsUsed >= plan.maxObligations) {
          throw new ForbiddenException(
            `Plan limit reached: Maximum ${plan.maxObligations} obligations allowed. Upgrade to add more.`,
          );
        }
        break;

      case 'integrations':
        if (limit.operation === 'create' && plan.integrationsUsed >= plan.maxIntegrations) {
          throw new ForbiddenException(
            `Plan limit reached: Maximum ${plan.maxIntegrations} integrations allowed. Upgrade for more integrations.`,
          );
        }
        break;

      case 'packs':
        if (limit.operation === 'generate' && plan.packsGeneratedThisMonth >= plan.maxPacksPerMonth) {
          throw new ForbiddenException(
            `Monthly pack limit reached: ${plan.maxPacksPerMonth} packs per month. Limit resets on ${plan.billingPeriodEnd?.toLocaleDateString()}.`,
          );
        }
        break;

      case 'storage':
        if (limit.operation === 'upload' && plan.storageUsedGB >= plan.maxStorageGB) {
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

// Decorator for easy use
export const PlanLimit = (resource: string, operation: string) =>
  SetMetadata('planLimit', { resource, operation });
```

### Usage in Controllers
**Example:** `apps/api/src/obligations/obligations.controller.ts`

```typescript
import { PlanLimitsGuard, PlanLimit } from '../common/guards/plan-limits.guard';

@Post()
@UseGuards(PlanLimitsGuard)
@PlanLimit('obligations', 'create')
async create(@CurrentUser() user: any, @Body() dto: any) {
  const obligation = await this.obligationsService.create(user.tenantId, dto);

  // Increment usage counter
  await this.prisma.tenantPlan.update({
    where: { tenantId: user.tenantId },
    data: { obligationsUsed: { increment: 1 } },
  });

  return obligation;
}
```

### Plan Service
**File:** `apps/api/src/plans/plans.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async getPlanUsage(tenantId: string) {
    const plan = await this.prisma.tenantPlan.findUnique({
      where: { tenantId },
    });

    const [obligationsCount, integrationsCount, usersCount, storageBytes] = await Promise.all([
      this.prisma.obligation.count({ where: { tenantId, isActive: true } }),
      this.prisma.integration.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.calculateStorageUsage(tenantId),
    ]);

    return {
      plan: plan.tier,
      limits: {
        obligations: { used: obligationsCount, max: plan.maxObligations },
        integrations: { used: integrationsCount, max: plan.maxIntegrations },
        packsThisMonth: { used: plan.packsGeneratedThisMonth, max: plan.maxPacksPerMonth },
        storage: { used: storageBytes / (1024 ** 3), max: plan.maxStorageGB, unit: 'GB' },
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
  @Cron('0 0 1 * *') // Midnight on 1st of month
  async resetMonthlyCounters() {
    await this.prisma.tenantPlan.updateMany({
      data: { packsGeneratedThisMonth: 0 },
    });
  }

  private async calculateStorageUsage(tenantId: string): Promise<number> {
    const result = await this.prisma.artifactBinary.aggregate({
      where: {
        artifact: { tenantId, isDeleted: false },
      },
      _sum: { fileSize: true },
    });

    return result._sum.fileSize || 0;
  }
}
```

### Frontend: Usage Meters
**File:** `apps/web/src/components/PlanUsageMeter.tsx`

```typescript
export function PlanUsageMeter({ usage }: { usage: any }) {
  const getPercentage = (used: number, max: number) => (used / max) * 100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Plan Usage</h3>

      {Object.entries(usage.limits).map(([key, limit]: any) => {
        const pct = getPercentage(limit.used, limit.max)
        const isNearLimit = pct > 80

        return (
          <div key={key} className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize">{key}</span>
              <span className={isNearLimit ? 'text-red-600 font-medium' : ''}>
                {limit.used} / {limit.max} {limit.unit || ''}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {isNearLimit && (
              <p className="text-xs text-red-600 mt-1">
                Near limit - consider upgrading
              </p>
            )}
          </div>
        )
      })}

      <button className="w-full mt-4 bg-gray-900 text-white py-2 rounded hover:bg-gray-800">
        Upgrade Plan
      </button>
    </div>
  )
}
```

## Testing Checklist

### Auditor Mode
- [ ] AUDITOR role cannot POST/PUT/DELETE
- [ ] Time-limited links expire correctly
- [ ] Access logging works
- [ ] Inspection view is read-only
- [ ] No configuration controls visible

### Plan Enforcement
- [ ] Cannot exceed obligation limit
- [ ] Cannot exceed integration limit
- [ ] Monthly pack limit enforced
- [ ] Storage limit enforced
- [ ] User limit enforced
- [ ] Usage meters display correctly
- [ ] Monthly counters reset properly
- [ ] Helpful error messages shown
