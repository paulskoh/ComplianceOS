import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocxBuilderService } from './docx-builder.service';
import { StorageService } from '../aws/storage.service';
import { DocumentTemplateType, GeneratedDocStatus, RegulationType } from '@prisma/client';
import OpenAI from 'openai';

interface GenerateDocumentDto {
  templateType: DocumentTemplateType;
  customVariables?: Record<string, any>;
  evidenceRequirementId?: string;
}

interface TemplateConfig {
  type: DocumentTemplateType;
  regulationType: RegulationType;
  name: string;
  nameKo: string;
  descriptionKo: string;
  sections: string[];
  requiredVariables: string[];
}

/**
 * Korean Compliance Document Generation Service
 * Generates professional Korean compliance documents using OpenAI + company profile
 */
@Injectable()
export class DocumentGenService {
  private readonly logger = new Logger(DocumentGenService.name);
  private readonly openai: OpenAI;

  // Built-in template configurations for Korean SMEs
  private readonly TEMPLATE_CONFIGS: TemplateConfig[] = [
    {
      type: DocumentTemplateType.PRIVACY_POLICY,
      regulationType: RegulationType.PIPA,
      name: 'Privacy Policy Generator',
      nameKo: '개인정보처리방침 생성기',
      descriptionKo: '개인정보보호법 제30조에 따른 개인정보처리방침을 자동으로 생성합니다.',
      sections: [
        '개인정보의 처리 목적',
        '개인정보의 처리 및 보유기간',
        '처리하는 개인정보의 항목',
        '개인정보의 제3자 제공',
        '개인정보처리의 위탁',
        '개인정보의 파기절차 및 방법',
        '정보주체의 권리·의무 및 행사방법',
        '개인정보 보호책임자',
        '개인정보 자동 수집 장치의 설치·운영 및 거부',
        '개인정보 처리방침의 변경',
      ],
      requiredVariables: ['companyName', 'industry', 'dataTypes', 'hasVendors', 'hasInternationalTransfer'],
    },
    {
      type: DocumentTemplateType.INTERNAL_MANAGEMENT_PLAN,
      regulationType: RegulationType.PIPA,
      name: 'Internal Management Plan Generator',
      nameKo: '내부관리계획 생성기',
      descriptionKo: '개인정보보호법 시행령 제30조에 따른 내부관리계획을 자동으로 생성합니다.',
      sections: [
        '총칙 (목적, 정의, 적용범위)',
        '개인정보 보호책임자 및 담당자 지정',
        '개인정보 보호책임자의 역할 및 책임',
        '개인정보취급자 교육',
        '접근권한 관리',
        '접근통제 및 접속기록 관리',
        '개인정보 암호화',
        '악성프로그램 방지',
        '물리적 보안',
        '위험도 분석 및 대응',
        '재해 및 침해사고 대응',
        '개인정보 처리 수탁자 관리감독',
      ],
      requiredVariables: ['companyName', 'employeeCount', 'dataTypes', 'hasVendors'],
    },
    {
      type: DocumentTemplateType.VENDOR_AGREEMENT,
      regulationType: RegulationType.PIPA,
      name: 'Vendor Processing Agreement Generator',
      nameKo: '개인정보 처리 위탁계약서 생성기',
      descriptionKo: '개인정보보호법 제26조에 따른 위탁계약서를 자동으로 생성합니다.',
      sections: [
        '위탁 업무의 내용',
        '위탁 기간',
        '위탁 수수료',
        '개인정보 보호조치 의무',
        '재위탁 제한',
        '개인정보 접근 제한',
        '개인정보 파기 의무',
        '손해배상 책임',
        '관리감독',
        '비밀유지 의무',
      ],
      requiredVariables: ['companyName', 'vendorName', 'processingPurpose', 'dataTypes'],
    },
    {
      type: DocumentTemplateType.CONSENT_FORM,
      regulationType: RegulationType.PIPA,
      name: 'Consent Form Generator',
      nameKo: '개인정보 수집·이용 동의서 생성기',
      descriptionKo: '개인정보보호법 제15조 및 제22조에 따른 동의서를 자동으로 생성합니다.',
      sections: [
        '수집하는 개인정보 항목',
        '개인정보의 수집·이용 목적',
        '개인정보의 보유 및 이용기간',
        '동의 거부권 및 불이익',
        '동의 확인란',
      ],
      requiredVariables: ['companyName', 'collectionPurpose', 'dataItems', 'retentionPeriod'],
    },
    {
      type: DocumentTemplateType.WORK_RULES,
      regulationType: RegulationType.LABOR_STANDARDS,
      name: 'Work Rules Generator',
      nameKo: '취업규칙 생성기',
      descriptionKo: '근로기준법 제93조에 따른 취업규칙을 자동으로 생성합니다.',
      sections: [
        '총칙 (목적, 적용범위)',
        '채용',
        '근로시간 및 휴게',
        '휴일 및 휴가',
        '임금',
        '복리후생',
        '교육훈련',
        '상벌',
        '퇴직 및 해고',
        '안전보건',
        '재해보상',
        '부칙',
      ],
      requiredVariables: ['companyName', 'employeeCount', 'hasOvertimeWork', 'hasRemoteWork'],
    },
  ];

