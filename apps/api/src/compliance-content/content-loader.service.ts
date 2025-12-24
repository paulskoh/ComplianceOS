import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ContentPack, Obligation, Control, EvidenceRequirement } from './content-pack.types';

@Injectable()
export class ContentLoaderService {
  private readonly logger = new Logger(ContentLoaderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Load PIPA v1 content pack from YAML
   */
  async loadPIPAv1(): Promise<ContentPack> {
    const packPath = path.join(
      process.cwd(),
      '../../packages/compliance-content/packs/pipa-v1-kr.yaml',
    );
    return this.loadContentPackFromFile(packPath);
  }

  /**
   * Load content pack from YAML file
   */
  private loadContentPackFromFile(filePath: string): ContentPack {
    this.logger.log(`Loading content pack from ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Content pack file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const contentPack = yaml.parse(fileContent) as ContentPack;

    this.logger.log(
      `Loaded content pack: ${contentPack.metadata.code} v${contentPack.metadata.version}`,
    );
    this.logger.log(
      `  - ${contentPack.obligations.length} obligations`,
    );
    this.logger.log(
      `  - ${contentPack.controls.length} controls`,
    );
    this.logger.log(
      `  - ${contentPack.evidenceRequirements.length} evidence requirements`,
    );

    return contentPack;
  }

  /**
   * Seed content pack templates into database
   * This creates/updates the template records that can be instantiated for tenants
   */
  async seedContentPackTemplates(contentPack: ContentPack): Promise<void> {
    this.logger.log(`Seeding templates for ${contentPack.metadata.code}`);

    // Seed obligation templates
    await this.seedObligationTemplates(contentPack.obligations, contentPack.metadata.domain);

    // Seed control templates
    await this.seedControlTemplates(contentPack.controls, contentPack.metadata.domain);

    // Seed evidence requirement templates
    await this.seedEvidenceRequirementTemplates(contentPack.evidenceRequirements);

    this.logger.log(`✅ Content pack templates seeded successfully`);
  }

  /**
   * Seed obligation templates
   */
  private async seedObligationTemplates(
    obligations: Obligation[],
    domain: ContentPack['metadata']['domain'],
  ): Promise<void> {
    for (const obligation of obligations) {
      await this.prisma.obligationTemplate.upsert({
        where: { code: obligation.code },
        create: {
          code: obligation.code,
          title: obligation.name,
          titleKo: obligation.name,
          description: obligation.description,
          descriptionKo: obligation.description,
          summaryKo: obligation.description,
          domain,
          severity: obligation.severity,
          severityDefault: obligation.severity,
          evidenceFrequency: 'ANNUAL', // Default to annual
          legalReference: this.formatLegalReferences(obligation.references),
          inspectorQuestionsKo: this.generateInspectorQuestions(obligation),
        },
        update: {
          title: obligation.name,
          titleKo: obligation.name,
          description: obligation.description,
          descriptionKo: obligation.description,
          summaryKo: obligation.description,
          severity: obligation.severity,
          severityDefault: obligation.severity,
          legalReference: this.formatLegalReferences(obligation.references),
          inspectorQuestionsKo: this.generateInspectorQuestions(obligation),
        },
      });
    }

    this.logger.log(`  ✓ Seeded ${obligations.length} obligation templates`);
  }

  /**
   * Seed control templates
   */
  private async seedControlTemplates(
    controls: Control[],
    domain: ContentPack['metadata']['domain'],
  ): Promise<void> {
    for (const control of controls) {
      await this.prisma.controlTemplate.upsert({
        where: { code: control.code },
        create: {
          code: control.code,
          name: control.name,
          nameKo: control.name,
          description: control.description,
          descriptionKo: control.description,
          purposeKo: control.implementationGuidance,
          domain,
          type: 'PREVENTIVE', // Default type
          automationLevel: 'MANUAL', // Default automation level
          obligationCode: control.obligationCodes[0], // Primary obligation
        },
        update: {
          name: control.name,
          nameKo: control.name,
          description: control.description,
          descriptionKo: control.description,
          purposeKo: control.implementationGuidance,
          obligationCode: control.obligationCodes[0],
        },
      });
    }

    this.logger.log(`  ✓ Seeded ${controls.length} control templates`);
  }

  /**
   * Seed evidence requirement templates
   */
  private async seedEvidenceRequirementTemplates(
    evidenceRequirements: EvidenceRequirement[],
  ): Promise<void> {
    for (const evidenceReq of evidenceRequirements) {
      await this.prisma.evidenceRequirementTemplate.upsert({
        where: { code: evidenceReq.code },
        create: {
          code: evidenceReq.code,
          controlCode: evidenceReq.controlCode,
          titleKo: evidenceReq.name,
          cadenceRule: {
            type: 'PERIODIC',
            freshnessWindowDays: evidenceReq.freshnessWindowDays,
          },
          requiredFields: [],
          acceptanceCriteria: evidenceReq.acceptanceCriteria,
          examplesKo: [],
        },
        update: {
          titleKo: evidenceReq.name,
          cadenceRule: {
            type: 'PERIODIC',
            freshnessWindowDays: evidenceReq.freshnessWindowDays,
          },
          acceptanceCriteria: evidenceReq.acceptanceCriteria,
        },
      });
    }

    this.logger.log(
      `  ✓ Seeded ${evidenceRequirements.length} evidence requirement templates`,
    );
  }

  /**
   * Apply content pack to a specific tenant
   * This creates tenant-specific instances from templates
   */
  async applyContentPackToTenant(
    tenantId: string,
    packCode: string,
  ): Promise<void> {
    this.logger.log(`Applying content pack ${packCode} to tenant ${tenantId}`);

    // Load templates for this pack
    const obligationTemplates = await this.prisma.obligationTemplate.findMany({
      where: { code: { startsWith: packCode.split('-')[0] } }, // e.g., "PIPA"
    });

    const controlTemplates = await this.prisma.controlTemplate.findMany({
      where: { code: { startsWith: 'CTRL-' + packCode.split('-')[0] } }, // e.g., "CTRL-PIPA"
    });

    const evidenceTemplates = await this.prisma.evidenceRequirementTemplate.findMany({
      where: { code: { startsWith: 'EV-' + packCode.split('-')[0] } }, // e.g., "EV-PIPA"
    });

    // Create obligation instances
    const obligationMap = new Map<string, string>(); // template code -> instance ID

    for (const template of obligationTemplates) {
      const obligation = await this.prisma.obligation.create({
        data: {
          tenantId,
          templateId: template.id,
          fromTemplateCode: template.code,
          code: template.code,
          title: template.title,
          titleKo: template.titleKo,
          description: template.description,
          domain: template.domain,
          evidenceFrequency: template.evidenceFrequency,
          severity: template.severity,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      if (template.code) {
        obligationMap.set(template.code, obligation.id);
      }
    }

    this.logger.log(`  ✓ Created ${obligationTemplates.length} obligations`);

    // Create control instances
    const controlMap = new Map<string, string>(); // template code -> instance ID

    for (const template of controlTemplates) {
      const control = await this.prisma.control.create({
        data: {
          tenantId,
          templateId: template.id,
          fromTemplateCode: template.code,
          code: template.code,
          name: template.name,
          description: template.description,
          type: template.type,
          controlType: template.type,
          automationLevel: template.automationLevel,
          implementationStatus: 'NOT_STARTED',
          isActive: true,
        },
      });

      if (template.code) {
        controlMap.set(template.code, control.id);
      }

      // Create control-obligation relationship if obligation exists
      if (template.obligationCode && obligationMap.has(template.obligationCode)) {
        await this.prisma.controlObligation.create({
          data: {
            controlId: control.id,
            obligationId: obligationMap.get(template.obligationCode)!,
          },
        });
      }
    }

    this.logger.log(`  ✓ Created ${controlTemplates.length} controls`);

    // Create evidence requirement instances
    for (const template of evidenceTemplates) {
      const controlId = controlMap.get(template.controlCode);
      if (!controlId) {
        this.logger.warn(
          `Skipping evidence requirement ${template.code}: control ${template.controlCode} not found`,
        );
        continue;
      }

      await this.prisma.controlEvidenceRequirement.create({
        data: {
          controlId,
          fromTemplateCode: template.code,
          name: template.titleKo,
          description: template.titleKo,
          freshnessWindowDays: (template.cadenceRule as any)?.freshnessWindowDays || 365,
          required: true,
          isMandatory: true,
          evidenceType: 'DOCUMENT',
          cadenceRule: template.cadenceRule,
          requiredFields: template.requiredFields,
          acceptanceCriteria: template.acceptanceCriteria,
        },
      });
    }

    this.logger.log(
      `  ✓ Created ${evidenceTemplates.length} evidence requirements`,
    );

    this.logger.log(`✅ Content pack applied to tenant successfully`);
  }

  /**
   * Format legal references for display
   */
  private formatLegalReferences(
    references: Obligation['references'],
  ): string {
    return references
      .map((ref) => {
        if (ref.law && ref.article) {
          return `${ref.law} ${ref.article}`;
        }
        if (ref.standard) {
          return ref.standard;
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Generate inspector questions from obligation
   */
  private generateInspectorQuestions(obligation: Obligation): string[] {
    return [
      `${obligation.name}를 준수하고 있습니까?`,
      `관련 증빙 자료를 제출할 수 있습니까?`,
    ];
  }
}
