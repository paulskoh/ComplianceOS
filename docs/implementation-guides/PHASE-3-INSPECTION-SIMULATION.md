# Phase 3: Inspection Simulation Implementation Guide

## Overview
Build a preventative "Simulate inspection today" feature that helps SMEs prepare for actual inspections.

## Backend Implementation

### 1. Create Simulation Service
**File:** `apps/api/src/readiness/simulation.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObligationDomain } from '@prisma/client';

export interface SimulationPreset {
  name: string;
  nameKo: string;
  domains: ObligationDomain[];
  description: string;
}

export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    name: 'Labor Inspection',
    nameKo: '노동청 점검',
    domains: ['LABOR'],
    description: 'Ministry of Employment and Labor inspection simulation',
  },
  {
    name: 'Privacy Inspection',
    nameKo: '개인정보위원회 점검',
    domains: ['PRIVACY'],
    description: 'Personal Information Protection Commission inspection',
  },
  {
    name: 'Internal Audit',
    nameKo: '내부 감사',
    domains: ['LABOR', 'PRIVACY', 'SECURITY', 'TRAINING'],
    description: 'Comprehensive internal audit simulation',
  },
];

@Injectable()
export class SimulationService {
  constructor(
    private prisma: PrismaService,
    private readiness: ReadinessService,
  ) {}

  async runSimulation(
    tenantId: string,
    preset: string,
    startDate: Date,
    endDate: Date,
  ) {
    // 1. Get the preset configuration
    const presetConfig = SIMULATION_PRESETS.find(p => p.nameKo === preset);

    // 2. Get gaps from readiness service filtered by domains
    const allGaps = await this.readiness.detectGaps(tenantId);
    const relevantGaps = allGaps.filter(gap =>
      presetConfig.domains.includes(gap.domain)
    );

    // 3. Check for missing evidence in date range
    const missingEvidence = await this.findMissingEvidence(
      tenantId,
      presetConfig.domains,
      startDate,
      endDate,
    );

    // 4. Generate failing controls list
    const failingControls = await this.identifyFailingControls(
      tenantId,
      relevantGaps,
    );

    // 5. Calculate readiness delta vs previous month
    const currentScore = await this.readiness.getScore(tenantId);
    const previousSnapshot = await this.prisma.readinessSnapshot.findFirst({
      where: {
        tenantId,
        snapshotDate: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),  // 30 days ago
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });

    const delta = previousSnapshot
      ? currentScore.overallScore - previousSnapshot.overallScore
      : 0;

    // 6. Create audit log
    await this.prisma.auditLogEvent.create({
      data: {
        tenantId,
        eventType: 'SIMULATION_RUN',
        resourceType: 'InspectionSimulation',
        metadata: {
          preset,
          startDate,
          endDate,
          gapsFound: relevantGaps.length,
          score: currentScore.overallScore,
        },
      },
    });

    return {
      preset: presetConfig,
      dateRange: { startDate, endDate },
      score: currentScore.overallScore,
      level: currentScore.readinessLevel,
      delta,
      deltaLabel: delta > 0 ? 'IMPROVED' : delta < 0 ? 'DECLINED' : 'UNCHANGED',
      gaps: relevantGaps.length,
      failingControls,
      missingEvidence,
      recommendations: this.generateRecommendations(relevantGaps),
    };
  }

  private async findMissingEvidence(
    tenantId: string,
    domains: ObligationDomain[],
    startDate: Date,
    endDate: Date,
  ) {
    // Find controls in these domains that lack recent evidence
    const controls = await this.prisma.control.findMany({
      where: {
        tenantId,
        obligations: {
          some: {
            obligation: {
              domain: { in: domains },
            },
          },
        },
      },
      include: {
        evidenceRequirements: true,
        artifacts: {
          where: {
            artifact: {
              createdAt: { gte: startDate, lte: endDate },
              isDeleted: false,
            },
          },
          include: { artifact: true },
        },
      },
    });

    const missing = [];
    for (const control of controls) {
      for (const requirement of control.evidenceRequirements) {
        const hasEvidence = control.artifacts.some(a =>
          a.artifact.name.includes(requirement.name)
        );
        if (!hasEvidence) {
          missing.push({
            controlId: control.id,
            controlName: control.name,
            requirementName: requirement.name,
            freshnessWindowDays: requirement.freshnessWindowDays,
          });
        }
      }
    }

    return missing;
  }

  private async identifyFailingControls(tenantId: string, gaps: any[]) {
    const controlIds = [...new Set(gaps.map(g => g.controlId).filter(Boolean))];

    const controls = await this.prisma.control.findMany({
      where: {
        id: { in: controlIds },
        tenantId,
      },
      include: {
        obligations: {
          include: {
            obligation: true,
          },
        },
      },
    });

    return controls.map(control => ({
      id: control.id,
      name: control.name,
      obligation: control.obligations[0]?.obligation.titleKo || 'Unknown',
      gapCount: gaps.filter(g => g.controlId === control.id).length,
      highestSeverity: gaps
        .filter(g => g.controlId === control.id)
        .reduce((max, g) => (g.severity > max ? g.severity : max), 'LOW'),
    }));
  }

  private generateRecommendations(gaps: any[]) {
    const recommendations = [];

    // Group gaps by type
    const byType = gaps.reduce((acc, gap) => {
      acc[gap.type] = (acc[gap.type] || 0) + 1;
      return acc;
    }, {});

    if (byType.MISSING_EVIDENCE > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: '증빙 자료 업로드',
        description: `${byType.MISSING_EVIDENCE}개의 필수 증빙이 누락되었습니다. 즉시 업로드하세요.`,
      });
    }

    if (byType.OUTDATED_EVIDENCE > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: '최신 증빙 업데이트',
        description: `${byType.OUTDATED_EVIDENCE}개의 증빙이 유효기간이 경과했습니다.`,
      });
    }

    if (byType.NO_CONTROL > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: '통제 항목 생성',
        description: `${byType.NO_CONTROL}개의 의무사항에 통제가 없습니다.`,
      });
    }

    return recommendations;
  }

  /**
   * Generate a DRAFT inspection pack for simulation
   */
  async generateDraftPack(
    tenantId: string,
    userId: string,
    simulationResult: any,
  ) {
    // Create draft pack (marked as draft in metadata)
    const pack = await this.prisma.inspectionPack.create({
      data: {
        tenantId,
        createdById: userId,
        name: `DRAFT - ${simulationResult.preset.nameKo} Simulation`,
        domain: simulationResult.preset.domains[0],
        startDate: simulationResult.dateRange.startDate,
        endDate: simulationResult.dateRange.endDate,
        status: 'COMPLETED',
        // Add watermark in manifest
      },
    });

    return {
      packId: pack.id,
      isDraft: true,
      watermark: 'DRAFT - FOR SIMULATION ONLY',
      missingEvidenceSummary: simulationResult.missingEvidence,
      recommendations: simulationResult.recommendations,
    };
  }
}
```