  constructor(
    private prisma: PrismaService,
    private docxBuilder: DocxBuilderService,
    private storage: StorageService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Get available document templates for a tenant
   */
  async getAvailableTemplates(tenantId: string) {
    // Return built-in templates + any custom tenant templates
    const customTemplates = await this.prisma.documentTemplate.findMany({
      where: {
        OR: [
          { tenantId: null, isActive: true }, // System templates
          { tenantId, isActive: true }, // Tenant-specific templates
        ],
      },
      orderBy: { nameKo: 'asc' },
    });

    // If no templates in DB, return built-in configs
    if (customTemplates.length === 0) {
      return this.TEMPLATE_CONFIGS.map(config => ({
        type: config.type,
        regulationType: config.regulationType,
        name: config.name,
        nameKo: config.nameKo,
        descriptionKo: config.descriptionKo,
        sections: config.sections,
        isSystemTemplate: true,
      }));
    }

    return customTemplates;
  }

  /**
   * Generate a compliance document for a tenant
   */
  async generateDocument(
    tenantId: string,
    userId: string,
    dto: GenerateDocumentDto,
  ) {
    const startTime = Date.now();
    this.logger.log(`Starting document generation: ${dto.templateType} for tenant ${tenantId}`);

    // Get company profile
    const companyProfile = await this.prisma.companyProfile.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });

    if (!companyProfile) {
      throw new BadRequestException('회사 프로필을 먼저 설정해주세요. Company profile is required.');
    }

    // Get template config
    const templateConfig = this.TEMPLATE_CONFIGS.find(t => t.type === dto.templateType);
    if (!templateConfig) {
      throw new NotFoundException(`Template type ${dto.templateType} not found`);
    }

    // Build variables from company profile + custom overrides
    const variables = this.buildVariables(companyProfile, dto.customVariables);

    // Generate document content using OpenAI
    const generatedContent = await this.generateWithOpenAI(
      templateConfig,
      variables,
      companyProfile.tenant.name,
    );

    // Create or get template record
    let template = await this.prisma.documentTemplate.findFirst({
      where: {
        type: dto.templateType,
        OR: [{ tenantId: null }, { tenantId }],
        isActive: true,
      },
    });

    if (!template) {
      template = await this.prisma.documentTemplate.create({
        data: {
          type: templateConfig.type,
          regulationType: templateConfig.regulationType,
          name: templateConfig.name,
          nameKo: templateConfig.nameKo,
          descriptionKo: templateConfig.descriptionKo,
          basePrompt: this.getBasePrompt(templateConfig),
          sections: templateConfig.sections,
          variables: templateConfig.requiredVariables,
          isSystemTemplate: true,
          isActive: true,
        },
      });
    }

    // Generate DOCX file
    const docxBuffer = await this.docxBuilder.buildKoreanDocument(
      generatedContent.title,
      generatedContent.sections,
      {
        companyName: companyProfile.tenant.name,
        generatedDate: new Date().toISOString().split('T')[0],
        documentType: templateConfig.nameKo,
      },
    );

