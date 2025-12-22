import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CompanyProfileDto } from '@complianceos/shared';
import { TemplateInstantiationService } from './template-instantiation.service';
import { CompanyProfile } from '../common/types/company-profile.types';

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
      profile,
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

    if (profile.dataTypes.length > 0) {
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

    if (profile.dataTypes.length > 0) {
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
}
