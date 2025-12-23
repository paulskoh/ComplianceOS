import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum ControlStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  PARTIAL = 'PARTIAL',
  NOT_EVALUATED = 'NOT_EVALUATED',
}

export enum EvidenceFreshness {
  FRESH = 'FRESH',
  EXPIRING_SOON = 'EXPIRING_SOON',
  STALE = 'STALE',
  MISSING = 'MISSING',
}

export interface EvidenceEvaluation {
  evidenceRequirementId: string;
  evidenceName: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  freshness: EvidenceFreshness;
  uploadedAt?: Date;
  expiresAt?: Date;
  daysUntilExpiry?: number;
  artifactId?: string;
  reason: string;
}

export interface ControlEvaluation {
  controlId: string;
  controlCode: string;
  status: ControlStatus;
  evidenceEvaluations: EvidenceEvaluation[];
  passRate: number;
  lastEvaluatedAt: Date;
}

export interface ObligationEvaluation {
  obligationId: string;
  obligationCode: string;
  controlEvaluations: ControlEvaluation[];
  overallStatus: ControlStatus;
  passRate: number;
}

export interface ReadinessScore {
  overall: number;
  byDomain: Record<string, number>;
  byObligation: Record<string, number>;
  totalObligations: number;
  passingObligations: number;
  failingObligations: number;
  partialObligations: number;
  notEvaluatedObligations: number;
}