    // Upload to S3
    const s3Key = `${tenantId}/generated-docs/${template.id}/${Date.now()}.docx`;
    await this.storage.uploadBuffer(
      s3Key,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Save generated document record
    const generatedDoc = await this.prisma.generatedDocument.create({
      data: {
        tenantId,
        templateId: template.id,
        title: generatedContent.title,
        titleKo: generatedContent.titleKo,
        status: GeneratedDocStatus.DRAFT,
        variables,
        companyProfile: companyProfile as any,
        content: generatedContent.markdown,
        contentKo: generatedContent.markdown,
        docxS3Key: s3Key,
        createdById: userId,
        evidenceReqId: dto.evidenceRequirementId,
        modelUsed: 'gpt-4o',
        tokensUsed: generatedContent.tokensUsed,
        generationTime: Date.now() - startTime,
      },
      include: {
        template: true,
      },
    });

    this.logger.log(`Document generated successfully: ${generatedDoc.id} in ${Date.now() - startTime}ms`);

    return {
      id: generatedDoc.id,
      title: generatedDoc.title,
      titleKo: generatedDoc.titleKo,
      status: generatedDoc.status,
      templateType: template.type,
      templateNameKo: template.nameKo,
      content: generatedContent.markdown,
      sections: generatedContent.sections,
      docxDownloadUrl: (await this.storage.presignGetUrl(s3Key, `${generatedDoc.titleKo}.docx`, 3600)).url,
      generationTime: Date.now() - startTime,
      createdAt: generatedDoc.createdAt,
    };
  }