### 2. Add Controller Endpoint
**File:** `apps/api/src/readiness/readiness.controller.ts`

Add these endpoints:
```typescript
@Post('simulate')
async runSimulation(@CurrentUser() user: any, @Body() dto: any) {
  return this.simulationService.runSimulation(
    user.tenantId,
    dto.preset,
    new Date(dto.startDate),
    new Date(dto.endDate),
  );
}

@Post('simulate/:id/draft-pack')
async generateDraftPack(
  @CurrentUser() user: any,
  @Param('id') simulationId: string,
  @Body() simulationResult: any,
) {
  return this.simulationService.generateDraftPack(
    user.tenantId,
    user.userId,
    simulationResult,
  );
}
```

## Frontend Implementation

### 3. Create Simulation Page
**File:** `apps/web/src/app/readiness/simulate/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { readiness } from '@/lib/api'

const PRESETS = [
  { id: 'labor', nameKo: '노동청 점검', description: 'Ministry of Employment and Labor' },
  { id: 'privacy', nameKo: '개인정보위원회 점검', description: 'Privacy Commission' },
  { id: 'internal', nameKo: '내부 감사', description: 'Internal Audit' },
]

export default function SimulationPage() {
  const [preset, setPreset] = useState('labor')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = async () => {
    setLoading(true)
    try {
      const res = await readiness.simulate({ preset, ...dateRange })
      setResult(res.data)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inspection Simulation</h1>

      {/* Preset Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Select Inspection Type</h2>
        <div className="space-y-2">
          {PRESETS.map(p => (
            <label key={p.id} className="flex items-center space-x-3">
              <input
                type="radio"
                checked={preset === p.id}
                onChange={() => setPreset(p.id)}
                className="h-4 w-4"
              />
              <div>
                <div className="font-medium">{p.nameKo}</div>
                <div className="text-sm text-gray-500">{p.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Evidence Date Range</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <button
        onClick={runSimulation}
        disabled={loading}
        className="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <ResultsCard result={result} />
        </div>
      )}
    </div>
  )
}
```

## API Client Updates

Add to `apps/web/src/lib/api.ts`:
```typescript
export const readiness = {
  getScore: () => api.get('/readiness/score'),
  getGaps: () => api.get('/readiness/gaps'),
  simulate: (data: any) => api.post('/readiness/simulate', data),
  generateDraftPack: (data: any) => api.post('/readiness/simulate/draft-pack', data),
}
```

## Testing Checklist
- [ ] Can select different presets
- [ ] Can adjust date range
- [ ] Simulation returns failing controls
- [ ] Missing evidence list is accurate
- [ ] Readiness delta is calculated
- [ ] Recommendations are relevant
- [ ] Draft pack generation works
- [ ] Audit log is created
