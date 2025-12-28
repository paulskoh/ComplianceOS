import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CompanyProfileDto } from '@complianceos/shared';
import { TemplateInstantiationService } from './template-instantiation.service';
import { CompanyProfile } from '../common/types/company-profile.types';
import { ContentLoaderService } from '../compliance-content/content-loader.service';

interface ObligationActivationRule {
  templateId: string;
  condition: (profile: CompanyProfileDto) => boolean;
  reason: string;
  autoCreateControls?: boolean;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private templateInstantiation: TemplateInstantiationService,
    private contentLoader: ContentLoaderService,
  ) {}

  /**
   * Activation rules mapping company profile to obligations
   */
  private get activationRules(): ObligationActivationRule[] {
    return [
      // LABOR - 근로기준법
      {
        templateId: 'labor_work_hours',
        condition: (p) => p.employeeCount > 0,
        reason: '근로자가 있으므로 근로시간 관리 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'labor_overtime_approval',
        condition: (p) => p.hasOvertimeWork,
        reason: '연장근로가 있으므로 사전 승인 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'labor_payslip',
        condition: (p) => p.employeeCount > 0,
        reason: '근로자가 있으므로 임금명세서 발급 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'labor_leave_management',
        condition: (p) => p.employeeCount > 0,
        reason: '근로자가 있으므로 휴가 관리 의무 발생',
        autoCreateControls: true,
      },

      // PRIVACY - 개인정보보호법
      {
        templateId: 'privacy_collection_consent',
        condition: (p) =>
          p.dataTypes.includes('EMPLOYEE_DATA') ||
          p.dataTypes.includes('CUSTOMER_DATA'),
        reason: '개인정보를 수집하므로 수집·이용 동의 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'privacy_resident_number',
        condition: (p) => p.dataTypes.includes('RESIDENT_NUMBERS'),
        reason: '주민등록번호를 처리하므로 특별 보호 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'privacy_sensitive_data',
        condition: (p) =>
          p.dataTypes.includes('HEALTH_DATA') ||
          p.dataTypes.includes('BIOMETRIC_DATA'),
        reason: '민감정보를 처리하므로 별도 동의 및 보호 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'privacy_access_control',
        condition: (p) => p.dataTypes.length > 0,
        reason: '개인정보를 처리하므로 접근 통제 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'privacy_retention_destruction',
        condition: (p) => p.dataTypes.length > 0,
        reason: '개인정보를 처리하므로 보유·파기 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'privacy_international_transfer',
        condition: (p) => p.hasInternationalTransfer,
        reason: '개인정보 국외이전이 있으므로 별도 동의·고지 의무 발생',
        autoCreateControls: true,
      },

      // CONTRACTS - 위수탁 관리
      {
        templateId: 'vendor_processing_agreement',
        condition: (p) => p.hasVendors && p.dataTypes.length > 0,
        reason: '개인정보를 처리하는 수탁사가 있으므로 위수탁 계약 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'vendor_supervision',
        condition: (p) => p.hasVendors,
        reason: '수탁사가 있으므로 정기 관리·감독 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'contractor_management',
        condition: (p) => p.hasContractors,
        reason: '도급/용역 인력이 있으므로 관리 의무 발생',
        autoCreateControls: true,
      },

      // SECURITY - 정보보안 (ISMS-P 대상)
      {
        templateId: 'security_access_control',
        condition: (p) =>
          p.employeeCount >= 5 && p.dataTypes.includes('CUSTOMER_DATA'),
        reason: 'ISMS-P 인증 대상 가능성 - 접근 통제 의무',
        autoCreateControls: true,
      },
      {
        templateId: 'security_log_management',
        condition: (p) =>
          p.industry === 'TECHNOLOGY' || p.industry === 'FINANCE',
        reason: '기술/금융 업종은 접속 기록 관리 의무 강화',
        autoCreateControls: true,
      },

      // TRAINING - 교육 의무
      {
        templateId: 'privacy_training',
        condition: (p) => p.dataTypes.length > 0 && p.employeeCount >= 5,
        reason: '개인정보 처리자가 5명 이상이므로 연 1회 교육 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'sexual_harassment_training',
        condition: (p) => p.employeeCount > 0,
        reason: '근로자가 있으므로 성희롱 예방교육 의무 발생',
        autoCreateControls: true,
      },
      {
        templateId: 'safety_training',
        condition: (p) =>
          p.industry === 'MANUFACTURING' || p.industry === 'HEALTHCARE',
        reason: '제조/의료 업종은 안전 교육 의무 발생',
        autoCreateControls: true,
      },
    ];
  }

  /**
   * Complete onboarding: create profile and instantiate applicable compliance templates
   */
  async completeOnboarding(
    companyId: string,
    userId: string,
    profileDto: CompanyProfileDto,
  ) {
    this.logger.log(`Starting onboarding for company ${companyId}`);

    // Convert CompanyProfileDto to CompanyProfile format for applicability engine
    const profile: CompanyProfile = this.convertToCompanyProfile(profileDto);

    // Create or update CompanyProfile record in database
    const companyProfile = await this.prisma.companyProfile.upsert({
      where: { tenantId: companyId },
      create: {
        tenantId: companyId,
        industry: profileDto.industry as any,
        employeeCount: profileDto.employeeCount || 0,
        hasRemoteWork: profileDto.hasRemoteWork || false,
        hasOvertimeWork: profileDto.hasOvertimeWork || false,
        hasContractors: profileDto.hasContractors || false,
        hasVendors: profileDto.hasVendors || false,
        dataTypes: (profileDto.dataTypes || []) as any[],
        hasInternationalTransfer: profileDto.hasInternationalTransfer || false,
        headcountBand: profile.headcount_band,
        workStyle: profile.work_style,
        usesVendorsForData: profile.uses_vendors_for_data || false,
        dataCustomerPii: profile.data_types?.customer_pii || false,
        dataEmployeePii: profile.data_types?.employee_pii || false,
        dataResidentId: profile.data_types?.resident_id || false,
        dataHealthData: profile.data_types?.health_data || false,
        dataPaymentData: profile.data_types?.payment_data || false,
      },
      update: {
        industry: profileDto.industry as any,
        employeeCount: profileDto.employeeCount || 0,
        hasRemoteWork: profileDto.hasRemoteWork || false,
        hasOvertimeWork: profileDto.hasOvertimeWork || false,
        hasContractors: profileDto.hasContractors || false,
        hasVendors: profileDto.hasVendors || false,
        dataTypes: (profileDto.dataTypes || []) as any[],
        hasInternationalTransfer: profileDto.hasInternationalTransfer || false,
        headcountBand: profile.headcount_band,
        workStyle: profile.work_style,
        usesVendorsForData: profile.uses_vendors_for_data || false,
        dataCustomerPii: profile.data_types?.customer_pii || false,
        dataEmployeePii: profile.data_types?.employee_pii || false,
        dataResidentId: profile.data_types?.resident_id || false,
        dataHealthData: profile.data_types?.health_data || false,
        dataPaymentData: profile.data_types?.payment_data || false,
      },
    });

    this.logger.log(`Created/updated company profile: ${companyProfile.id}`);

    // Instantiate compliance templates based on applicability
    const instantiationResult =
      await this.templateInstantiation.instantiateTemplatesForCompany(
        companyId,
        profile,
      );

    this.logger.log(
      `Instantiated ${instantiationResult.obligationsCreated} obligations, ` +
        `${instantiationResult.controlsCreated} controls, ` +
        `${instantiationResult.evidenceRequirementsCreated} evidence requirements`,
    );

    // Log onboarding completion
    await this.auditLog.log({
      tenantId: companyId,
      userId,
      eventType: 'USER_CREATED', // Using closest existing event type
      resourceType: 'Company',
      resourceId: companyId,
      metadata: {
        action: 'ONBOARDING_COMPLETED',
        companyProfileId: companyProfile.id,
        obligationsCreated: instantiationResult.obligationsCreated,
        controlsCreated: instantiationResult.controlsCreated,
        evidenceRequirementsCreated:
          instantiationResult.evidenceRequirementsCreated,
      },
    });

    // Recommend integrations based on profile
    const recommendedIntegrations = this.getRecommendedIntegrations(profileDto);

    // Generate next steps
    const nextSteps = this.generateNextSteps(
      profileDto,
      instantiationResult.obligationsCreated,
    );

    return {
      profile: companyProfile,
      instantiation: instantiationResult,
      recommendedIntegrations,
      nextSteps,
    };
  }

  /**
   * Convert CompanyProfileDto to CompanyProfile format
   */
  private convertToCompanyProfile(dto: CompanyProfileDto): CompanyProfile {
    // Map employee count to headcount band
    let headcount_band: CompanyProfile['headcount_band'];
    if (dto.employeeCount >= 300) {
      headcount_band = '300+';
    } else if (dto.employeeCount >= 100) {
      headcount_band = '100-299';
    } else if (dto.employeeCount >= 30) {
      headcount_band = '30-99';
    } else if (dto.employeeCount >= 10) {
      headcount_band = '10-29';
    } else {
      headcount_band = '1-9';
    }

    // Map work style
    let work_style: CompanyProfile['work_style'];
    if (dto.hasRemoteWork) {
      work_style = 'hybrid';
    } else {
      work_style = 'office';
    }

    // Map data types
    const data_types: CompanyProfile['data_types'] = {};
    if (dto.dataTypes?.includes('EMPLOYEE_DATA')) {
      data_types.employee_pii = true;
    }
    if (dto.dataTypes?.includes('CUSTOMER_DATA')) {
      data_types.customer_pii = true;
    }
    if (dto.dataTypes?.includes('RESIDENT_NUMBERS')) {
      data_types.resident_id = true;
    }
    if (dto.dataTypes?.includes('HEALTH_DATA')) {
      data_types.health_data = true;
    }
    if (
      dto.dataTypes?.includes('PAYMENT_DATA') ||
      dto.dataTypes?.includes('FINANCIAL_DATA')
    ) {
      data_types.payment_data = true;
    }

    return {
      headcount_band,
      industry: dto.industry,
      work_style,
      data_types,
      uses_vendors_for_data: dto.hasVendors || false,
    };
  }

  /**
   * Preview what will be instantiated for a profile
   */
  async previewOnboarding(profileDto: CompanyProfileDto) {
    const profile = this.convertToCompanyProfile(profileDto);
    return this.templateInstantiation.previewInstantiation(profile);
  }

  /**
   * Create default controls for an obligation based on template
   */
  private async createDefaultControls(
    tenantId: string,
    userId: string,
    obligationId: string,
    template: any,
  ) {
    const controlTemplates = this.getControlTemplatesForObligation(template.id);
    const controls: any[] = [];

    for (const ct of controlTemplates) {
      const control = await this.prisma.control.create({
        data: {
          tenantId,
          name: ct.name,
          type: ct.type,
          description: ct.description,
          automationLevel: ct.automationLevel || 'MANUAL',
          ownerId: userId, // Default to onboarding user
          obligations: {
            create: [{ obligationId }],
          },
          evidenceRequirements: {
            create: ct.evidenceRequirements || [],
          },
        },
      });
      controls.push(control);
    }

    return controls;
  }

  /**
   * Control templates for each obligation
   */
  private getControlTemplatesForObligation(templateId: string) {
    const templates: Record<string, any[]> = {
      labor_work_hours: [
        {
          name: '근태 기록 시스템',
          type: 'PREVENTIVE',
          description: '출퇴근 시간 및 근무 시간 자동 기록',
          automationLevel: 'AUTOMATED',
          evidenceRequirements: [
            {
              name: '월간 근태 기록',
              description: '전 직원 출퇴근 및 총 근무시간',
              frequency: 'MONTHLY',
            },
          ],
        },
      ],
      labor_overtime_approval: [
        {
          name: '연장근로 사전 승인 프로세스',
          type: 'PREVENTIVE',
          description: '연장근로 전 상사 승인 필수',
          automationLevel: 'SEMI_AUTOMATED',
          evidenceRequirements: [
            {
              name: '연장근로 승인 기록',
              description: '승인 일시, 승인자, 사유',
              frequency: 'CONTINUOUS',
            },
          ],
        },
      ],
      labor_payslip: [
        {
          name: '임금명세서 발급',
          type: 'DETECTIVE',
          description: '급여 지급 시 임금명세서 자동 발송',
          automationLevel: 'AUTOMATED',
          evidenceRequirements: [
            {
              name: '임금명세서 발급 내역',
              description: '발급 일시 및 수령 확인',
              frequency: 'MONTHLY',
            },
          ],
        },
      ],
      privacy_collection_consent: [
        {
          name: '개인정보 수집·이용 동의 관리',
          type: 'PREVENTIVE',
          description: '개인정보 수집 전 명시적 동의 확보',
          automationLevel: 'SEMI_AUTOMATED',
          evidenceRequirements: [
            {
              name: '동의서 원본',
              description: '동의 일시, 동의자, 동의 항목',
              frequency: 'CONTINUOUS',
            },
          ],
        },
      ],
      privacy_access_control: [
        {
          name: '개인정보 접근 권한 관리',
          type: 'PREVENTIVE',
          description: '최소 권한 원칙에 따른 접근 통제',
          automationLevel: 'AUTOMATED',
          evidenceRequirements: [
            {
              name: '접근 권한 목록',
              description: '사용자별 권한 및 승인 내역',
              frequency: 'QUARTERLY',
            },
            {
              name: '접근 로그',
              description: '개인정보 열람/수정/삭제 기록',
              frequency: 'CONTINUOUS',
            },
          ],
        },
      ],
      vendor_processing_agreement: [
        {
          name: '위수탁 계약 체결 및 관리',
          type: 'PREVENTIVE',
          description: '수탁사와 개인정보 처리 위탁 계약',
          automationLevel: 'MANUAL',
          evidenceRequirements: [
            {
              name: '위수탁 계약서',
              description: '계약서 원본 및 갱신 내역',
              frequency: 'ANNUALLY',
            },
          ],
        },
      ],
      vendor_supervision: [
        {
          name: '수탁사 정기 관리·감독',
          type: 'DETECTIVE',
          description: '수탁사 보안 점검 및 교육 실시',
          automationLevel: 'MANUAL',
          evidenceRequirements: [
            {
              name: '관리·감독 체크리스트',
              description: '점검 일시, 점검자, 조치사항',
              frequency: 'QUARTERLY',
            },
          ],
        },
      ],
    };

    return templates[templateId] || [];
  }

  /**
   * Recommend integrations based on company profile
   */
  private getRecommendedIntegrations(profile: CompanyProfileDto): string[] {
    const recommendations: string[] = [];

    if (profile.employeeCount > 0) {
      recommendations.push('HR/급여 시스템 (플렉스, 잡플래닛 등)');
      recommendations.push('근태 관리 시스템 (아이앤아이소프트, 알바체크 등)');
    }

    if (profile.hasOvertimeWork) {
      recommendations.push('근무시간 및 연장근로 승인 시스템');
    }

    if (Array.isArray(profile.dataTypes) && profile.dataTypes.length > 0) {
      recommendations.push('개인정보 접근 통제 시스템');
      recommendations.push('Google Drive / OneDrive (증빙 자료 수집)');
    }

    if (profile.hasVendors) {
      recommendations.push('벤더/협력사 관리 시스템');
    }

    return recommendations;
  }

  /**
   * Generate actionable next steps
   */
  private generateNextSteps(
    profile: CompanyProfileDto,
    obligationCount: number,
  ): string[] {
    const steps: string[] = [];

    steps.push(
      `${obligationCount}개의 법적 의무사항이 활성화되었습니다. 각 의무의 통제 항목을 확인하세요.`,
    );

    if (profile.employeeCount > 0) {
      steps.push('근태 기록 시스템과 연동하여 자동 증빙 수집을 시작하세요.');
    }

    if (Array.isArray(profile.dataTypes) && profile.dataTypes.length > 0) {
      steps.push(
        '개인정보 수집·이용 동의서를 업로드하고, 접근 권한을 설정하세요.',
      );
    }

    if (profile.hasVendors) {
      steps.push('수탁사와의 위수탁 계약서를 업로드하세요.');
    }

    steps.push('통제 항목별로 담당자를 지정하고, 증빙 수집 일정을 설정하세요.');
    steps.push(
      '대시보드에서 준비도 점수를 확인하고, 부족한 증빙부터 준비하세요.',
    );

    return steps;
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(tenantId: string) {
    return this.prisma.companyProfile.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            name: true,
            businessNumber: true,
            onboardingComplete: true,
          },
        },
      },
    });
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(
    tenantId: string,
    userId: string,
    profileDto: Partial<CompanyProfileDto>,
  ) {
    const updated = await this.prisma.companyProfile.update({
      where: { tenantId },
      data: profileDto as any,
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'USER_UPDATED', // Using closest existing event type
      resourceType: 'CompanyProfile',
      resourceId: updated.id,
      metadata: {
        action: 'PROFILE_UPDATED',
      },
    });

    return updated;
  }

  /**
   * Apply PIPA content pack to tenant
   * This creates all PIPA obligations, controls, and evidence requirements
   */
  async applyPIPAContentPack(tenantId: string) {
    this.logger.log(`Applying PIPA content pack to tenant ${tenantId}`);

    try {
      // Apply PIPA v1 content pack
      await this.contentLoader.applyContentPackToTenant(tenantId, 'PIPA');

      // Mark tenant as onboarded
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { onboardingComplete: true },
      });

      this.logger.log(`✅ PIPA content pack applied to tenant ${tenantId}`);

      return {
        success: true,
        message: 'PIPA 준수 요건이 성공적으로 적용되었습니다.',
      };
    } catch (error) {
      this.logger.error(`Failed to apply PIPA content pack:`, error.stack);
      throw error;
    }
  }

  /**
   * Get onboarding questions (3 steps, 15 questions total)
   * Korean-first for SME onboarding
   */
  getOnboardingQuestions() {
    return {
      steps: [
        {
          step: 1,
          title: '회사 기본 정보',
          description: '귀사의 기본 정보를 입력해주세요',
          questions: [
            {
              id: 'company_name',
              type: 'text',
              label: '회사명',
              required: true,
              placeholder: '예: 주식회사 컴플라이언스OS',
            },
            {
              id: 'business_number',
              type: 'text',
              label: '사업자등록번호',
              required: true,
              placeholder: '123-45-67890',
            },
            {
              id: 'employee_count',
              type: 'select',
              label: '직원 수',
              required: true,
              options: [
                { value: '1-9', label: '1-9명' },
                { value: '10-29', label: '10-29명' },
                { value: '30-99', label: '30-99명' },
                { value: '100-299', label: '100-299명' },
                { value: '300+', label: '300명 이상' },
              ],
            },
            {
              id: 'industry',
              type: 'select',
              label: '업종',
              required: true,
              options: [
                { value: 'TECHNOLOGY', label: '정보통신/소프트웨어' },
                { value: 'RETAIL', label: '전자상거래/유통' },
                { value: 'FINANCE', label: '금융' },
                { value: 'HEALTHCARE', label: '의료/헬스케어' },
                { value: 'EDUCATION', label: '교육' },
                { value: 'MANUFACTURING', label: '제조' },
                { value: 'OTHER', label: '기타' },
              ],
            },
            {
              id: 'has_remote_work',
              type: 'radio',
              label: '재택근무를 운영하고 있나요?',
              required: true,
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
          ],
        },
        {
          step: 2,
          title: '개인정보 처리 현황',
          description: '개인정보 수집 및 처리 현황을 알려주세요',
          questions: [
            {
              id: 'collects_customer_data',
              type: 'radio',
              label: '고객 개인정보를 수집하나요?',
              required: true,
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'data_types',
              type: 'checkbox',
              label: '어떤 종류의 개인정보를 수집하나요? (복수 선택)',
              required: true,
              dependsOn: { field: 'collects_customer_data', value: true },
              options: [
                { value: 'EMPLOYEE_DATA', label: '직원 정보 (이름, 연락처 등)' },
                { value: 'CUSTOMER_DATA', label: '고객 정보 (이름, 연락처, 주소 등)' },
                { value: 'RESIDENT_NUMBERS', label: '주민등록번호' },
                { value: 'PAYMENT_DATA', label: '결제 정보 (카드번호 등)' },
                { value: 'HEALTH_DATA', label: '건강 정보' },
                { value: 'BIOMETRIC_DATA', label: '생체 정보 (지문, 안면인식 등)' },
              ],
            },
            {
              id: 'has_privacy_policy',
              type: 'radio',
              label: '개인정보 처리방침을 공개하고 있나요?',
              required: true,
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'collects_consent',
              type: 'radio',
              label: '개인정보 수집 시 동의를 받고 있나요?',
              required: true,
              dependsOn: { field: 'collects_customer_data', value: true },
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'has_encryption',
              type: 'radio',
              label: '개인정보를 암호화하고 있나요?',
              required: true,
              dependsOn: { field: 'collects_customer_data', value: true },
              options: [
                { value: true, label: '예 (DB 암호화, 통신 암호화 등)' },
                { value: false, label: '아니오' },
              ],
            },
          ],
        },
        {
          step: 3,
          title: '외부 위탁 및 시스템',
          description: '외부 서비스 이용 현황을 알려주세요',
          questions: [
            {
              id: 'has_vendors',
              type: 'radio',
              label: '개인정보 처리를 외부 업체에 위탁하고 있나요?',
              required: true,
              helpText: '예: 결제대행사, 고객상담 대행, SMS 발송 업체 등',
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'vendor_types',
              type: 'checkbox',
              label: '어떤 업무를 위탁하고 있나요? (복수 선택)',
              required: false,
              dependsOn: { field: 'has_vendors', value: true },
              options: [
                { value: 'PAYMENT', label: '결제 대행' },
                { value: 'CS', label: '고객 상담' },
                { value: 'MARKETING', label: '마케팅/광고' },
                { value: 'SMS', label: 'SMS/이메일 발송' },
                { value: 'HOSTING', label: '서버/호스팅' },
                { value: 'OTHER', label: '기타' },
              ],
            },
            {
              id: 'has_dpa_contracts',
              type: 'radio',
              label: '위탁 업체와 개인정보 처리 위탁 계약을 체결했나요?',
              required: false,
              dependsOn: { field: 'has_vendors', value: true },
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'has_international_transfer',
              type: 'radio',
              label: '해외로 개인정보를 이전하고 있나요?',
              required: true,
              helpText: '예: 해외 클라우드 서비스 (AWS, GCP 등) 사용',
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
            {
              id: 'has_cpo',
              type: 'radio',
              label: '개인정보 보호책임자(CPO)를 지정했나요?',
              required: true,
              options: [
                { value: true, label: '예' },
                { value: false, label: '아니오' },
              ],
            },
          ],
        },
      ],
    };
  }
}