  /**
   * Get a generated document by ID
   */
  async getGeneratedDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { template: true },
    });

    if (!doc) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    return {
      ...doc,
      docxDownloadUrl: doc.docxS3Key
        ? (await this.storage.presignGetUrl(doc.docxS3Key, `${doc.titleKo}.docx`, 3600)).url
        : null,
    };
  }

  /**
   * List all generated documents for a tenant
   */
  async listGeneratedDocuments(tenantId: string, options?: { status?: GeneratedDocStatus; limit?: number }) {
    const docs = await this.prisma.generatedDocument.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status }),
      },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });

    return docs;
  }

  /**
   * Approve a generated document and create an artifact
   */
  async approveDocument(tenantId: string, documentId: string, userId: string) {
    const doc = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { template: true },
    });

    if (!doc) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    if (doc.status !== GeneratedDocStatus.DRAFT && doc.status !== GeneratedDocStatus.PENDING_REVIEW) {
      throw new BadRequestException('이미 승인된 문서입니다.');
    }

    // Create artifact from the generated document
    const artifact = await this.prisma.artifact.create({
      data: {
        tenantId,
        name: doc.titleKo,
        description: `자동 생성된 ${doc.template.nameKo}`,
        type: 'POLICY',
        source: 'GENERATED',
        accessClassification: 'INTERNAL',
        uploadedById: userId,
        status: 'VERIFIED',
        version: 1,
        s3Key: doc.docxS3Key,
        s3Bucket: process.env.S3_BUCKET || 'complianceos-artifacts',
        fileName: `${doc.titleKo}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        isApproved: true,
        approvedById: userId,
        approvedAt: new Date(),
        metadata: {
          generatedDocumentId: doc.id,
          templateType: doc.template.type,
          generatedAt: doc.createdAt,
        },
      },
    });

    // Link to evidence requirement if specified
    if (doc.evidenceReqId) {
      await this.prisma.artifactEvidenceRequirement.create({
        data: {
          artifactId: artifact.id,
          evidenceRequirementId: doc.evidenceReqId,
          createdByUserId: userId,
        },
      });
    }

    // Update generated document status
    await this.prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: GeneratedDocStatus.APPROVED,
        artifactId: artifact.id,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return {
      documentId: doc.id,
      artifactId: artifact.id,
      status: 'APPROVED',
      message: '문서가 승인되어 증빙으로 등록되었습니다.',
    };
  }

  /**
   * Build variables from company profile and custom overrides
   */
  private buildVariables(
    profile: any,
    customVariables?: Record<string, any>,
  ): Record<string, any> {
    const dataTypeLabels: Record<string, string> = {
      EMPLOYEE_DATA: '직원 정보',
      CUSTOMER_DATA: '고객 정보',
      RESIDENT_NUMBERS: '주민등록번호',
      HEALTH_DATA: '건강 정보',
      FINANCIAL_DATA: '금융 정보',
      BIOMETRIC_DATA: '생체인식 정보',
      LOCATION_DATA: '위치 정보',
      PAYMENT_DATA: '결제 정보',
    };

    const industryLabels: Record<string, string> = {
      TECHNOLOGY: '정보통신업',
      FINANCE: '금융업',
      HEALTHCARE: '의료/보건업',
      RETAIL: '도소매업',
      MANUFACTURING: '제조업',
      EDUCATION: '교육서비스업',
      OTHER: '기타',
    };

    return {
      companyName: profile.tenant.name,
      industry: profile.industry,
      industryKo: industryLabels[profile.industry] || '기타',
      employeeCount: profile.employeeCount,
      employeeCountBand: this.getEmployeeCountBand(profile.employeeCount),
      hasRemoteWork: profile.hasRemoteWork,
      hasOvertimeWork: profile.hasOvertimeWork,
      hasContractors: profile.hasContractors,
      hasVendors: profile.hasVendors,
      hasInternationalTransfer: profile.hasInternationalTransfer,
      dataTypes: profile.dataTypes || [],
      dataTypesKo: (profile.dataTypes || []).map((dt: string) => dataTypeLabels[dt] || dt),
      currentDate: new Date().toLocaleDateString('ko-KR'),
      currentYear: new Date().getFullYear(),
      ...customVariables,
    };
  }

  private getEmployeeCountBand(count: number): string {
    if (count < 10) return '10인 미만';
    if (count < 50) return '10~49인';
    if (count < 100) return '50~99인';
    if (count < 300) return '100~299인';
    return '300인 이상';
  }

  /**
   * Generate document content using OpenAI
   */
  private async generateWithOpenAI(
    config: TemplateConfig,
    variables: Record<string, any>,
    companyName: string,
  ): Promise<{
    title: string;
    titleKo: string;
    markdown: string;
    sections: Array<{ title: string; content: string }>;
    tokensUsed: number;
  }> {
    const prompt = this.buildGenerationPrompt(config, variables);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `당신은 한국 기업 규정 준수 문서 전문가입니다.
전문적이고 법적 요건을 충족하는 한국어 문서를 작성합니다.
모든 출력은 한국어로 작성하며, 공식 문서 형식을 따릅니다.
각 섹션은 명확한 제목과 구체적인 내용을 포함해야 합니다.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const tokensUsed = response.usage?.total_tokens || 0;

      // Build markdown from sections
      let markdown = `# ${parsed.title || config.nameKo}\n\n`;
      markdown += `**${companyName}**\n\n`;
      markdown += `작성일: ${variables.currentDate}\n\n`;
      markdown += `---\n\n`;

      const sections: Array<{ title: string; content: string }> = [];

      for (const section of parsed.sections || []) {
        markdown += `## ${section.title}\n\n`;
        markdown += `${section.content}\n\n`;
        sections.push({
          title: section.title,
          content: section.content,
        });
      }

      return {
        title: `${companyName} ${config.nameKo}`,
        titleKo: parsed.title || config.nameKo,
        markdown,
        sections,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error('OpenAI generation failed:', error);
      throw new BadRequestException('문서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  /**
   * Build the generation prompt for a specific template
   */
  private buildGenerationPrompt(
    config: TemplateConfig,
    variables: Record<string, any>,
  ): string {
    const sectionList = config.sections.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const variableInfo = Object.entries(variables)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `- ${key}: ${value.join(', ')}`;
        }
        return `- ${key}: ${value}`;
      })
      .join('\n');

    return `다음 정보를 바탕으로 "${config.nameKo}" 문서를 작성해주세요.

## 회사 정보
${variableInfo}

## 필수 섹션
${sectionList}

## 작성 지침
1. 각 섹션의 내용은 구체적이고 실무에서 바로 사용할 수 있어야 합니다.
2. 법적 요건(${config.regulationType === 'PIPA' ? '개인정보보호법' : '근로기준법'})을 충족해야 합니다.
3. 회사 규모(${variables.employeeCountBand})와 업종(${variables.industryKo})에 맞게 작성합니다.
4. 전문적이고 공식적인 문체를 사용합니다.
5. 날짜, 보존기간 등 구체적인 수치를 포함합니다.

## 출력 형식 (JSON)
{
  "title": "문서 제목",
  "sections": [
    {
      "title": "섹션 제목",
      "content": "섹션 내용 (마크다운 형식)"
    }
  ]
}`;
  }

  private getBasePrompt(config: TemplateConfig): string {
    return `Generate a ${config.name} document following Korean ${config.regulationType} requirements.`;
  }
}
