import { PrismaClient, ObligationDomain, EvidenceFrequency } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedObligationTemplates() {
  console.log('🌱 Seeding obligation templates...');

  const templates = [
    // LABOR
    {
      id: 'labor_work_hours',
      title: 'Work Hours Tracking',
      titleKo: '근로시간 기록 관리',
      description: 'Manage and record work hours in accordance with the Labor Standards Act',
      descriptionKo: '근로기준법에 따른 근로시간 기록 및 관리 의무',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: 'MONTHLY' as EvidenceFrequency,
    },
    {
      id: 'labor_overtime_approval',
      title: 'Overtime Approval',
      titleKo: '연장근로 사전 승인',
      description: 'Obtain prior approval and maintain records for overtime work',
      descriptionKo: '연장근로 시 사전 승인 및 기록 의무',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: 'CONTINUOUS' as EvidenceFrequency,
    },
    {
      id: 'labor_payslip',
      title: 'Payslip Issuance',
      titleKo: '임금명세서 발급',
      description: 'Prepare and issue payslips to employees',
      descriptionKo: '임금명세서 작성 및 교부 의무',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: 'MONTHLY' as EvidenceFrequency,
    },
    {
      id: 'labor_leave_management',
      title: 'Leave Management',
      titleKo: '휴가 관리',
      description: 'Manage and record annual leave allocation and usage',
      descriptionKo: '연차휴가 부여 및 사용 기록 의무',
      domain: ObligationDomain.LABOR,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },

    // PRIVACY
    {
      id: 'privacy_collection_consent',
      title: 'Collection & Consent',
      titleKo: '개인정보 수집·이용 동의',
      description: 'Obtain and retain explicit consent when collecting personal information',
      descriptionKo: '개인정보 수집 시 명시적 동의 확보 및 보관 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'CONTINUOUS' as EvidenceFrequency,
    },
    {
      id: 'privacy_resident_number',
      title: 'Resident Number Protection',
      titleKo: '주민등록번호 처리 제한',
      description: 'Restrict and protect the collection and use of resident registration numbers',
      descriptionKo: '주민등록번호 수집·이용 제한 및 보호 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },
    {
      id: 'privacy_sensitive_data',
      title: 'Sensitive Data Protection',
      titleKo: '민감정보 처리 제한',
      description: 'Obtain separate consent and protect sensitive information such as health and biometric data',
      descriptionKo: '민감정보(건강, 생체정보 등) 별도 동의 및 보호 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },
    {
      id: 'privacy_access_control',
      title: 'Access Control',
      titleKo: '개인정보 접근 통제',
      description: 'Manage personal information access permissions and maintain access logs',
      descriptionKo: '개인정보 접근 권한 관리 및 로그 보관 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'CONTINUOUS' as EvidenceFrequency,
    },
    {
      id: 'privacy_retention_destruction',
      title: 'Retention & Destruction',
      titleKo: '개인정보 보유·파기',
      description: 'Comply with retention periods and implement destruction procedures for personal information',
      descriptionKo: '개인정보 보유기간 준수 및 파기 절차 이행 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },
    {
      id: 'privacy_international_transfer',
      title: 'International Transfer',
      titleKo: '개인정보 국외이전',
      description: 'Obtain consent and provide notice for international transfer of personal information',
      descriptionKo: '개인정보 국외이전 시 동의 및 고지 의무',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'ON_CHANGE' as EvidenceFrequency,
    },

    // CONTRACTS
    {
      id: 'vendor_processing_agreement',
      title: 'Vendor Processing Agreement',
      titleKo: '위수탁 계약',
      description: 'Establish and manage personal information processing entrustment contracts',
      descriptionKo: '개인정보 처리 위탁 계약 체결 및 관리 의무',
      domain: ObligationDomain.CONTRACTS,
      evidenceFrequency: 'ANNUAL' as EvidenceFrequency,
    },
    {
      id: 'vendor_supervision',
      title: 'Vendor Supervision',
      titleKo: '수탁사 관리·감독',
      description: 'Conduct regular inspections and training for entrusted companies',
      descriptionKo: '수탁사 정기 점검 및 교육 실시 의무',
      domain: ObligationDomain.CONTRACTS,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },
    {
      id: 'contractor_management',
      title: 'Contractor Management',
      titleKo: '도급·용역 인력 관리',
      description: 'Manage contracted and outsourced personnel',
      descriptionKo: '도급 및 용역 인력 관리 의무',
      domain: ObligationDomain.CONTRACTS,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },

    // SECURITY
    {
      id: 'security_access_control',
      title: 'Security Access Control',
      titleKo: '보안 접근 통제',
      description: 'ISMS-P certification target - System access control and monitoring',
      descriptionKo: 'ISMS-P 인증 대상 - 시스템 접근 통제 및 모니터링',
      domain: ObligationDomain.SECURITY,
      evidenceFrequency: 'CONTINUOUS' as EvidenceFrequency,
    },
    {
      id: 'security_log_management',
      title: 'Log Management',
      titleKo: '접속 기록 보관',
      description: 'Retain access logs for at least 1 year and manage them properly',
      descriptionKo: '접속 기록 최소 1년 보관 및 관리 의무',
      domain: ObligationDomain.SECURITY,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },

    // TRAINING
    {
      id: 'privacy_training',
      title: 'Privacy Training',
      titleKo: '개인정보보호 교육',
      description: 'Conduct annual privacy protection training for personal information handlers',
      descriptionKo: '개인정보 처리자 대상 연 1회 교육 실시 의무',
      domain: ObligationDomain.TRAINING,
      evidenceFrequency: 'ANNUAL' as EvidenceFrequency,
    },
    {
      id: 'sexual_harassment_training',
      title: 'Sexual Harassment Prevention',
      titleKo: '성희롱 예방교육',
      description: 'Conduct annual sexual harassment prevention training for employees',
      descriptionKo: '근로자 대상 연 1회 성희롱 예방교육 실시 의무',
      domain: ObligationDomain.TRAINING,
      evidenceFrequency: 'ANNUAL' as EvidenceFrequency,
    },
    {
      id: 'safety_training',
      title: 'Safety Training',
      titleKo: '안전 교육',
      description: 'Conduct industry-specific safety training',
      descriptionKo: '업종별 안전 교육 실시 의무',
      domain: ObligationDomain.TRAINING,
      evidenceFrequency: 'QUARTERLY' as EvidenceFrequency,
    },
  ];

  for (const template of templates) {
    await prisma.obligationTemplate.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
  }

  console.log(`✅ Created ${templates.length} obligation templates`);

  return templates;
}

// Run if called directly
if (require.main === module) {
  seedObligationTemplates()
    .then(() => {
      console.log('✅ Template seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Template seeding failed:', error);
      process.exit(1);
    });
}
