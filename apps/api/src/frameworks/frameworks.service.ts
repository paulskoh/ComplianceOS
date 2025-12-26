import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SOFT-LAUNCH REQUIREMENT: Framework Transparency
 *
 * This service provides read-only access to compliance framework definitions.
 * Users can view what they're being evaluated against.
 */
@Injectable()
export class FrameworksService {
  // Define available frameworks
  private readonly frameworks = [
    {
      code: 'PIPA_KOREA',
      name: 'Personal Information Protection Act (PIPA)',
      nameKo: '개인정보 보호법',
      description: 'Korean data protection framework governing the collection, use, and protection of personal information',
      domains: ['PRIVACY', 'SECURITY', 'TRAINING', 'CONTRACTS'],
      version: '2024.01',
      isActive: true,
    },
    {
      code: 'LABOR_KOREA',
      name: 'Labor Standards Act',
      nameKo: '근로기준법',
      description: 'Korean labor law framework covering working conditions, wages, and employment practices',
      domains: ['LABOR'],
      version: '2024.01',
      isActive: true,
    },
    {
      code: 'ISMS_P',
      name: 'ISMS-P Certification',
      nameKo: '정보보호 및 개인정보보호 관리체계 인증',
      description: 'Korean Information Security and Privacy Management System certification',
      domains: ['SECURITY', 'PRIVACY'],
      version: '2024.01',
      isActive: false, // Coming soon
      comingSoon: true,
    },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * List all available compliance frameworks
   */
  async listFrameworks() {
    const frameworkStats = await Promise.all(
      this.frameworks.map(async (fw) => {
        // Get obligation count for each framework
        const obligationCount = await this.prisma.obligationTemplate.count({
          where: {
            domain: { in: fw.domains as any[] },
          },
        });

        return {
          ...fw,
          obligationCount,
        };
      }),
    );

    return {
      frameworks: frameworkStats,
      totalActive: frameworkStats.filter(f => f.isActive).length,
    };
  }

  /**
   * Get detailed framework information
   */
  async getFramework(code: string) {
    const framework = this.frameworks.find(f => f.code === code);
    if (!framework) {
      throw new NotFoundException(`Framework ${code} not found`);
    }

    // Get domains with obligation counts
    const domainStats = await Promise.all(
      framework.domains.map(async (domain) => {
        const obligations = await this.prisma.obligationTemplate.findMany({
          where: { domain: domain as any },
          select: {
            id: true,
            code: true,
            title: true,
            titleKo: true,
            severity: true,
            evidenceFrequency: true,
          },
        });

        return {
          domain,
          obligationCount: obligations.length,
          obligations: obligations.map(o => ({
            code: o.code,
            title: o.title,
            titleKo: o.titleKo,
            severity: o.severity,
            evidenceFrequency: o.evidenceFrequency,
          })),
        };
      }),
    );

    return {
      framework,
      domains: domainStats,
      totalObligations: domainStats.reduce((sum, d) => sum + d.obligationCount, 0),
    };
  }

  /**
   * Get obligations by domain
   */
  async getObligationsByDomain(frameworkCode: string, domain: string) {
    const framework = this.frameworks.find(f => f.code === frameworkCode);
    if (!framework) {
      throw new NotFoundException(`Framework ${frameworkCode} not found`);
    }

    if (!framework.domains.includes(domain)) {
      throw new NotFoundException(`Domain ${domain} not found in framework ${frameworkCode}`);
    }

    const obligations = await this.prisma.obligationTemplate.findMany({
      where: { domain: domain as any },
      select: {
        id: true,
        code: true,
        title: true,
        titleKo: true,
        description: true,
        descriptionKo: true,
        severity: true,
        evidenceFrequency: true,
        applicabilityRule: true,
        inspectorQuestionsKo: true,
        sourceRefs: true,
      },
      orderBy: { severity: 'desc' },
    });

    return {
      domain,
      framework: frameworkCode,
      obligations: obligations.map(o => ({
        code: o.code,
        title: o.title,
        titleKo: o.titleKo,
        description: o.description,
        descriptionKo: o.descriptionKo,
        severity: o.severity,
        evidenceFrequency: o.evidenceFrequency,
        applicabilityRule: o.applicabilityRule,
        inspectorQuestions: o.inspectorQuestionsKo,
        legalReferences: o.sourceRefs,
      })),
      count: obligations.length,
    };
  }

  /**
   * Get controls for an obligation
   */
  async getControlsForObligation(obligationCode: string) {
    const template = await this.prisma.obligationTemplate.findFirst({
      where: { code: obligationCode },
    });

    if (!template) {
      throw new NotFoundException(`Obligation template ${obligationCode} not found`);
    }

    const controls = await this.prisma.controlTemplate.findMany({
      where: {
        obligationCode: obligationCode,
      },
      select: {
        id: true,
        code: true,
        name: true,
        nameKo: true,
        description: true,
        descriptionKo: true,
        type: true,
        automationLevel: true,
        ownerRoleSuggested: true,
        purposeKo: true,
      },
    });

    return {
      obligationCode,
      obligationTitle: template.title,
      obligationTitleKo: template.titleKo,
      controls: controls.map(c => ({
        code: c.code,
        name: c.name,
        nameKo: c.nameKo,
        description: c.description,
        descriptionKo: c.descriptionKo,
        type: c.type,
        automationLevel: c.automationLevel,
        suggestedOwner: c.ownerRoleSuggested,
        implementationGuide: c.purposeKo,
      })),
      count: controls.length,
    };
  }

  /**
   * Get evidence requirements for a control
   */
  async getEvidenceRequirements(controlCode: string) {
    const template = await this.prisma.controlTemplate.findFirst({
      where: { code: controlCode },
    });

    if (!template) {
      throw new NotFoundException(`Control template ${controlCode} not found`);
    }

    const requirements = await this.prisma.evidenceRequirementTemplate.findMany({
      where: {
        controlCode: controlCode,
      },
      select: {
        id: true,
        code: true,
        titleKo: true,
        requiredFields: true,
        acceptanceCriteria: true,
        cadenceRule: true,
        examplesKo: true,
      },
    });

    return {
      controlCode,
      controlName: template.name,
      controlNameKo: template.nameKo,
      evidenceRequirements: requirements.map(r => ({
        code: r.code,
        nameKo: r.titleKo,
        requiredFields: r.requiredFields,
        acceptanceCriteria: r.acceptanceCriteria,
        cadence: r.cadenceRule,
        examples: r.examplesKo,
      })),
      count: requirements.length,
    };
  }

  /**
   * Search across frameworks, obligations, and controls
   */
  async search(query: string) {
    const searchLower = query.toLowerCase();

    // Search obligations
    const obligations = await this.prisma.obligationTemplate.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { titleKo: { contains: query } },
          { description: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        code: true,
        title: true,
        titleKo: true,
        domain: true,
        severity: true,
      },
    });

    // Search controls
    const controls = await this.prisma.controlTemplate.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { nameKo: { contains: query } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        code: true,
        name: true,
        nameKo: true,
        type: true,
      },
    });

    // Search frameworks
    const matchingFrameworks = this.frameworks.filter(
      f => f.name.toLowerCase().includes(searchLower) ||
           f.nameKo.includes(query) ||
           f.code.toLowerCase().includes(searchLower),
    );

    return {
      query,
      results: {
        frameworks: matchingFrameworks,
        obligations: obligations.map(o => ({
          type: 'obligation',
          code: o.code,
          title: o.title,
          titleKo: o.titleKo,
          domain: o.domain,
          severity: o.severity,
        })),
        controls: controls.map(c => ({
          type: 'control',
          code: c.code,
          name: c.name,
          nameKo: c.nameKo,
          controlType: c.type,
        })),
      },
      totalResults: matchingFrameworks.length + obligations.length + controls.length,
    };
  }
}
