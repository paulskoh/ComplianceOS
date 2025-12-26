import { PrismaClient, AutomationLevel, ControlType, ObligationDomain } from '@prisma/client';

const prisma = new PrismaClient();

interface ControlTemplateData {
  code: string;
  obligationCode: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  domain: ObligationDomain;
  type: ControlType;
  automationLevel: AutomationLevel;
  evidenceRequirements: {
    code: string;
    titleKo: string;
    cadenceRule: string;
    requiredFields: string[];
    acceptanceCriteria: string[];
  }[];
}

const controlTemplates: ControlTemplateData[] = [
  // LABOR
  {
    code: 'ctrl_work_hours_tracking',
    obligationCode: 'labor_work_hours',
    name: 'Work Hours Tracking System',
    nameKo: '근태 기록 시스템',
    description: 'Automatic recording of clock-in/out times and work hours',
    descriptionKo: '출퇴근 시간 및 근무 시간 자동 기록',
    domain: ObligationDomain.LABOR,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_monthly_attendance', titleKo: '월간 근태 기록', cadenceRule: 'MONTHLY', requiredFields: ['employee_list', 'work_hours'], acceptanceCriteria: ['전 직원 포함', '총 근무시간 표시'] },
    ],
  },
  {
    code: 'ctrl_overtime_approval',
    obligationCode: 'labor_overtime_approval',
    name: 'Overtime Approval Process',
    nameKo: '연장근로 사전 승인 프로세스',
    description: 'Prior approval required for overtime work',
    descriptionKo: '연장근로 전 상사 승인 필수',
    domain: ObligationDomain.LABOR,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_overtime_approval_log', titleKo: '연장근로 승인 기록', cadenceRule: 'MONTHLY', requiredFields: ['approval_date', 'approver', 'reason'], acceptanceCriteria: ['사전 승인 확인', '승인자 서명'] },
    ],
  },
  {
    code: 'ctrl_payslip_issuance',
    obligationCode: 'labor_payslip',
    name: 'Payslip Issuance System',
    nameKo: '임금명세서 발급 시스템',
    description: 'Automatic payslip issuance on salary payment',
    descriptionKo: '급여 지급 시 임금명세서 자동 발송',
    domain: ObligationDomain.LABOR,
    type: ControlType.DETECTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_payslip_records', titleKo: '임금명세서 발급 내역', cadenceRule: 'MONTHLY', requiredFields: ['issue_date', 'recipient_count'], acceptanceCriteria: ['발급일 확인', '법정 기재사항 포함'] },
    ],
  },
  {
    code: 'ctrl_leave_management',
    obligationCode: 'labor_leave_management',
    name: 'Leave Management System',
    nameKo: '휴가 관리 시스템',
    description: 'Annual leave allocation and usage management',
    descriptionKo: '연차휴가 부여, 사용, 잔여 현황 관리',
    domain: ObligationDomain.LABOR,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_leave_records', titleKo: '휴가 사용 현황', cadenceRule: 'QUARTERLY', requiredFields: ['employee_list', 'granted_days', 'used_days'], acceptanceCriteria: ['전 직원 포함', '법정 연차 부여 확인'] },
    ],
  },

  // PRIVACY
  {
    code: 'ctrl_consent_management',
    obligationCode: 'privacy_collection_consent',
    name: 'Consent Management',
    nameKo: '개인정보 수집·이용 동의 관리',
    description: 'Obtain explicit consent before collecting personal information',
    descriptionKo: '개인정보 수집 전 명시적 동의 확보',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_consent_form', titleKo: '동의서 양식', cadenceRule: 'ON_CHANGE', requiredFields: ['consent_items', 'legal_basis'], acceptanceCriteria: ['필수/선택 동의 구분', '법정 고지사항 포함'] },
      { code: 'ev_consent_records', titleKo: '동의 수집 기록', cadenceRule: 'QUARTERLY', requiredFields: ['consent_date', 'consent_count'], acceptanceCriteria: ['동의 일시 기록', '증적 보관'] },
    ],
  },
  {
    code: 'ctrl_resident_number_protection',
    obligationCode: 'privacy_resident_number',
    name: 'Resident Number Protection',
    nameKo: '주민등록번호 처리 제한 관리',
    description: 'Minimize collection and encrypt resident registration numbers',
    descriptionKo: '주민등록번호 수집 최소화 및 암호화',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_resident_number_policy', titleKo: '주민등록번호 처리 현황', cadenceRule: 'QUARTERLY', requiredFields: ['collection_purpose', 'encryption_method'], acceptanceCriteria: ['법적 근거 확인', '암호화 적용'] },
    ],
  },
  {
    code: 'ctrl_sensitive_data_protection',
    obligationCode: 'privacy_sensitive_data',
    name: 'Sensitive Data Protection',
    nameKo: '민감정보 처리 관리',
    description: 'Separate consent and enhanced protection for sensitive data',
    descriptionKo: '민감정보 별도 동의 및 강화된 보호',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_sensitive_data_consent', titleKo: '민감정보 처리 동의서', cadenceRule: 'ON_CHANGE', requiredFields: ['sensitive_data_types', 'purpose'], acceptanceCriteria: ['별도 동의 확인', '처리 목적 명시'] },
    ],
  },
  {
    code: 'ctrl_access_control',
    obligationCode: 'privacy_access_control',
    name: 'Personal Data Access Control',
    nameKo: '개인정보 접근 권한 관리',
    description: 'Access control based on least privilege principle',
    descriptionKo: '최소 권한 원칙에 따른 접근 통제',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_access_permission_list', titleKo: '접근 권한 목록', cadenceRule: 'QUARTERLY', requiredFields: ['user_list', 'permission_level'], acceptanceCriteria: ['최소 권한 적용', '정기 검토'] },
      { code: 'ev_access_log', titleKo: '접근 로그', cadenceRule: 'MONTHLY', requiredFields: ['access_date', 'user', 'action'], acceptanceCriteria: ['로그 보관', '1년 보관'] },
    ],
  },
  {
    code: 'ctrl_retention_destruction',
    obligationCode: 'privacy_retention_destruction',
    name: 'Data Retention & Destruction',
    nameKo: '개인정보 보유·파기 관리',
    description: 'Comply with retention periods and safe destruction',
    descriptionKo: '보유기간 준수 및 안전한 파기',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.DETECTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_retention_policy', titleKo: '보유기간 정책', cadenceRule: 'ANNUAL', requiredFields: ['data_category', 'retention_period'], acceptanceCriteria: ['법적 보유기간 준수', '정책 문서화'] },
      { code: 'ev_destruction_records', titleKo: '파기 기록', cadenceRule: 'QUARTERLY', requiredFields: ['destruction_date', 'data_type', 'method'], acceptanceCriteria: ['파기 일시', '확인자 서명'] },
    ],
  },
  {
    code: 'ctrl_international_transfer',
    obligationCode: 'privacy_international_transfer',
    name: 'International Data Transfer',
    nameKo: '개인정보 국외이전 관리',
    description: 'Consent and safeguards for international transfers',
    descriptionKo: '국외이전 시 동의 및 보호조치',
    domain: ObligationDomain.PRIVACY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.MANUAL,
    evidenceRequirements: [
      { code: 'ev_transfer_consent', titleKo: '국외이전 동의서', cadenceRule: 'ON_CHANGE', requiredFields: ['destination_country', 'recipient'], acceptanceCriteria: ['이전 국가 고지', '별도 동의'] },
      { code: 'ev_transfer_safeguards', titleKo: '국외이전 보호조치', cadenceRule: 'ANNUAL', requiredFields: ['safeguard_type', 'contract_terms'], acceptanceCriteria: ['보호조치 확인', '계약서 확인'] },
    ],
  },

  // CONTRACTS
  {
    code: 'ctrl_vendor_agreement',
    obligationCode: 'vendor_processing_agreement',
    name: 'Vendor Processing Agreement',
    nameKo: '위수탁 계약 관리',
    description: 'Data processing entrustment contracts with vendors',
    descriptionKo: '수탁사와 개인정보 처리 위탁 계약',
    domain: ObligationDomain.CONTRACTS,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.MANUAL,
    evidenceRequirements: [
      { code: 'ev_vendor_contract', titleKo: '위수탁 계약서', cadenceRule: 'ANNUAL', requiredFields: ['vendor_name', 'processing_scope'], acceptanceCriteria: ['법정 기재사항 포함', '갱신 관리'] },
    ],
  },
  {
    code: 'ctrl_vendor_supervision',
    obligationCode: 'vendor_supervision',
    name: 'Vendor Supervision',
    nameKo: '수탁사 관리·감독',
    description: 'Regular inspection and training for vendors',
    descriptionKo: '수탁사 정기 점검 및 교육',
    domain: ObligationDomain.CONTRACTS,
    type: ControlType.DETECTIVE,
    automationLevel: AutomationLevel.MANUAL,
    evidenceRequirements: [
      { code: 'ev_vendor_audit', titleKo: '수탁사 점검 기록', cadenceRule: 'QUARTERLY', requiredFields: ['audit_date', 'vendor_name', 'checklist'], acceptanceCriteria: ['점검 체크리스트', '조치사항'] },
    ],
  },
  {
    code: 'ctrl_contractor_management',
    obligationCode: 'contractor_management',
    name: 'Contractor Management',
    nameKo: '도급·용역 인력 관리',
    description: 'Management of contracted and outsourced personnel',
    descriptionKo: '도급 및 용역 인력 관리',
    domain: ObligationDomain.CONTRACTS,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.MANUAL,
    evidenceRequirements: [
      { code: 'ev_contractor_records', titleKo: '도급·용역 인력 현황', cadenceRule: 'QUARTERLY', requiredFields: ['contractor_list', 'work_scope'], acceptanceCriteria: ['인력 현황', '보안 교육 이수'] },
    ],
  },

  // SECURITY
  {
    code: 'ctrl_security_access',
    obligationCode: 'security_access_control',
    name: 'Security Access Control',
    nameKo: '시스템 접근 통제',
    description: 'ISMS-P certification - access control and monitoring',
    descriptionKo: 'ISMS-P 인증 대상 - 접근 통제 및 모니터링',
    domain: ObligationDomain.SECURITY,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_security_access_policy', titleKo: '접근통제 정책', cadenceRule: 'ANNUAL', requiredFields: ['policy_document', 'approval_date'], acceptanceCriteria: ['정책 문서화', '정기 검토'] },
      { code: 'ev_security_access_review', titleKo: '접근권한 검토 기록', cadenceRule: 'QUARTERLY', requiredFields: ['review_date', 'reviewer'], acceptanceCriteria: ['정기 검토', '승인 기록'] },
    ],
  },
  {
    code: 'ctrl_log_management',
    obligationCode: 'security_log_management',
    name: 'Log Management',
    nameKo: '접속 기록 보관 관리',
    description: 'Retain access logs for at least 1 year',
    descriptionKo: '접속 기록 최소 1년 보관 및 관리',
    domain: ObligationDomain.SECURITY,
    type: ControlType.DETECTIVE,
    automationLevel: AutomationLevel.FULLY_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_log_retention', titleKo: '로그 보관 현황', cadenceRule: 'QUARTERLY', requiredFields: ['log_types', 'retention_period'], acceptanceCriteria: ['1년 이상 보관', '무결성 보장'] },
    ],
  },

  // TRAINING
  {
    code: 'ctrl_privacy_training',
    obligationCode: 'privacy_training',
    name: 'Privacy Training Program',
    nameKo: '개인정보보호 교육 프로그램',
    description: 'Annual privacy training for data handlers',
    descriptionKo: '개인정보 처리자 대상 연 1회 교육',
    domain: ObligationDomain.TRAINING,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_privacy_training_plan', titleKo: '교육 계획', cadenceRule: 'ANNUAL', requiredFields: ['training_date', 'curriculum'], acceptanceCriteria: ['연간 계획', '대상자 선정'] },
      { code: 'ev_privacy_training_records', titleKo: '교육 이수 기록', cadenceRule: 'ANNUAL', requiredFields: ['attendee_list', 'completion_rate'], acceptanceCriteria: ['이수율 100%', '평가 결과'] },
    ],
  },
  {
    code: 'ctrl_harassment_training',
    obligationCode: 'sexual_harassment_training',
    name: 'Sexual Harassment Prevention Training',
    nameKo: '성희롱 예방교육 프로그램',
    description: 'Annual harassment prevention training for employees',
    descriptionKo: '근로자 대상 연 1회 교육',
    domain: ObligationDomain.TRAINING,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_harassment_training_records', titleKo: '성희롱 예방교육 기록', cadenceRule: 'ANNUAL', requiredFields: ['training_date', 'attendee_list'], acceptanceCriteria: ['전 직원 이수', '참석 확인'] },
    ],
  },
  {
    code: 'ctrl_safety_training',
    obligationCode: 'safety_training',
    name: 'Safety Training Program',
    nameKo: '안전 교육 프로그램',
    description: 'Industry-specific safety training',
    descriptionKo: '업종별 안전 교육 실시',
    domain: ObligationDomain.TRAINING,
    type: ControlType.PREVENTIVE,
    automationLevel: AutomationLevel.SEMI_AUTOMATED,
    evidenceRequirements: [
      { code: 'ev_safety_training_records', titleKo: '안전 교육 기록', cadenceRule: 'QUARTERLY', requiredFields: ['training_date', 'training_type'], acceptanceCriteria: ['정기 교육', '참석 확인'] },
    ],
  },
];

