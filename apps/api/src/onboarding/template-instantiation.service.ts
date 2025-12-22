import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicabilityService } from '../applicability/applicability.service';
import { CompanyProfile } from '../common/types/company-profile.types';

export interface InstantiationResult {
  obligationsCreated: number;
  controlsCreated: number;
  evidenceRequirementsCreated: number;
  instantiatedObligations: Array<{
    id: string;
    code: string;
    titleKo: string;
    domain: string;
  }>;
}

@Injectable()
export class TemplateInstantiationService {
  private readonly logger = new Logger(TemplateInstantiationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicabilityService: ApplicabilityService,
  ) {}

  /**
   * Instantiate compliance templates for a company based on their profile
   * This creates real Obligation, Control, and EvidenceRequirement records
   * from the template records based on applicability rules
   */
  async instantiateTemplatesForCompany(
    companyId: string,
    profile: CompanyProfile,
  ): Promise<InstantiationResult> {
    this.logger.log(`Starting template instantiation for company ${companyId}`);

    // Step 1: Determine applicable obligations using applicability engine
    const applicabilityResult =
      await this.applicabilityService.evaluateApplicability(profile);

    this.logger.log(
      `Found ${applicabilityResult.applicableCount} applicable obligations`,
    );

    const instantiatedObligations: Array<{
      id: string;
      code: string;
      titleKo: string;
      domain: string;
    }> = [];
    let controlsCreated = 0;
    let evidenceRequirementsCreated = 0;

    // Step 2: Instantiate each applicable obligation
    for (const applicableObligation of applicabilityResult.applicableObligations) {
      try {
        // Fetch the full obligation template
        const obligationTemplate =
          await this.prisma.obligationTemplate.findUnique({
            where: { code: applicableObligation.code },
          });

        if (!obligationTemplate) {
          this.logger.warn(
            `Obligation template ${applicableObligation.code} not found, skipping`,
          );
          continue;
        }

        // Check if obligation already exists for this company
        const existingObligation = await this.prisma.obligation.findFirst({
          where: {
            tenantId: companyId,
            code: obligationTemplate.code,
          },
        });

        if (existingObligation) {
          this.logger.log(
            `Obligation ${obligationTemplate.code} already exists for company, skipping`,
          );
          continue;
        }

        // Create obligation instance
        const obligation = await this.prisma.obligation.create({
          data: {
            tenantId: companyId,
            code: obligationTemplate.code,
            title: obligationTemplate.title,
            titleKo: obligationTemplate.titleKo,
            description: obligationTemplate.description,
            domain: obligationTemplate.domain,
            severity: obligationTemplate.severityDefault || 'MEDIUM',
            status: 'ACTIVE',
            evidenceFrequency: obligationTemplate.evidenceFrequency,
          },
        });

        instantiatedObligations.push({
          id: obligation.id,
          code: obligation.code || '',
          titleKo: obligation.titleKo,
          domain: obligation.domain,
        });

        // Step 3: Instantiate controls for this obligation
        const controlTemplates = await this.prisma.controlTemplate.findMany({
          where: {
            obligationCode: obligationTemplate.code,
            isActive: true,
          },
        });

        this.logger.log(
          `Found ${controlTemplates.length} control templates for ${obligationTemplate.code}`,
        );

        for (const controlTemplate of controlTemplates) {
          // Create control instance
          const control = await this.prisma.control.create({
            data: {
              tenantId: companyId,
              code: controlTemplate.code,
              name: controlTemplate.name,
              description: controlTemplate.description,
              type: controlTemplate.type,
              controlType: controlTemplate.type as any,
              automationLevel: controlTemplate.automationLevel,
              implementationStatus: 'NOT_STARTED',
            },
          });

          // Create ControlObligation join record
          await this.prisma.controlObligation.create({
            data: {
              controlId: control.id,
              obligationId: obligation.id,
            },
          });

          controlsCreated++;

          // Step 4: Instantiate evidence requirements for this control
          const evidenceReqTemplates =
            await this.prisma.evidenceRequirementTemplate.findMany({
              where: {
                controlCode: controlTemplate.code,
              },
            });

          this.logger.log(
            `Found ${evidenceReqTemplates.length} evidence requirement templates for ${controlTemplate.code}`,
          );

          for (const evidenceReqTemplate of evidenceReqTemplates) {
            // Create both EvidenceRequirement and ControlEvidenceRequirement
            await this.prisma.controlEvidenceRequirement.create({
              data: {
                controlId: control.id,
                name: evidenceReqTemplate.titleKo,
                description: evidenceReqTemplate.titleKo,
                freshnessWindowDays: 30,
                required: true,
                isMandatory: true,
                evidenceType: 'DOCUMENT',
                cadenceRule: evidenceReqTemplate.cadenceRule,
                retentionRule: evidenceReqTemplate.cadenceRule,
                requiredFields: evidenceReqTemplate.requiredFields,
                acceptanceCriteria: evidenceReqTemplate.acceptanceCriteria,
              },
            });

            // Also create in evidence_requirements table for evaluation service
            await this.prisma.evidenceRequirement.create({
              data: {
                companyId,
                controlId: control.id,
                name: evidenceReqTemplate.titleKo,
                description: evidenceReqTemplate.titleKo,
                cadenceRule: evidenceReqTemplate.cadenceRule,
                retentionRule: evidenceReqTemplate.cadenceRule,
                isMandatory: true,
                evidenceType: 'DOCUMENT',
              },
            });

            evidenceRequirementsCreated++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Error instantiating obligation ${applicableObligation.code}:`,
          error,
        );
        // Continue with other obligations even if one fails
      }
    }

    const result: InstantiationResult = {
      obligationsCreated: instantiatedObligations.length,
      controlsCreated,
      evidenceRequirementsCreated,
      instantiatedObligations,
    };

    this.logger.log(
      `Template instantiation complete: ${result.obligationsCreated} obligations, ${result.controlsCreated} controls, ${result.evidenceRequirementsCreated} evidence requirements`,
    );

    return result;
  }

  /**
   * Re-evaluate and update obligations when company profile changes
   * This will instantiate new obligations that became applicable,
   * but will NOT deactivate existing obligations
   */
  async updateObligationsForProfileChange(
    companyId: string,
    newProfile: CompanyProfile,
  ): Promise<InstantiationResult> {
    this.logger.log(
      `Re-evaluating obligations for company ${companyId} after profile change`,
    );

    // Instantiate any new applicable obligations
    return this.instantiateTemplatesForCompany(companyId, newProfile);
  }

  /**
   * Preview what would be instantiated for a given profile
   * Useful for showing during onboarding
   */
  async previewInstantiation(profile: CompanyProfile) {
    const applicabilityResult =
      await this.applicabilityService.evaluateApplicability(profile);

    const preview = {
      totalObligations: applicabilityResult.totalObligations,
      applicableObligations: applicabilityResult.applicableCount,
      applicabilityRate: applicabilityResult.applicabilityRate,
      byDomain: {} as Record<string, number>,
      estimatedControls: 0,
      estimatedEvidenceRequirements: 0,
      obligations: applicabilityResult.applicableObligations,
    };

    // Count by domain
    for (const obligation of applicabilityResult.applicableObligations) {
      preview.byDomain[obligation.domain] =
        (preview.byDomain[obligation.domain] || 0) + 1;
    }

    // Estimate controls and evidence requirements
    for (const obligation of applicabilityResult.applicableObligations) {
      const controlTemplates = await this.prisma.controlTemplate.findMany({
        where: {
          obligationCode: obligation.code,
          isActive: true,
        },
      });
      preview.estimatedControls += controlTemplates.length;

      // Count evidence requirements for all controls of this obligation
      for (const controlTemplate of controlTemplates) {
        const evidenceReqCount =
          await this.prisma.evidenceRequirementTemplate.count({
            where: {
              controlCode: controlTemplate.code,
            },
          });
        preview.estimatedEvidenceRequirements += evidenceReqCount;
      }
    }

    return preview;
  }
}
