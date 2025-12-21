import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObligationDomain, EvidenceFrequency, RiskSeverity } from '@prisma/client';

interface GapItem {
  type: 'MISSING_EVIDENCE' | 'OUTDATED_EVIDENCE' | 'UNAPPROVED_EXCEPTION' | 'NO_CONTROL';
  severity: RiskSeverity;
  obligationId: string;
  obligationTitle: string;
  controlId?: string;
  controlName?: string;
  description: string;
  expectedFrequency?: EvidenceFrequency;
  lastEvidenceDate?: Date;
  daysSinceEvidence?: number;
}

@Injectable()
export class ReadinessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate real readiness score with gap analysis
   */
  async getScore(tenantId: string) {
    // Detect all gaps
    const gaps = await this.detectGaps(tenantId);

    // Automatically create risk items from critical gaps
    await this.autoGenerateRisks(tenantId, gaps);

    // Calculate score based on gaps
    const score = this.calculateScore(gaps);

    // Get domain breakdown
    const domainScores = await this.getDomainScores(tenantId, gaps);

    // Get summary stats
    const stats = await this.getStats(tenantId);

    return {
      overallScore: score.overall,
      readinessLevel: score.level,
      gaps: gaps.length,
      criticalGaps: gaps.filter((g) => g.severity === 'CRITICAL').length,
      highGaps: gaps.filter((g) => g.severity === 'HIGH').length,
      mediumGaps: gaps.filter((g) => g.severity === 'MEDIUM').length,
      lowGaps: gaps.filter((g) => g.severity === 'LOW').length,
      domainScores,
      gapDetails: gaps.slice(0, 20), // Top 20 most critical gaps
      stats,
    };
  }

  /**
   * Detect all compliance gaps
   */
  private async detectGaps(tenantId: string): Promise<GapItem[]> {
    const gaps: GapItem[] = [];

    // Get all active obligations with their controls
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId, isActive: true },
      include: {
        controls: {
          include: {
            control: {
              include: {
                evidenceRequirements: true,
                artifacts: {
                  include: {
                    artifact: {
                      where: { isDeleted: false },
                      orderBy: { createdAt: 'desc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const obligation of obligations) {
      // Gap 1: Obligation has no controls
      if (obligation.controls.length === 0) {
        gaps.push({
          type: 'NO_CONTROL',
          severity: 'HIGH',
          obligationId: obligation.id,
          obligationTitle: obligation.titleKo || obligation.title,
          description: `"${obligation.titleKo}" 의무에 대한 통제 항목이 없습니다. 통제를 생성하세요.`,
        });
        continue;
      }

      // Check each control
      for (const { control } of obligation.controls) {
        // Gap 2: Control has no evidence requirements
        if (control.evidenceRequirements.length === 0) {
          gaps.push({
            type: 'NO_CONTROL',
            severity: 'MEDIUM',
            obligationId: obligation.id,
            obligationTitle: obligation.titleKo || obligation.title,
            controlId: control.id,
            controlName: control.name,
            description: `통제 "${control.name}"에 증빙 요구사항이 정의되지 않았습니다.`,
          });
          continue;
        }

        // Check evidence freshness for each requirement
        for (const requirement of control.evidenceRequirements) {
          const artifacts = control.artifacts.map((a) => a.artifact);
          const relevantArtifacts = artifacts.filter(
            (a) => a.name.includes(requirement.name) || a.description?.includes(requirement.name),
          );

          // Gap 3: No evidence at all
          if (relevantArtifacts.length === 0) {
            gaps.push({
              type: 'MISSING_EVIDENCE',
              severity: this.getSeverityByFrequency(requirement.frequency),
              obligationId: obligation.id,
              obligationTitle: obligation.titleKo || obligation.title,
              controlId: control.id,
              controlName: control.name,
              description: `"${requirement.name}" 증빙이 없습니다.`,
              expectedFrequency: requirement.frequency,
            });
            continue;
          }

          // Gap 4: Evidence is outdated
          const latestArtifact = relevantArtifacts[0];
          const daysSince = this.getDaysSince(latestArtifact.createdAt);
          const maxDays = this.getMaxDaysForFrequency(requirement.frequency);

          if (daysSince > maxDays) {
            gaps.push({
              type: 'OUTDATED_EVIDENCE',
              severity: this.getSeverityByFrequency(requirement.frequency),
              obligationId: obligation.id,
              obligationTitle: obligation.titleKo || obligation.title,
              controlId: control.id,
              controlName: control.name,
              description: `"${requirement.name}" 증빙이 ${daysSince}일 전 것입니다. (요구: ${requirement.frequency})`,
              expectedFrequency: requirement.frequency,
              lastEvidenceDate: latestArtifact.createdAt,
              daysSinceEvidence: daysSince,
            });
          }
        }
      }
    }

    // Gap 5: Unapproved exceptions
    const unapprovedExceptions = await this.prisma.exceptionRequest.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        obligation: true,
        control: true,
      },
    });

    for (const exception of unapprovedExceptions) {
      gaps.push({
        type: 'UNAPPROVED_EXCEPTION',
        severity: 'MEDIUM',
        obligationId: exception.obligationId || '',
        obligationTitle: exception.obligation?.titleKo || 'Unknown',
        controlId: exception.controlId || undefined,
        controlName: exception.control?.name,
        description: `미승인 예외 요청: ${exception.reason}`,
      });
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return gaps;
  }

  /**
   * Auto-generate risk items from critical gaps
   */
  private async autoGenerateRisks(tenantId: string, gaps: GapItem[]) {
    const criticalGaps = gaps.filter(
      (g) => g.severity === 'CRITICAL' || g.severity === 'HIGH',
    );

    for (const gap of criticalGaps) {
      // Check if risk already exists for this gap
      const existing = await this.prisma.riskItem.findFirst({
        where: {
          tenantId,
          obligationId: gap.obligationId,
          controlId: gap.controlId,
          title: { contains: gap.description.substring(0, 50) },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (existing) continue; // Don't duplicate

      // Create risk item
      await this.prisma.riskItem.create({
        data: {
          tenantId,
          obligationId: gap.obligationId,
          controlId: gap.controlId,
          title: `[자동감지] ${gap.description}`,
          description: `시스템이 자동으로 감지한 준수 리스크: ${gap.description}\n\n의무사항: ${gap.obligationTitle}\n통제: ${gap.controlName || 'N/A'}`,
          severity: gap.severity,
          status: 'OPEN',
          dueDate: this.calculateDueDate(gap.severity),
        },
      });
    }
  }

  /**
   * Calculate readiness score (0-100)
   */
  private calculateScore(gaps: GapItem[]): { overall: number; level: string } {
    let baseScore = 100;

    // Deduct points based on gap severity
    for (const gap of gaps) {
      switch (gap.severity) {
        case 'CRITICAL':
          baseScore -= 15;
          break;
        case 'HIGH':
          baseScore -= 8;
          break;
        case 'MEDIUM':
          baseScore -= 3;
          break;
        case 'LOW':
          baseScore -= 1;
          break;
      }
    }

    const score = Math.max(0, Math.min(100, baseScore));

    // Determine readiness level
    let level: string;
    if (score >= 90) level = 'EXCELLENT';
    else if (score >= 75) level = 'GOOD';
    else if (score >= 60) level = 'FAIR';
    else if (score >= 40) level = 'POOR';
    else level = 'CRITICAL';

    return { overall: score, level };
  }

  /**
   * Get domain-specific scores
   */
  private async getDomainScores(tenantId: string, allGaps: GapItem[]) {
    const domains = Object.values(ObligationDomain);

    const scores = await Promise.all(
      domains.map(async (domain) => {
        const obligations = await this.prisma.obligation.count({
          where: { tenantId, domain, isActive: true },
        });

        if (obligations === 0) {
          return { domain, score: 100, obligations: 0, gaps: 0 };
        }

        // Get obligation IDs for this domain
        const obligationIds = await this.prisma.obligation.findMany({
          where: { tenantId, domain, isActive: true },
          select: { id: true },
        });

        const ids = obligationIds.map((o) => o.id);
        const domainGaps = allGaps.filter((g) => ids.includes(g.obligationId));

        // Calculate score
        let score = 100;
        for (const gap of domainGaps) {
          switch (gap.severity) {
            case 'CRITICAL':
              score -= 15;
              break;
            case 'HIGH':
              score -= 8;
              break;
            case 'MEDIUM':
              score -= 3;
              break;
            case 'LOW':
              score -= 1;
              break;
          }
        }

        return {
          domain,
          score: Math.max(0, Math.min(100, score)),
          obligations,
          gaps: domainGaps.length,
        };
      }),
    );

    return scores.filter((s) => s.obligations > 0);
  }

  /**
   * Get summary statistics
   */
  private async getStats(tenantId: string) {
    const [
      totalObligations,
      totalControls,
      totalArtifacts,
      totalRisks,
      openRisks,
      overdueRisks,
    ] = await Promise.all([
      this.prisma.obligation.count({ where: { tenantId, isActive: true } }),
      this.prisma.control.count({ where: { tenantId, isActive: true } }),
      this.prisma.artifact.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.riskItem.count({ where: { tenantId } }),
      this.prisma.riskItem.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.riskItem.count({
        where: { tenantId, status: 'OPEN', dueDate: { lt: new Date() } },
      }),
    ]);

    return {
      totalObligations,
      totalControls,
      totalArtifacts,
      totalRisks,
      openRisks,
      overdueRisks,
    };
  }

  /**
   * Helper: Get severity based on evidence frequency
   */
  private getSeverityByFrequency(frequency: EvidenceFrequency): RiskSeverity {
    switch (frequency) {
      case 'CONTINUOUS':
      case 'DAILY':
        return 'CRITICAL';
      case 'WEEKLY':
      case 'MONTHLY':
        return 'HIGH';
      case 'QUARTERLY':
        return 'MEDIUM';
      case 'ANNUALLY':
      case 'AS_NEEDED':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Helper: Get max days allowed for evidence frequency
   */
  private getMaxDaysForFrequency(frequency: EvidenceFrequency): number {
    switch (frequency) {
      case 'CONTINUOUS':
        return 1;
      case 'DAILY':
        return 3;
      case 'WEEKLY':
        return 10;
      case 'MONTHLY':
        return 35;
      case 'QUARTERLY':
        return 100;
      case 'ANNUALLY':
        return 380;
      case 'AS_NEEDED':
        return 9999;
      default:
        return 35;
    }
  }

  /**
   * Helper: Get days since date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Calculate due date based on severity
   */
  private calculateDueDate(severity: RiskSeverity): Date {
    const days = {
      CRITICAL: 3,
      HIGH: 7,
      MEDIUM: 14,
      LOW: 30,
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days[severity]);
    return dueDate;
  }

  /**
   * Get detailed gap report
   */
  async getGapReport(tenantId: string) {
    const gaps = await this.detectGaps(tenantId);

    return {
      total: gaps.length,
      bySeverity: {
        critical: gaps.filter((g) => g.severity === 'CRITICAL').length,
        high: gaps.filter((g) => g.severity === 'HIGH').length,
        medium: gaps.filter((g) => g.severity === 'MEDIUM').length,
        low: gaps.filter((g) => g.severity === 'LOW').length,
      },
      byType: {
        missingEvidence: gaps.filter((g) => g.type === 'MISSING_EVIDENCE').length,
        outdatedEvidence: gaps.filter((g) => g.type === 'OUTDATED_EVIDENCE').length,
        noControl: gaps.filter((g) => g.type === 'NO_CONTROL').length,
        unapprovedException: gaps.filter((g) => g.type === 'UNAPPROVED_EXCEPTION')
          .length,
      },
      gaps: gaps.map((g) => ({
        ...g,
        actionRequired: this.getActionForGap(g),
      })),
    };
  }

  /**
   * Get recommended action for a gap
   */
  private getActionForGap(gap: GapItem): string {
    switch (gap.type) {
      case 'MISSING_EVIDENCE':
        return `"${gap.description.split('"')[1]}" 증빙을 업로드하세요.`;
      case 'OUTDATED_EVIDENCE':
        return `최신 증빙을 업로드하세요. (${gap.expectedFrequency} 주기 필요)`;
      case 'NO_CONTROL':
        return '통제 항목을 생성하고 증빙 요구사항을 정의하세요.';
      case 'UNAPPROVED_EXCEPTION':
        return '예외 요청을 검토하고 승인/거부하세요.';
      default:
        return '조치가 필요합니다.';
    }
  }
}
