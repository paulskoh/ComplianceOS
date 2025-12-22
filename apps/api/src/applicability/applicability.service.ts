import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicabilityRule,
  CompanyProfile,
} from '../common/types/company-profile.types';
import { evaluateApplicabilityRule } from '../common/utils/dsl-evaluator';

export interface ApplicableObligation {
  code: string;
  titleKo: string;
  title: string;
  domain: string;
  severityDefault: string;
  evidenceFrequency: string;
  applicabilityRule: ApplicabilityRule | null;
}

export interface ApplicabilityResult {
  profile: CompanyProfile;
  applicableObligations: ApplicableObligation[];
  totalObligations: number;
  applicableCount: number;
  applicabilityRate: number;
}

@Injectable()
export class ApplicabilityService {
  private readonly logger = new Logger(ApplicabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate which obligations apply to a given company profile
   *
   * @param profile - The company profile to evaluate
   * @returns Applicability result with applicable obligations
   */
  async evaluateApplicability(
    profile: CompanyProfile,
  ): Promise<ApplicabilityResult> {
    this.logger.log('Evaluating applicability for profile:', profile);

    // Fetch all active obligation templates
    const obligations = await this.prisma.obligationTemplate.findMany({
      where: {
        isActive: true,
      },
      select: {
        code: true,
        titleKo: true,
        title: true,
        domain: true,
        severityDefault: true,
        evidenceFrequency: true,
        applicabilityRule: true,
      },
    });

    this.logger.log(`Found ${obligations.length} active obligation templates`);

    // Evaluate each obligation's applicability rule
    const applicableObligations: ApplicableObligation[] = [];

    for (const obligation of obligations) {
      try {
        const rule = obligation.applicabilityRule as ApplicabilityRule | null;
        const isApplicable = evaluateApplicabilityRule(rule, profile);

        if (isApplicable) {
          applicableObligations.push({
            code: obligation.code,
            titleKo: obligation.titleKo,
            title: obligation.title,
            domain: obligation.domain,
            severityDefault: obligation.severityDefault || 'MEDIUM',
            evidenceFrequency: obligation.evidenceFrequency,
            applicabilityRule: rule,
          });
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating applicability for ${obligation.code}:`,
          error,
        );
      }
    }

    const applicabilityRate =
      obligations.length > 0
        ? (applicableObligations.length / obligations.length) * 100
        : 0;

    this.logger.log(
      `${applicableObligations.length}/${obligations.length} obligations apply (${applicabilityRate.toFixed(1)}%)`,
    );

    return {
      profile,
      applicableObligations,
      totalObligations: obligations.length,
      applicableCount: applicableObligations.length,
      applicabilityRate: Math.round(applicabilityRate * 10) / 10,
    };
  }

  /**
   * Get applicable obligations grouped by domain
   */
  async getApplicableObligationsByDomain(
    profile: CompanyProfile,
  ): Promise<Record<string, ApplicableObligation[]>> {
    const result = await this.evaluateApplicability(profile);

    const byDomain: Record<string, ApplicableObligation[]> = {};

    for (const obligation of result.applicableObligations) {
      if (!byDomain[obligation.domain]) {
        byDomain[obligation.domain] = [];
      }
      byDomain[obligation.domain].push(obligation);
    }

    return byDomain;
  }

  /**
   * Check if a specific obligation applies to a company profile
   */
  async isObligationApplicable(
    obligationCode: string,
    profile: CompanyProfile,
  ): Promise<boolean> {
    const obligation = await this.prisma.obligationTemplate.findUnique({
      where: { code: obligationCode },
      select: { applicabilityRule: true },
    });

    if (!obligation) {
      throw new Error(`Obligation ${obligationCode} not found`);
    }

    const rule = obligation.applicabilityRule as ApplicabilityRule | null;
    return evaluateApplicabilityRule(rule, profile);
  }

  /**
   * Get applicable controls for a company based on applicable obligations
   */
  async getApplicableControls(profile: CompanyProfile) {
    const applicabilityResult = await this.evaluateApplicability(profile);
    const applicableObligationCodes = applicabilityResult.applicableObligations.map(
      (o) => o.code,
    );

    // Fetch controls for applicable obligations
    const controls = await this.prisma.controlTemplate.findMany({
      where: {
        obligationCode: {
          in: applicableObligationCodes,
        },
        isActive: true,
      },
    });

    return {
      applicableObligationCodes,
      controls,
      totalControls: controls.length,
    };
  }

  /**
   * Simulate applicability for different profiles (for testing)
   */
  async simulateApplicability(profiles: CompanyProfile[]) {
    const results = [];

    for (const profile of profiles) {
      const result = await this.evaluateApplicability(profile);
      results.push(result);
    }

    return results;
  }
}
