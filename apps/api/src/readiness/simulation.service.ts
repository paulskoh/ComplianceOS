import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReadinessService } from './readiness.service';
import { ObligationDomain } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

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
    private auditLog: AuditLogService,
  ) {}

  async runSimulation(
    tenantId: string,
    userId: string,
    preset: string,
    startDate: Date,
    endDate: Date,
  ) {
    // 1. Get the preset configuration
    const presetConfig = SIMULATION_PRESETS.find((p) => p.nameKo === preset);
    if (!presetConfig) {
      throw new Error(`Unknown preset: ${preset}`);
    }

    // 2. Get gaps from readiness service
    const allGaps = await this.readiness.getGapReport(tenantId);

    // Filter gaps by domains
    const relevantGaps = await this.filterGapsByDomain(
      tenantId,
      allGaps.gaps,
      presetConfig.domains,
    );

    // 3. Check for missing evidence in date range
    const missingEvidence = await this.findMissingEvidence(
      tenantId,
      presetConfig.domains,
      startDate,
      endDate,
    );

    // 4. Generate failing controls list
    const failingControls = await this.identifyFailingControls(tenantId, relevantGaps);

    // 5. Calculate readiness delta vs previous month
    const currentScore = await this.readiness.getScore(tenantId);
    const previousSnapshot = await this.prisma.readinessSnapshot.findFirst({
      where: {
        tenantId,
        snapshotDate: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });

    const delta = previousSnapshot
      ? currentScore.overallScore - previousSnapshot.overallScore
      : 0;

    // 6. Create audit log
    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'SIMULATION_RUN',
      resourceType: 'InspectionSimulation',
      metadata: {
        preset,
        startDate,
        endDate,
        gapsFound: relevantGaps.length,
        score: currentScore.overallScore,
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

  private async filterGapsByDomain(
    tenantId: string,
    gaps: any[],
    domains: ObligationDomain[],
  ) {
    // Get obligation IDs for these domains
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId, domain: { in: domains }, isActive: true },
      select: { id: true },
    });

    const obligationIds = obligations.map((o) => o.id);
    return gaps.filter((gap) => obligationIds.includes(gap.obligationId));
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
        isActive: true,
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
        const hasEvidence = control.artifacts.some(
          (a) =>
            a.artifact.name.includes(requirement.name) ||
            a.artifact.description?.includes(requirement.name),
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
    const controlIds = [...new Set(gaps.map((g) => g.controlId).filter(Boolean))];

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

    return controls.map((control) => ({
      id: control.id,
      name: control.name,
      obligation: control.obligations[0]?.obligation.titleKo || 'Unknown',
      gapCount: gaps.filter((g) => g.controlId === control.id).length,
      highestSeverity: gaps
        .filter((g) => g.controlId === control.id)
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
        metadata: {
          isDraft: true,
          watermark: 'DRAFT - FOR SIMULATION ONLY',
        },
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'DRAFT_PACK_GENERATED',
      resourceType: 'InspectionPack',
      resourceId: pack.id,
    });

    return {
      packId: pack.id,
      isDraft: true,
      watermark: 'DRAFT - FOR SIMULATION ONLY',
      missingEvidenceSummary: simulationResult.missingEvidence,
      recommendations: simulationResult.recommendations,
    };
  }

  /**
   * Get list of available simulation presets
   */
  getPresets() {
    return SIMULATION_PRESETS;
  }
}
