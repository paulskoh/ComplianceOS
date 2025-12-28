import { PrismaClient, ObligationDomain, ControlType, AutomationLevel, ArtifactType, AccessClassification, ArtifactStatus, Industry, DataType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * CEO Demo Seed Script
 *
 * Creates demo tenant "넥스트솔루션 (주)" with:
 * - Company profile (85명, Technology)
 * - Sample artifacts with planted contradictions
 * - Evidence requirements linked to K-ISMS controls
 *
 * Demo Artifacts:
 * 1. 개인정보처리방침_v2.3.pdf - VERIFIED (보관기간: 3년)
 * 2. 위탁계약서_클라우드서비스.docx - VERIFIED (보관기간: 5년 - contradiction!)
 * 3. 내부관리계획_2024.pdf - VERIFIED (파기: 30일 유예)
 * 4. 교육실시대장_2024.xlsx - FLAGGED (incomplete records)
 * 5. 접근권한관리대장.xlsx - VERIFIED
 * 6. 정책검토회의록_2024Q2.pdf - FLAGGED (scanned/unparseable)
 */
async function main() {
  console.log('🇰🇷 CEO Demo Seed: 넥스트솔루션 (주)');
  console.log('=====================================\n');

  // Clean up existing demo data if any
  console.log('🧹 Cleaning up existing demo data...');

  // Delete by businessNumber if exists
  await prisma.tenant.deleteMany({
    where: {
      OR: [
        { id: 'demo-nextsolution-tenant' },
        { businessNumber: '123-45-67890' },
      ],
    },
  });

  // Delete demo user if exists
  await prisma.user.deleteMany({
    where: { email: 'ceo@nextsolution.kr' },
  });

  console.log('✅ Cleanup complete');

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: 'demo-nextsolution-tenant',
      name: '넥스트솔루션 (주)',
      businessNumber: '123-45-67890',
      industry: 'Technology',
      headcount: 85,
      isActive: true,
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create company profile
  const companyProfile = await prisma.companyProfile.create({
    data: {
      tenantId: tenant.id,
      industry: Industry.TECHNOLOGY,
      employeeCount: 85,
      hasRemoteWork: true,
      hasOvertimeWork: true,
      hasContractors: true,
      hasVendors: true,
      hasInternationalTransfer: false,
      dataTypes: [DataType.EMPLOYEE_DATA, DataType.CUSTOMER_DATA, DataType.PAYMENT_DATA],
    },
  });
  console.log('✅ Created company profile');

  // Create CEO user
  const passwordHash = await argon2.hash('Demo2024!');
  const ceoUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'ceo@nextsolution.kr',
      passwordHash,
      firstName: '대표',
      lastName: '김',
      role: 'ORG_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Created CEO user:', ceoUser.email);

  // Create obligation templates for privacy
  const privacyObligation = await prisma.obligationTemplate.upsert({
    where: { id: 'demo-pipa-obligation' },
    update: {},
    create: {
      id: 'demo-pipa-obligation',
      title: 'Personal Information Protection Act Compliance',
      titleKo: '개인정보보호법 준수',
      description: 'Comprehensive compliance with Korean PIPA requirements',
      descriptionKo: '개인정보보호법 전반적 준수 요건',
      domain: ObligationDomain.PRIVACY,
      evidenceFrequency: 'ANNUAL',
    },
  });

  // Create controls with evidence requirements
  const controls = await Promise.all([
    // Privacy Policy Control
    prisma.control.upsert({
      where: { id: 'demo-control-privacy-policy' },
      update: {},
      create: {
        id: 'demo-control-privacy-policy',
        tenantId: tenant.id,
        name: '개인정보처리방침 관리',
        description: 'Maintain and publish privacy policy as required by PIPA Article 30',
        type: ControlType.PREVENTIVE,
        automationLevel: AutomationLevel.MANUAL,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-privacy-policy',
              name: '개인정보처리방침 문서',
              description: '최신 버전의 개인정보처리방침 (개보법 제30조)',
              freshnessWindowDays: 365,
              required: true,
              acceptanceCriteria: ['법적 필수 항목 포함', '최신 버전'],
            },
          ],
        },
      },
    }),
    // Vendor Agreement Control
    prisma.control.upsert({
      where: { id: 'demo-control-vendor' },
      update: {},
      create: {
        id: 'demo-control-vendor',
        tenantId: tenant.id,
        name: '위탁계약서 관리',
        description: 'Maintain processing agreements with all vendors as required by PIPA Article 26',
        type: ControlType.PREVENTIVE,
        automationLevel: AutomationLevel.MANUAL,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-vendor-agreement',
              name: '개인정보 처리 위탁계약서',
              description: '수탁자와의 위탁계약서 (개보법 제26조)',
              freshnessWindowDays: 365,
              required: true,
              acceptanceCriteria: ['법적 필수 조항 포함'],
            },
          ],
        },
      },
    }),
    // Internal Management Plan Control
    prisma.control.upsert({
      where: { id: 'demo-control-mgmt-plan' },
      update: {},
      create: {
        id: 'demo-control-mgmt-plan',
        tenantId: tenant.id,
        name: '내부관리계획 수립',
        description: 'Establish internal management plan as required by PIPA Enforcement Decree Article 30',
        type: ControlType.PREVENTIVE,
        automationLevel: AutomationLevel.MANUAL,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-mgmt-plan',
              name: '내부관리계획 문서',
              description: '개인정보 내부관리계획 (시행령 제30조)',
              freshnessWindowDays: 365,
              required: true,
              acceptanceCriteria: ['필수 12개 항목 포함'],
            },
          ],
        },
      },
    }),
    // Training Control
    prisma.control.upsert({
      where: { id: 'demo-control-training' },
      update: {},
      create: {
        id: 'demo-control-training',
        tenantId: tenant.id,
        name: '개인정보보호 교육',
        description: 'Conduct annual privacy training for all employees',
        type: ControlType.DETECTIVE,
        automationLevel: AutomationLevel.MANUAL,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-training',
              name: '교육실시대장',
              description: '개인정보보호 교육 이수 기록',
              freshnessWindowDays: 365,
              required: true,
              acceptanceCriteria: ['연 1회 이상', '전 직원 대상'],
            },
          ],
        },
      },
    }),
    // Access Control
    prisma.control.upsert({
      where: { id: 'demo-control-access' },
      update: {},
      create: {
        id: 'demo-control-access',
        tenantId: tenant.id,
        name: '접근권한 관리',
        description: 'Maintain access control records for personal information systems',
        type: ControlType.DETECTIVE,
        automationLevel: AutomationLevel.SEMI_AUTOMATED,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-access',
              name: '접근권한관리대장',
              description: '개인정보 접근권한 부여/변경/말소 기록',
              freshnessWindowDays: 30,
              required: true,
              acceptanceCriteria: ['정기 점검 기록 포함'],
            },
          ],
        },
      },
    }),
    // Policy Review Control
    prisma.control.upsert({
      where: { id: 'demo-control-review' },
      update: {},
      create: {
        id: 'demo-control-review',
        tenantId: tenant.id,
        name: '정책 검토 절차',
        description: 'Annual review and approval of security policies',
        type: ControlType.PREVENTIVE,
        automationLevel: AutomationLevel.MANUAL,
        ownerId: ceoUser.id,
        isActive: true,
        evidenceRequirements: {
          create: [
            {
              id: 'demo-er-review',
              name: '정책검토회의록',
              description: '연간 정책 검토 및 승인 회의록',
              freshnessWindowDays: 365,
              required: true,
              acceptanceCriteria: ['경영진 승인 포함'],
            },
          ],
        },
      },
    }),
  ]);
  console.log('✅ Created controls with evidence requirements');

  // Create demo artifacts
  // 1. 개인정보처리방침_v2.3.pdf - VERIFIED (보관기간: 3년)
  const privacyPolicy = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-privacy-policy' },
    update: {},
    create: {
      id: 'demo-artifact-privacy-policy',
      tenantId: tenant.id,
      name: '개인정보처리방침_v2.3.pdf',
      description: '넥스트솔루션 (주) 개인정보처리방침 버전 2.3',
      type: ArtifactType.POLICY,
      source: 'GENERATED',
      accessClassification: AccessClassification.PUBLIC,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.VERIFIED,
      version: 3,
      mimeType: 'application/pdf',
      fileName: '개인정보처리방침_v2.3.pdf',
    },
  });

  // 2. 위탁계약서_클라우드서비스.docx - VERIFIED (보관기간: 5년 - contradiction!)
  const vendorAgreement = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-vendor-agreement' },
    update: {},
    create: {
      id: 'demo-artifact-vendor-agreement',
      tenantId: tenant.id,
      name: '위탁계약서_클라우드서비스.docx',
      description: '클라우드서비스 제공업체와의 개인정보 처리 위탁계약서',
      type: ArtifactType.POLICY,
      source: 'MANUAL_UPLOAD',
      accessClassification: AccessClassification.CONFIDENTIAL,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.VERIFIED,
      version: 1,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: '위탁계약서_클라우드서비스.docx',
    },
  });

  // 3. 내부관리계획_2024.pdf - VERIFIED
  const managementPlan = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-mgmt-plan' },
    update: {},
    create: {
      id: 'demo-artifact-mgmt-plan',
      tenantId: tenant.id,
      name: '내부관리계획_2024.pdf',
      description: '2024년도 개인정보 내부관리계획',
      type: ArtifactType.POLICY,
      source: 'GENERATED',
      accessClassification: AccessClassification.INTERNAL,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.VERIFIED,
      version: 1,
      mimeType: 'application/pdf',
      fileName: '내부관리계획_2024.pdf',
    },
  });

  // 4. 교육실시대장_2024.xlsx - FLAGGED (incomplete)
  const trainingLog = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-training-log' },
    update: {},
    create: {
      id: 'demo-artifact-training-log',
      tenantId: tenant.id,
      name: '교육실시대장_2024.xlsx',
      description: '2024년도 개인정보보호 교육 실시 기록',
      type: ArtifactType.LOG,
      source: 'MANUAL_UPLOAD',
      accessClassification: AccessClassification.INTERNAL,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.FLAGGED,
      version: 1,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: '교육실시대장_2024.xlsx',
    },
  });

  // 5. 접근권한관리대장.xlsx - VERIFIED
  const accessLog = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-access-log' },
    update: {},
    create: {
      id: 'demo-artifact-access-log',
      tenantId: tenant.id,
      name: '접근권한관리대장.xlsx',
      description: '개인정보 접근권한 관리 대장',
      type: ArtifactType.LOG,
      source: 'INTEGRATION',
      accessClassification: AccessClassification.INTERNAL,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.VERIFIED,
      version: 1,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: '접근권한관리대장.xlsx',
    },
  });

  // 6. 정책검토회의록_2024Q2.pdf - FLAGGED (scanned/unparseable)
  const reviewMeeting = await prisma.artifact.upsert({
    where: { id: 'demo-artifact-review-meeting' },
    update: {},
    create: {
      id: 'demo-artifact-review-meeting',
      tenantId: tenant.id,
      name: '정책검토회의록_2024Q2.pdf',
      description: '2024년 2분기 정책 검토 회의록 (스캔본)',
      type: ArtifactType.REPORT,
      source: 'MANUAL_UPLOAD',
      accessClassification: AccessClassification.INTERNAL,
      uploadedById: ceoUser.id,
      status: ArtifactStatus.FLAGGED,
      version: 1,
      mimeType: 'application/pdf',
      fileName: '정책검토회의록_2024Q2.pdf',
    },
  });

  console.log('✅ Created demo artifacts');

  // Link artifacts to evidence requirements
  await Promise.all([
    prisma.artifactEvidenceRequirement.upsert({
      where: {
        artifactId_evidenceRequirementId: {
          artifactId: privacyPolicy.id,
          evidenceRequirementId: 'demo-er-privacy-policy',
        },
      },
      update: {},
      create: {
        artifactId: privacyPolicy.id,
        evidenceRequirementId: 'demo-er-privacy-policy',
        createdByUserId: ceoUser.id,
      },
    }),
    prisma.artifactEvidenceRequirement.upsert({
      where: {
        artifactId_evidenceRequirementId: {
          artifactId: vendorAgreement.id,
          evidenceRequirementId: 'demo-er-vendor-agreement',
        },
      },
      update: {},
      create: {
        artifactId: vendorAgreement.id,
        evidenceRequirementId: 'demo-er-vendor-agreement',
        createdByUserId: ceoUser.id,
      },
    }),
    prisma.artifactEvidenceRequirement.upsert({
      where: {
        artifactId_evidenceRequirementId: {
          artifactId: managementPlan.id,
          evidenceRequirementId: 'demo-er-mgmt-plan',
        },
      },
      update: {},
      create: {
        artifactId: managementPlan.id,
        evidenceRequirementId: 'demo-er-mgmt-plan',
        createdByUserId: ceoUser.id,
      },
    }),
    prisma.artifactEvidenceRequirement.upsert({
      where: {
        artifactId_evidenceRequirementId: {
          artifactId: trainingLog.id,
          evidenceRequirementId: 'demo-er-training',
        },
      },
      update: {},
      create: {
        artifactId: trainingLog.id,
        evidenceRequirementId: 'demo-er-training',
        createdByUserId: ceoUser.id,
      },
    }),
    prisma.artifactEvidenceRequirement.upsert({
      where: {
        artifactId_evidenceRequirementId: {
          artifactId: accessLog.id,
          evidenceRequirementId: 'demo-er-access',
        },
      },
      update: {},
      create: {
        artifactId: accessLog.id,
        evidenceRequirementId: 'demo-er-access',
        createdByUserId: ceoUser.id,
      },
    }),
    // Note: reviewMeeting intentionally NOT linked to demo audit failure scenario
  ]);
  console.log('✅ Linked artifacts to evidence requirements');

  // Seed document extractions for contradiction detection using Prisma ORM
  await prisma.documentExtraction.createMany({
    data: [
      // Privacy Policy: 보관기간 3년
      {
        artifactId: privacyPolicy.id,
        version: 3,
        extractedText: `개인정보처리방침

넥스트솔루션 (주)는 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (개인정보의 처리 목적)
넥스트솔루션 (주)는 다음의 목적을 위하여 개인정보를 처리합니다.

제2조 (개인정보의 처리 및 보유기간)
① 넥스트솔루션 (주)는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
② 개인정보 보관기간: 수집일로부터 3년

제6조 (개인정보의 파기절차 및 방법)
① 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
② 파기방법: 전자적 파일 형태의 정보는 복구 불가능한 방법으로 즉시 삭제합니다.`,
        method: 'PDF_TEXT',
        wordCount: 250,
      },
      // Vendor Agreement: 보관기간 5년 (contradiction!)
      {
        artifactId: vendorAgreement.id,
        version: 1,
        extractedText: `개인정보 처리 위탁계약서

위탁자: 넥스트솔루션 (주)
수탁자: 클라우드서비스 주식회사

제1조 (위탁 업무의 내용)
위탁자는 다음의 업무를 수탁자에게 위탁합니다.
- 클라우드 서버 호스팅 및 데이터 저장
- 백업 및 복구 서비스

제3조 (개인정보의 보유 및 파기)
① 수탁자는 위탁업무 종료 후에도 개인정보를 5년간 보관합니다.
② 보관기간: 계약 종료 후 5년
③ 파기: 보관기간 종료 후 30일 이내에 파기

제5조 (손해배상)
수탁자가 이 계약에 따른 의무를 위반하여 위탁자 또는 정보주체에게 손해가 발생한 경우, 수탁자는 그 손해를 배상하여야 합니다.`,
        method: 'DOCX_TEXT',
        wordCount: 180,
      },
      // Internal Management Plan: 파기 30일 유예 (another contradiction!)
      {
        artifactId: managementPlan.id,
        version: 1,
        extractedText: `개인정보 내부관리계획

넥스트솔루션 (주)

제1장 총칙
제1조 (목적)
이 계획은 개인정보보호법 시행령 제30조에 따라 넥스트솔루션 (주)의 개인정보 보호 및 관리에 관한 사항을 정함을 목적으로 합니다.

제4장 개인정보취급자 교육
제10조 (교육 실시)
① 개인정보취급자에 대한 정보보호 교육을 반기 1회 이상 실시합니다.
② 교육 주기: 반기별 (연 2회)
③ 교육 내용: 개인정보보호법령, 내부관리계획, 정보보안 인식

제7장 개인정보의 파기
제18조 (파기 절차)
① 개인정보 보유기간이 경과한 경우, 정당한 사유가 없는 한 보유기간 종료일로부터 30일 이내에 파기합니다.
② 파기 방법: 30일 유예 후 복구 불가능한 방법으로 삭제`,
        method: 'PDF_TEXT',
        wordCount: 220,
      },
      // Training Log: 교육주기 연1회 (contradiction with mgmt plan!)
      {
        artifactId: trainingLog.id,
        version: 1,
        extractedText: `개인정보보호 교육실시대장 2024

교육 실시 현황

1. 교육 일자: 2024-03-15
   교육 주제: 개인정보보호법 개정사항
   참석자: 45명 / 85명 (참석률 53%)
   교육 시간: 2시간
   교육 주기: 연1회

비고: 전 직원 대상 교육 미완료
      추가 교육 일정 수립 필요`,
        method: 'XLSX_TEXT',
        wordCount: 80,
      },
      // Access Log
      {
        artifactId: accessLog.id,
        version: 1,
        extractedText: `접근권한관리대장

넥스트솔루션 (주) 개인정보 접근권한 관리 현황

권한 부여 이력:
1. 2024-01-02 | 김철수 | 인사팀 | 직원정보 조회 | 승인: 인사팀장
2. 2024-01-15 | 이영희 | 개발팀 | 고객DB 읽기 | 승인: 보안담당자
3. 2024-02-01 | 박민수 | 영업팀 | 고객정보 조회 | 승인: 영업팀장

권한 말소 이력:
1. 2024-02-28 | 최지원 | 퇴직 | 전체 권한 말소

최종 점검일: 2024-11-30
점검자: 정보보호담당자`,
        method: 'XLSX_TEXT',
        wordCount: 120,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeded document extractions for contradiction detection');

  // Create tenant plan
  await prisma.tenantPlan.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      tier: 'GROWTH',
      maxObligations: 50,
      maxIntegrations: 5,
      maxPacksPerMonth: 20,
      maxStorageGB: 50,
      maxRetentionDays: 2555,
      maxUsers: 50,
      obligationsUsed: 1,
      integrationsUsed: 1,
      packsGeneratedThisMonth: 0,
      storageUsedGB: 0.5,
    },
  });
  console.log('✅ Created tenant plan');

  console.log('\n=====================================');
  console.log('🎉 CEO Demo Seed Complete!');
  console.log('=====================================\n');
  console.log('📝 Demo Login:');
  console.log('   Email: ceo@nextsolution.kr');
  console.log('   Password: Demo2024!');
  console.log('\n📋 Planted Contradictions:');
  console.log('   1. 보관기간: 3년 (개인정보처리방침) vs 5년 (위탁계약서)');
  console.log('   2. 교육주기: 반기 (내부관리계획) vs 연1회 (교육실시대장)');
  console.log('   3. 파기방법: 즉시삭제 (개인정보처리방침) vs 30일유예 (내부관리계획)');
  console.log('\n📋 Audit Simulation Expected:');
  console.log('   Q1-Q3: PASS (개인정보처리방침, 위탁계약서, 내부관리계획)');
  console.log('   Q4: WARN (교육실시대장 - 미완료)');
  console.log('   Q5: FAIL (정책검토회의록 - 미연결)\n');
}

main()
  .catch((e) => {
    console.error('❌ Demo seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