export interface RiskItem {
  id: string;
  obligationCode: string;
  controlCode: string | null;
  riskType: 'MISSING_EVIDENCE' | 'STALE_EVIDENCE' | 'FAILED_CONTROL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
}

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate evidence freshness based on upload date and cadence rule
   */
  calculateEvidenceFreshness(
    uploadedAt: Date | null,
    cadenceType: string,
    cadenceMonths: number | null,
  ): {
    freshness: EvidenceFreshness;
    expiresAt: Date | null;
    daysUntilExpiry: number | null;
  } {
    if (!uploadedAt) {
      return {
        freshness: EvidenceFreshness.MISSING,
        expiresAt: null,
        daysUntilExpiry: null,
      };
    }

    const now = new Date();
    let expiresAt: Date | null = null;

    // Calculate expiry date based on cadence
    switch (cadenceType) {
      case 'CONTINUOUS':
        // Continuous evidence should be refreshed monthly
        expiresAt = new Date(uploadedAt);
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        break;

      case 'MONTHLY':
        expiresAt = new Date(uploadedAt);
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        break;

      case 'QUARTERLY':
        expiresAt = new Date(uploadedAt);
        expiresAt.setMonth(expiresAt.getMonth() + 3);
        break;

      case 'ANNUAL':
        expiresAt = new Date(uploadedAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        break;

      case 'ONCE_PER_INSPECTION':
        // Valid until next inspection (assume 1 year)
        expiresAt = new Date(uploadedAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        break;

      case 'ON_CHANGE':
        // Valid indefinitely until something changes
        return {
          freshness: EvidenceFreshness.FRESH,
          expiresAt: null,
          daysUntilExpiry: null,
        };

      default:
        // Use cadenceMonths if provided
        if (cadenceMonths) {
          expiresAt = new Date(uploadedAt);
          expiresAt.setMonth(expiresAt.getMonth() + cadenceMonths);
        } else {
          // Default to monthly
          expiresAt = new Date(uploadedAt);
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
    }

    const daysUntilExpiry = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let freshness: EvidenceFreshness;
    if (daysUntilExpiry < 0) {
      freshness = EvidenceFreshness.STALE;
    } else if (daysUntilExpiry <= 7) {
      freshness = EvidenceFreshness.EXPIRING_SOON;
    } else {
      freshness = EvidenceFreshness.FRESH;
    }

    return { freshness, expiresAt, daysUntilExpiry };
  }

  /**
   * Evaluate a single evidence requirement
   * CRITICAL FIX: Uses explicit artifact links, not string matching
   */
  private async evaluateRequirement(
    companyId: string,
    requirement: any,
  ): Promise<{
    status: 'PASS' | 'WARN' | 'FAIL';
    reason: string;
    artifactId?: string;
    uploadedAt?: Date;
    expiresAt?: Date;
    daysUntilExpiry?: number;
  }> {
    // Query the latest artifact explicitly linked to THIS requirement
    const latestArtifactLink = await this.prisma.artifactEvidenceRequirement.findFirst({
      where: {
        evidenceRequirementId: requirement.id,
        artifact: {
          tenantId: companyId,
          isDeleted: false,
        },
      },
      include: {
        artifact: true,
      },
      orderBy: {
        artifact: {
          uploadedAt: 'desc',
        },
      },
    });

    const artifact = latestArtifactLink?.artifact;

    // No artifact linked => FAIL
    if (!artifact) {
      return {
        status: 'FAIL',
        reason: `Missing evidence: No artifact linked to requirement "${requirement.name}"`,
      };
    }

    // Check if approval is required but not granted
    if (requirement.isMandatory && !artifact.isApproved) {
      return {
        status: 'WARN',
        reason: `Evidence not approved: "${artifact.name}" must be approved for requirement "${requirement.name}"`,
        artifactId: artifact.id,
        uploadedAt: artifact.uploadedAt,
      };
    }

    // Evaluate freshness
    const cadenceRule = requirement.cadenceRule as any;
    const { freshness, expiresAt, daysUntilExpiry } = this.calculateEvidenceFreshness(
      artifact.uploadedAt,
      cadenceRule?.type || 'MONTHLY',
      cadenceRule?.reviewMonths || null,
    );

    if (freshness === EvidenceFreshness.STALE) {
      return {
        status: 'FAIL',
        reason: `Stale evidence: "${artifact.name}" expired ${Math.abs(daysUntilExpiry || 0)} days ago`,
        artifactId: artifact.id,
        uploadedAt: artifact.uploadedAt,
        expiresAt,
        daysUntilExpiry,
      };
    } else if (freshness === EvidenceFreshness.EXPIRING_SOON) {
      return {
        status: 'WARN',
        reason: `Evidence expiring: "${artifact.name}" expires in ${daysUntilExpiry} days`,
        artifactId: artifact.id,
        uploadedAt: artifact.uploadedAt,
        expiresAt,
        daysUntilExpiry,
      };
    } else {
      return {
        status: 'PASS',
        reason: `Fresh evidence: "${artifact.name}" is up to date`,
        artifactId: artifact.id,
        uploadedAt: artifact.uploadedAt,
        expiresAt,
        daysUntilExpiry,
      };
    }
  }

  /**
   * Evaluate a single control's status based on its evidence
   * CRITICAL FIX: Evaluates EACH requirement separately using explicit links
   */
  async evaluateControl(
    companyId: string,
    controlId: string,
  ): Promise<ControlEvaluation> {
    // SECURITY: Fetch control with tenantId check to prevent cross-tenant access
    const control = await this.prisma.control.findFirst({
      where: {
        id: controlId,
        tenantId: companyId,
      },
      include: {
        evidenceRequirements: true,
      },
    });

    if (!control) {
      throw new Error(`Control ${controlId} not found or access denied`);
    }

    const evidenceEvaluations: EvidenceEvaluation[] = [];
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;
    const totalRequired = control.evidenceRequirements.length;

    // Evaluate EACH requirement separately
    for (const evidenceReq of control.evidenceRequirements) {
      const evaluation = await this.evaluateRequirement(companyId, evidenceReq);

      evidenceEvaluations.push({
        evidenceRequirementId: evidenceReq.id,
        evidenceName: evidenceReq.name,
        status: evaluation.status,
        freshness: evaluation.status === 'PASS' ? EvidenceFreshness.FRESH :
                   evaluation.status === 'WARN' ? EvidenceFreshness.EXPIRING_SOON :
                   evaluation.artifactId ? EvidenceFreshness.STALE : EvidenceFreshness.MISSING,
        uploadedAt: evaluation.uploadedAt,
        expiresAt: evaluation.expiresAt,
        daysUntilExpiry: evaluation.daysUntilExpiry,
        artifactId: evaluation.artifactId,
        reason: evaluation.reason,
      });

      if (evaluation.status === 'PASS') passCount++;
      else if (evaluation.status === 'WARN') warnCount++;
      else failCount++;
    }

    // Determine overall control status
    let status: ControlStatus;
    const passRate = totalRequired > 0 ? (passCount / totalRequired) * 100 : 0;

    if (totalRequired === 0) {
      status = ControlStatus.NOT_EVALUATED;
    } else if (passCount === totalRequired) {
      status = ControlStatus.PASS;
    } else if (failCount > 0) {
      status = ControlStatus.FAIL;
    } else {
      status = ControlStatus.PARTIAL; // Some warnings
    }

    return {
      controlId: control.id,
      controlCode: control.code || '',
      status,
      evidenceEvaluations,
      passRate: Math.round(passRate),
      lastEvaluatedAt: new Date(),
    };
  }

  /**
   * Evaluate an obligation's status based on all its controls
   */
  async evaluateObligation(
    companyId: string,
    obligationId: string,
  ): Promise<ObligationEvaluation> {
    // SECURITY: Fetch obligation with tenantId check to prevent cross-tenant access
    const obligation = await this.prisma.obligation.findFirst({
      where: {
        id: obligationId,
        tenantId: companyId,
      },
      include: {
        controls: {
          include: {
            control: true,
          },
        },
      },
    });

    if (!obligation) {
      throw new Error(`Obligation ${obligationId} not found or access denied`);
    }

    const controlEvaluations: ControlEvaluation[] = [];
    let passingControls = 0;

    for (const controlObligation of obligation.controls) {
      const evaluation = await this.evaluateControl(companyId, controlObligation.control.id);
      controlEvaluations.push(evaluation);

      if (evaluation.status === ControlStatus.PASS) {
        passingControls++;
      }
    }

    const totalControls = obligation.controls.length;
    const passRate = totalControls > 0 ? (passingControls / totalControls) * 100 : 0;

    // Determine overall obligation status
    let overallStatus: ControlStatus;
    if (totalControls === 0) {
      overallStatus = ControlStatus.NOT_EVALUATED;
    } else if (passingControls === totalControls) {
      overallStatus = ControlStatus.PASS;
    } else if (passingControls === 0) {
      overallStatus = ControlStatus.FAIL;
    } else {
      overallStatus = ControlStatus.PARTIAL;
    }

    return {
      obligationId: obligation.id,
      obligationCode: obligation.code || '',
      controlEvaluations,
      overallStatus,
      passRate: Math.round(passRate),
    };
  }

  /**
   * Calculate overall readiness score for a company
   */
  async calculateReadinessScore(companyId: string): Promise<ReadinessScore> {
    this.logger.log(`Calculating readiness score for company ${companyId}`);

    // Fetch all obligations for the company
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId: companyId },
      include: {
        controls: {
          include: {
            control: true,
          },
        },
      },
    });

    const byDomain: Record<string, { pass: number; total: number }> = {};
    const byObligation: Record<string, number> = {};

    let passingObligations = 0;
    let failingObligations = 0;
    let partialObligations = 0;
    let notEvaluatedObligations = 0;

    for (const obligation of obligations) {
      const evaluation = await this.evaluateObligation(companyId, obligation.id);

      // Track by obligation
      byObligation[obligation.code || ''] = evaluation.passRate;

      // Track by domain
      const domain = obligation.domain || 'UNKNOWN';
      if (!byDomain[domain]) {
        byDomain[domain] = { pass: 0, total: 0 };
      }
      byDomain[domain].total++;

      // Track overall status
      switch (evaluation.overallStatus) {
        case ControlStatus.PASS:
          passingObligations++;
          byDomain[domain].pass++;
          break;
        case ControlStatus.FAIL:
          failingObligations++;
          break;
        case ControlStatus.PARTIAL:
          partialObligations++;
          byDomain[domain].pass += 0.5; // Partial credit
          break;
        case ControlStatus.NOT_EVALUATED:
          notEvaluatedObligations++;
          break;
      }
    }

    // Calculate domain scores
    const domainScores: Record<string, number> = {};
    for (const [domain, stats] of Object.entries(byDomain)) {
      domainScores[domain] =
        stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;
    }

    // Calculate overall score
    const totalObligations = obligations.length;
    const overall =
      totalObligations > 0
        ? Math.round(
            ((passingObligations + partialObligations * 0.5) / totalObligations) * 100,
          )
        : 0;

    this.logger.log(
      `Readiness score: ${overall}% (${passingObligations}/${totalObligations} passing)`,
    );

    return {
      overall,
      byDomain: domainScores,
      byObligation,
      totalObligations,
      passingObligations,
      failingObligations,
      partialObligations,
      notEvaluatedObligations,
    };
  }

  /**
   * Generate risk items based on evaluation results
   */
  async generateRisks(companyId: string): Promise<RiskItem[]> {
    this.logger.log(`Generating risks for company ${companyId}`);

    const risks: RiskItem[] = [];
    const now = new Date();

    // Fetch all obligations with controls and evidence
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId: companyId },
      include: {
        controls: {
          include: {
            control: true,
          },
        },
      },
    });

    for (const obligation of obligations) {
      for (const controlObligation of obligation.controls) {
        const control = controlObligation.control;
        const evaluation = await this.evaluateControl(companyId, control.id);

        for (const evidenceEval of evaluation.evidenceEvaluations) {
          // Generate risk for missing evidence
          if (evidenceEval.freshness === EvidenceFreshness.MISSING) {
            risks.push({
              id: `risk-missing-${evidenceEval.evidenceRequirementId}`,
              obligationCode: obligation.code || '',
              controlCode: control.code || '',
              riskType: 'MISSING_EVIDENCE',
              severity: this.calculateRiskSeverity(obligation.severity || 'MEDIUM'),
              description: `증빙자료가 업로드되지 않았습니다: ${control.name || control.code}`,
              detectedAt: now,
            });
          }

          // Generate risk for stale evidence
          if (evidenceEval.freshness === EvidenceFreshness.STALE) {
            risks.push({
              id: `risk-stale-${evidenceEval.evidenceRequirementId}`,
              obligationCode: obligation.code || '',
              controlCode: control.code || '',
              riskType: 'STALE_EVIDENCE',
              severity: this.calculateRiskSeverity(obligation.severity || 'MEDIUM'),
              description: `증빙자료가 만료되었습니다 (${Math.abs(evidenceEval.daysUntilExpiry || 0)}일 경과): ${control.name || control.code}`,
              detectedAt: now,
            });
          }
        }

        // Generate risk for failed control
        if (evaluation.status === ControlStatus.FAIL) {
          risks.push({
            id: `risk-failed-${control.id}`,
            obligationCode: obligation.code || '',
            controlCode: control.code || '',
            riskType: 'FAILED_CONTROL',
            severity: this.calculateRiskSeverity(obligation.severity || 'MEDIUM'),
            description: `컨트롤이 실패했습니다: ${control.name || control.code}`,
            detectedAt: now,
          });
        }
      }
    }

    this.logger.log(`Generated ${risks.length} risk items`);
    return risks;
  }

  /**
   * Calculate risk severity based on obligation severity
   */
  private calculateRiskSeverity(
    obligationSeverity: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (obligationSeverity) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Persist risks to database
   * FIXED: Now uses RiskItem model with tenantId (not old Risk model with companyId)
   */
  async persistRisks(companyId: string, risks: RiskItem[]): Promise<void> {
    const tenantId = companyId; // Rename for clarity

    // Delete old auto-generated risk items
    await this.prisma.riskItem.deleteMany({
      where: {
        tenantId,
        title: { startsWith: '[자동감지]' }, // Auto-detected risks have this prefix
      },
    });

    // Create new risk items with proper relationships
    for (const risk of risks) {
      // Find obligation and control IDs from codes
      const obligation = await this.prisma.obligation.findFirst({
        where: { code: risk.obligationCode, tenantId },
        select: { id: true },
      });

      const control = await this.prisma.control.findFirst({
        where: { code: risk.controlCode, tenantId },
        select: { id: true },
      });

      await this.prisma.riskItem.create({
        data: {
          tenantId,
          title: risk.description,
          description: `자동 평가로 감지된 리스크: ${risk.riskType}\n\n${risk.description}`,
          severity: risk.severity,
          status: 'OPEN',
          obligationId: obligation?.id,
          controlId: control?.id,
        },
      });
    }

    this.logger.log(`Persisted ${risks.length} risk items to database`);
  }

  /**
   * Run full evaluation for a company
   */
  async runFullEvaluation(companyId: string) {
    this.logger.log(`Running full evaluation for company ${companyId}`);

    const startTime = Date.now();

    // Calculate readiness score
    const readinessScore = await this.calculateReadinessScore(companyId);

    // Generate and persist risks
    const risks = await this.generateRisks(companyId);
    await this.persistRisks(companyId, risks);

    const duration = Date.now() - startTime;
    this.logger.log(`Evaluation completed in ${duration}ms`);

    return {
      readinessScore,
      risks,
      evaluatedAt: new Date(),
      duration,
    };
  }
}