export async function seedControlTemplates() {
  console.log('🌱 Seeding control templates and evidence requirement templates...');

  let controlCount = 0;
  let evidenceReqCount = 0;

  for (const ctrl of controlTemplates) {
    // Create control template
    await prisma.controlTemplate.upsert({
      where: { code: ctrl.code },
      update: {
        obligationCode: ctrl.obligationCode,
        name: ctrl.name,
        nameKo: ctrl.nameKo,
        description: ctrl.description,
        descriptionKo: ctrl.descriptionKo,
        domain: ctrl.domain,
        type: ctrl.type,
        automationLevel: ctrl.automationLevel,
        isActive: true,
      },
      create: {
        code: ctrl.code,
        obligationCode: ctrl.obligationCode,
        name: ctrl.name,
        nameKo: ctrl.nameKo,
        description: ctrl.description,
        descriptionKo: ctrl.descriptionKo,
        domain: ctrl.domain,
        type: ctrl.type,
        automationLevel: ctrl.automationLevel,
        isActive: true,
      },
    });
    controlCount++;

    // Create evidence requirement templates
    for (const evReq of ctrl.evidenceRequirements) {
      await prisma.evidenceRequirementTemplate.upsert({
        where: { code: evReq.code },
        update: {
          controlCode: ctrl.code,
          titleKo: evReq.titleKo,
          cadenceRule: evReq.cadenceRule,
          requiredFields: evReq.requiredFields,
          acceptanceCriteria: evReq.acceptanceCriteria,
        },
        create: {
          code: evReq.code,
          controlCode: ctrl.code,
          titleKo: evReq.titleKo,
          cadenceRule: evReq.cadenceRule,
          requiredFields: evReq.requiredFields,
          acceptanceCriteria: evReq.acceptanceCriteria,
        },
      });
      evidenceReqCount++;
    }
  }

  console.log(`✅ Created ${controlCount} control templates`);
  console.log(`✅ Created ${evidenceReqCount} evidence requirement templates`);

  return { controlCount, evidenceReqCount };
}

// Run if called directly
if (require.main === module) {
  seedControlTemplates()
    .then(() => {
      console.log('✅ Control template seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Control template seeding failed:', error);
      process.exit(1);
    });
}
