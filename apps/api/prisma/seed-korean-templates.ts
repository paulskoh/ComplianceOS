import { PrismaClient, ObligationDomain, EvidenceFrequency, RiskSeverity, ControlType, AutomationLevel, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seedKoreanTemplates() {
  console.log('🌱 Seeding Korean obligation and control templates...');

  // ============================================
  // LABOR LAW OBLIGATIONS (근로기준법)
  // ============================================

  const laborObligations = [
    {
      title: 'Work Hours Record Retention',
      titleKo: '출퇴근 기록 보관',
      description: 'Maintain accurate records of employee work hours including attendance, overtime, and leave',
      descriptionKo: '근로자의 출퇴근 시각, 연장근로, 휴일근로, 야간근로 시간을 기록하고 3년간 보존해야 합니다.',
      inspectionQuestion: '최근 3년간의 출퇴근 기록부를 확인할 수 있습니까? 전자적 방법으로 관리하는 경우 시스템을 시연해 주십시오.',
      evidenceDescription: '출퇴근 기록부(타임카드, 근태관리 시스템 출력물), 연장/야간/휴일근로 현황표',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: EvidenceFrequency.MONTHLY,
      severity: RiskSeverity.HIGH,
      legalReference: '근로기준법 제51조, 제108조, 근로기준법 시행령 제80조',
    },
    {
      title: 'Overtime Work Approval Records',
      titleKo: '연장/야간/휴일 근로 승인 및 기록',
      description: 'Maintain records of overtime, night, and holiday work with proper approval documentation',
      descriptionKo: '연장근로, 야간근로, 휴일근로에 대한 근로자 동의서 및 승인 기록을 보관해야 합니다.',
      inspectionQuestion: '연장근로 및 휴일근로에 대한 근로자 동의서와 승인 절차를 확인할 수 있습니까?',
      evidenceDescription: '연장근로 동의서, 휴일근로 동의서, 승인 결재 문서',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: EvidenceFrequency.MONTHLY,
      severity: RiskSeverity.CRITICAL,
      legalReference: '근로기준법 제53조, 제56조',
    },
    {
      title: 'Wage Statement Issuance',
      titleKo: '임금명세서 교부',
      description: 'Issue wage statements to employees detailing payment breakdown',
      descriptionKo: '근로자에게 임금의 구성항목, 계산방법, 공제내역 등을 기재한 임금명세서를 교부해야 합니다.',
      inspectionQuestion: '최근 12개월간 임금명세서 교부 기록을 확인할 수 있습니까? 전자교부의 경우 시스템을 확인합니다.',
      evidenceDescription: '임금명세서 원본 또는 사본, 전자교부 시스템 로그',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: EvidenceFrequency.MONTHLY,
      severity: RiskSeverity.HIGH,
      legalReference: '근로기준법 제48조',
    },
    {
      title: 'Employment Contract Retention',
      titleKo: '근로계약서 보관',
      description: 'Maintain employment contracts for all employees',
      descriptionKo: '모든 근로자의 근로계약서를 작성하고 3년간 보관해야 합니다.',
      inspectionQuestion: '전체 재직 근로자의 근로계약서를 확인할 수 있습니까?',
      evidenceDescription: '근로계약서(근로자 서명 또는 날인 포함)',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: EvidenceFrequency.ANNUAL,
      severity: RiskSeverity.HIGH,
      legalReference: '근로기준법 제17조',
    },
    {
      title: 'Annual Leave Management',
      titleKo: '연차휴가 관리',
      description: 'Manage and track annual leave entitlements and usage',
      descriptionKo: '근로자의 연차휴가 발생, 사용, 잔여 현황을 관리하고 미사용 연차에 대한 수당을 지급해야 합니다.',
      inspectionQuestion: '연차휴가 관리대장과 미사용 연차수당 지급 내역을 확인할 수 있습니까?',
      evidenceDescription: '연차휴가 관리대장, 연차수당 지급명세서',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: EvidenceFrequency.QUARTERLY,
      severity: RiskSeverity.MEDIUM,
      legalReference: '근로기준법 제60조, 제61조',
    },
  ];

  // ============================================
  // PRIVACY LAW OBLIGATIONS (개인정보보호법)
  // ============================================

  const privacyObligations = [
    {
      title: 'Privacy Policy Version Management',
      titleKo: '개인정보 처리방침 버전 관리',
      description: 'Maintain and version control privacy policy with public disclosure',
      descriptionKo: '개인정보 처리방침을 작성하여 공개하고, 변경 시 이전 버전을 보관해야 합니다.',
      inspectionQuestion: '현재 시행 중인 개인정보 처리방침과 과거 버전들을 확인할 수 있습니까?',
      evidenceDescription: '개인정보 처리방침 문서, 버전 이력, 홈페이지 게시 확인',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: EvidenceFrequency.ANNUAL,
      severity: RiskSeverity.HIGH,
      legalReference: '개인정보보호법 제30조',
    },
    {
      title: 'Consent Records Management',
      titleKo: '동의 이력 보관',
      description: 'Maintain records of individual consent for personal data processing',
      descriptionKo: '개인정보 수집 시 정보주체의 동의를 받고, 동의 이력을 보관해야 합니다.',
      inspectionQuestion: '개인정보 수집 동의서 및 동의 이력을 확인할 수 있습니까? 전자적 동의의 경우 시스템 로그를 확인합니다.',
      evidenceDescription: '개인정보 수집/이용 동의서, 전자동의 로그',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: EvidenceFrequency.CONTINUOUS,
      severity: RiskSeverity.CRITICAL,
      legalReference: '개인정보보호법 제15조, 제22조',
    },
    {
      title: 'Data Retention and Disposal',
      titleKo: '보유기간 및 파기 증빙',
      description: 'Document retention periods and proof of proper data disposal',
      descriptionKo: '개인정보의 보유기간을 명시하고, 기간 경과 시 파기한 증빙을 관리해야 합니다.',
      inspectionQuestion: '개인정보 파기 대장과 파기 증빙(로그, 증명서 등)을 확인할 수 있습니까?',
      evidenceDescription: '개인정보 파기 대장, 파기 증명서, 파기 로그',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: EvidenceFrequency.QUARTERLY,
      severity: RiskSeverity.HIGH,
      legalReference: '개인정보보호법 제21조',
    },
    {
      title: 'Third-party Processing Management',
      titleKo: '위탁업체 관리',
      description: 'Manage third-party processors with proper contracts and oversight',
      descriptionKo: '개인정보 처리를 위탁하는 경우 위탁계약서를 작성하고 수탁자를 관리·감독해야 합니다.',
      inspectionQuestion: '개인정보 처리 위탁계약서와 수탁자 관리/감독 기록을 확인할 수 있습니까?',
      evidenceDescription: '위탁계약서, 수탁자 관리/감독 체크리스트, 교육 이수 기록',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: EvidenceFrequency.ANNUAL,
      severity: RiskSeverity.HIGH,
      legalReference: '개인정보보호법 제26조',
    },
    {
      title: 'Personal Data Breach Response',
      titleKo: '개인정보 유출 대응',
      description: 'Maintain incident response procedures and breach notification records',
      descriptionKo: '개인정보 유출 사고 발생 시 통지 및 신고 절차를 이행하고 기록을 보관해야 합니다.',
      inspectionQuestion: '개인정보 유출 사고 대응 절차와 관련 기록(있는 경우)을 확인할 수 있습니까?',
      evidenceDescription: '유출 사고 대응 매뉴얼, 유출 통지/신고 기록, 재발방지 대책',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: EvidenceFrequency.ON_CHANGE,
      severity: RiskSeverity.CRITICAL,
      legalReference: '개인정보보호법 제34조',
    },
  ];

  // ============================================
  // GOVERNANCE OBLIGATIONS (내부통제/거버넌스)
  // ============================================

  const governanceObligations = [
    {
      title: 'Policy Distribution and Acknowledgment',
      titleKo: '정책 배포 및 확인',
      description: 'Distribute policies to employees and maintain acknowledgment records',
      descriptionKo: '회사의 주요 정책을 전 직원에게 배포하고 숙지 확인을 받아야 합니다.',
      inspectionQuestion: '정책 배포 기록과 직원 확인서(또는 전자 확인 로그)를 확인할 수 있습니까?',
      evidenceDescription: '정책 배포 공지, 직원 확인서, 전자확인 로그',
      domain: ObligationDomain.TRAINING,
      evidenceFrequency: EvidenceFrequency.ANNUAL,
      severity: RiskSeverity.MEDIUM,
      legalReference: '내부통제 모범규준',
    },
    {
      title: 'Periodic Training Records',
      titleKo: '정기 교육 기록',
      description: 'Conduct and document regular compliance and security training',
      descriptionKo: '법정 의무교육(성희롱 예방, 개인정보보호 등)을 실시하고 교육 이수 기록을 보관해야 합니다.',
      inspectionQuestion: '법정 의무교육 실시 기록(참석자 명단, 교육 자료, 사진 등)을 확인할 수 있습니까?',
      evidenceDescription: '교육 참석자 명단, 교육 자료, 교육 실시 사진',
      domain: ObligationDomain.TRAINING,
      evidenceFrequency: EvidenceFrequency.ANNUAL,
      severity: RiskSeverity.HIGH,
      legalReference: '남녀고용평등법 제13조, 개인정보보호법 제28조',
    },
    {
      title: 'Access Control Management',
      titleKo: '접근통제 관리',
      description: 'Manage and document system access controls and reviews',
      descriptionKo: '중요 시스템에 대한 접근권한을 관리하고 정기적으로 검토해야 합니다.',
      inspectionQuestion: '시스템 접근권한 부여/변경/회수 기록과 정기 검토 기록을 확인할 수 있습니까?',
      evidenceDescription: '접근권한 신청서, 권한 부여/회수 로그, 정기 검토 보고서',
      domain: ObligationDomain.SECURITY,
      evidenceFrequency: EvidenceFrequency.QUARTERLY,
      severity: RiskSeverity.HIGH,
      legalReference: '정보통신망법 제28조',
    },
  ];

  const allObligations = [...laborObligations, ...privacyObligations, ...governanceObligations];

  for (const obligation of allObligations) {
    await prisma.obligationTemplate.upsert({
      where: { id: obligation.title.toLowerCase().replace(/\s+/g, '-') },
      update: obligation,
      create: {
        id: obligation.title.toLowerCase().replace(/\s+/g, '-'),
        ...obligation,
      },
    });
  }

  console.log(`✅ Created ${allObligations.length} obligation templates`);

  // ============================================
  // CONTROL TEMPLATES
  // ============================================

  const controlTemplates = [
    {
      name: 'Attendance Tracking System',
      nameKo: '근태관리 시스템',
      description: 'Implement automated attendance tracking system',
      descriptionKo: '전자 출퇴근 기록 시스템을 도입하여 자동으로 근무시간을 기록합니다.',
      purposeKo: '정확한 근무시간 기록을 통해 임금 계산의 정확성을 확보하고 근로시간 준수 여부를 모니터링합니다.',
      ownerRoleSuggested: UserRole.HR_MANAGER,
      type: ControlType.DETECTIVE,
      automationLevel: AutomationLevel.FULLY_AUTOMATED,
      domain: ObligationDomain.LABOR,
    },
    {
      name: 'Overtime Approval Workflow',
      nameKo: '연장근로 승인 절차',
      description: 'Establish approval workflow for overtime work',
      descriptionKo: '연장근로 전 반드시 사전 승인을 받도록 전자결재 프로세스를 운영합니다.',
      purposeKo: '불필요한 연장근로를 방지하고 법정 연장근로 한도 준수를 보장합니다.',
      ownerRoleSuggested: UserRole.HR_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.SEMI_AUTOMATED,
      domain: ObligationDomain.LABOR,
    },
    {
      name: 'Payroll Documentation System',
      nameKo: '급여명세서 발급 시스템',
      description: 'Automated wage statement generation and distribution',
      descriptionKo: '급여 계산 시스템에서 임금명세서를 자동 생성하여 근로자에게 전자 전송합니다.',
      purposeKo: '임금 구성의 투명성을 확보하고 근로자의 알권리를 보장합니다.',
      ownerRoleSuggested: UserRole.HR_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.FULLY_AUTOMATED,
      domain: ObligationDomain.LABOR,
    },
    {
      name: 'Privacy Policy Management',
      nameKo: '개인정보 처리방침 관리',
      description: 'Version-controlled privacy policy with public disclosure',
      descriptionKo: '개인정보 처리방침을 버전 관리하여 홈페이지에 게시하고 변경 이력을 보관합니다.',
      purposeKo: '정보주체에게 개인정보 처리 현황을 투명하게 공개합니다.',
      ownerRoleSuggested: UserRole.SECURITY_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.MANUAL,
      domain: ObligationDomain.PRIVACY,
    },
    {
      name: 'Consent Management System',
      nameKo: '동의 관리 시스템',
      description: 'Digital consent collection and tracking system',
      descriptionKo: '개인정보 수집 시 전자적 동의를 받고 로그를 자동 보관하는 시스템을 운영합니다.',
      purposeKo: '적법한 동의 획득을 증명하고 동의 철회 요청에 대응합니다.',
      ownerRoleSuggested: UserRole.SECURITY_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.FULLY_AUTOMATED,
      domain: ObligationDomain.PRIVACY,
    },
    {
      name: 'Data Retention and Disposal',
      nameKo: '개인정보 보유 및 파기',
      description: 'Automated data retention and secure disposal process',
      descriptionKo: '보유기간이 경과한 개인정보를 자동으로 탐지하고 안전하게 파기하는 프로세스를 운영합니다.',
      purposeKo: '불필요한 개인정보 보유를 방지하고 유출 위험을 최소화합니다.',
      ownerRoleSuggested: UserRole.SECURITY_MANAGER,
      type: ControlType.CORRECTIVE,
      automationLevel: AutomationLevel.SEMI_AUTOMATED,
      domain: ObligationDomain.PRIVACY,
    },
    {
      name: 'Vendor Security Assessment',
      nameKo: '위탁업체 보안평가',
      description: 'Regular security assessment of third-party processors',
      descriptionKo: '개인정보 처리 위탁업체에 대한 연간 보안평가를 실시하고 개선을 요구합니다.',
      purposeKo: '수탁자의 개인정보 보호 수준을 검증하고 사고를 예방합니다.',
      ownerRoleSuggested: UserRole.SECURITY_MANAGER,
      type: ControlType.DETECTIVE,
      automationLevel: AutomationLevel.MANUAL,
      domain: ObligationDomain.PRIVACY,
    },
    {
      name: 'Policy Acknowledgment Tracking',
      nameKo: '정책 숙지 확인',
      description: 'Track employee acknowledgment of policies',
      descriptionKo: '정책 배포 시 전 직원의 확인 여부를 추적하고 미확인자에게 알림을 발송합니다.',
      purposeKo: '전 직원이 회사 정책을 숙지하도록 보장합니다.',
      ownerRoleSuggested: UserRole.COMPLIANCE_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.SEMI_AUTOMATED,
      domain: ObligationDomain.TRAINING,
    },
    {
      name: 'Mandatory Training Completion',
      nameKo: '법정 의무교육 이수',
      description: 'Track and enforce completion of mandatory training',
      descriptionKo: '법정 의무교육(성희롱 예방, 개인정보보호 등) 이수 현황을 추적하고 미이수자를 관리합니다.',
      purposeKo: '법정 교육 의무를 준수하고 직원 인식을 제고합니다.',
      ownerRoleSuggested: UserRole.COMPLIANCE_MANAGER,
      type: ControlType.PREVENTIVE,
      automationLevel: AutomationLevel.SEMI_AUTOMATED,
      domain: ObligationDomain.TRAINING,
    },
    {
      name: 'Access Control Review',
      nameKo: '접근권한 검토',
      description: 'Quarterly review of system access rights',
      descriptionKo: '분기별로 중요 시스템의 접근권한을 검토하여 불필요한 권한을 회수합니다.',
      purposeKo: '최소권한 원칙을 유지하고 내부 부정 위험을 최소화합니다.',
      ownerRoleSuggested: UserRole.SECURITY_MANAGER,
      type: ControlType.DETECTIVE,
      automationLevel: AutomationLevel.MANUAL,
      domain: ObligationDomain.SECURITY,
    },
  ];

  for (const control of controlTemplates) {
    await prisma.controlTemplate.create({
      data: control,
    });
  }

  console.log(`✅ Created ${controlTemplates.length} control templates`);

  console.log('🎉 Korean template seeding complete!');
}

seedKoreanTemplates()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
