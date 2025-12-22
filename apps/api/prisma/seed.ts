import { PrismaClient, ObligationDomain, ControlType, AutomationLevel, ArtifactType, AccessClassification, RiskSeverity } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      businessNumber: '123-45-67890',
      industry: 'Technology',
      headcount: 50,
      isActive: true,
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create admin user
  const passwordHash = await argon2.hash('Admin123!');
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ORG_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create obligation templates
  const obligationTemplates = await Promise.all([
    prisma.obligationTemplate.create({
      data: {
        title: 'Labor Standards - Overtime Management',
        titleKo: '근로기준법 - 연장근로 관리',
        description: 'Requirement to track and approve overtime work, ensuring compliance with maximum working hours and proper compensation.',
        descriptionKo: '연장근로를 추적하고 승인하여, 최대 근로시간 준수 및 적절한 보상을 보장해야 합니다.',
        domain: ObligationDomain.LABOR,
        evidenceFrequency: 'MONTHLY',
        severity: RiskSeverity.HIGH,
      },
    }),
    prisma.obligationTemplate.create({
      data: {
        title: 'Personal Information Protection - Consent Management',
        titleKo: '개인정보보호법 - 동의 관리',
        description: 'Requirement to obtain and document user consent for personal information collection and processing.',
        descriptionKo: '개인정보 수집 및 처리에 대한 사용자 동의를 획득하고 문서화해야 합니다.',
        domain: ObligationDomain.PRIVACY,
        evidenceFrequency: 'ON_CHANGE',
        severity: RiskSeverity.CRITICAL,
      },
    }),
    prisma.obligationTemplate.create({
      data: {
        title: 'Financial Documentation - Expense Records',
        titleKo: '재무 증빙 - 비용 기록',
        descriptionKo: '모든 사업 비용을 적절히 문서화하고 기록을 보관해야 합니다.',
        description: 'Requirement to maintain proper expense documentation and receipts for tax compliance.',
        domain: ObligationDomain.FINANCE,
        evidenceFrequency: 'MONTHLY',
      },
    }),
  ]);
  console.log('✅ Created obligation templates');

  // Create obligations
  const obligations = await Promise.all([
    prisma.obligation.create({
      data: {
        tenantId: tenant.id,
        templateId: obligationTemplates[0].id,
        title: obligationTemplates[0].title,
        titleKo: obligationTemplates[0].titleKo,
        description: obligationTemplates[0].description,
        domain: obligationTemplates[0].domain,
        evidenceFrequency: obligationTemplates[0].evidenceFrequency,
        ownerId: admin.id,
        isActive: true,
      },
    }),
    prisma.obligation.create({
      data: {
        tenantId: tenant.id,
        templateId: obligationTemplates[1].id,
        title: obligationTemplates[1].title,
        titleKo: obligationTemplates[1].titleKo,
        description: obligationTemplates[1].description,
        domain: obligationTemplates[1].domain,
        evidenceFrequency: obligationTemplates[1].evidenceFrequency,
        ownerId: admin.id,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Created obligations');

  // Create controls
  const controls = await Promise.all([
    prisma.control.create({
      data: {
        tenantId: tenant.id,
        name: 'Overtime Approval Workflow',
        description: 'Automated workflow requiring manager approval for all overtime work before it occurs.',
        type: ControlType.PREVENTIVE,
        automationLevel: AutomationLevel.SEMI_AUTOMATED,
        ownerId: admin.id,
        isActive: true,
        obligations: {
          create: [{ obligationId: obligations[0].id }],
        },
        evidenceRequirements: {
          create: [
            {
              name: 'Monthly Overtime Approval Records',
              description: 'Export of all overtime approvals from HR system',
              freshnessWindowDays: 30,
              required: true,
            },
          ],
        },
      },
    }),
    prisma.control.create({
      data: {
        tenantId: tenant.id,
        name: 'User Consent Tracking System',
        description: 'System to track and store user consent records with timestamps and IP addresses.',
        type: ControlType.DETECTIVE,
        automationLevel: AutomationLevel.FULLY_AUTOMATED,
        ownerId: admin.id,
        isActive: true,
        obligations: {
          create: [{ obligationId: obligations[1].id }],
        },
        evidenceRequirements: {
          create: [
            {
              name: 'Consent Logs',
              description: 'Database export of all user consent records',
              freshnessWindowDays: 7,
              required: true,
            },
          ],
        },
      },
    }),
  ]);
  console.log('✅ Created controls');

  // Create sample artifacts
  const artifacts = await Promise.all([
    prisma.artifact.create({
      data: {
        tenantId: tenant.id,
        name: 'October 2024 Overtime Report',
        description: 'Monthly report of overtime hours and approvals',
        type: ArtifactType.REPORT,
        source: 'HR System Export',
        accessClassification: AccessClassification.INTERNAL,
        retentionDays: 2555, // 7 years
        uploadedById: admin.id,
        hash: 'abc123...',
        controls: {
          create: [{ controlId: controls[0].id }],
        },
        obligations: {
          create: [{ obligationId: obligations[0].id }],
        },
      },
    }),
    prisma.artifact.create({
      data: {
        tenantId: tenant.id,
        name: 'User Consent Database Export',
        description: 'Complete export of user consent records',
        type: ArtifactType.EXPORT,
        source: 'Application Database',
        accessClassification: AccessClassification.PII,
        retentionDays: 1825, // 5 years
        uploadedById: admin.id,
        hash: 'def456...',
        controls: {
          create: [{ controlId: controls[1].id }],
        },
        obligations: {
          create: [{ obligationId: obligations[1].id }],
        },
      },
    }),
  ]);
  console.log('✅ Created artifacts');

  // Create sample risks
  const risks = await Promise.all([
    prisma.riskItem.create({
      data: {
        tenantId: tenant.id,
        title: 'Missing Overtime Approvals',
        description: 'Found 3 instances of overtime work without prior approval in September',
        severity: RiskSeverity.HIGH,
        status: 'OPEN',
        obligationId: obligations[0].id,
        controlId: controls[0].id,
        ownerId: admin.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    }),
  ]);
  console.log('✅ Created risks');

  // Create integration
  const integration = await prisma.integration.create({
    data: {
      tenantId: tenant.id,
      name: 'Manual Upload',
      type: 'MANUAL_UPLOAD',
      config: {},
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created integration');

  // Create tenant plan
  const tenantPlan = await prisma.tenantPlan.create({
    data: {
      tenantId: tenant.id,
      tier: 'GROWTH',
      maxObligations: 50,
      maxIntegrations: 3,
      maxPacksPerMonth: 10,
      maxStorageGB: 20,
      maxRetentionDays: 1825, // 5 years
      maxUsers: 20,
      obligationsUsed: 2,
      integrationsUsed: 1,
      packsGeneratedThisMonth: 0,
      storageUsedGB: 0.1,
    },
  });
  console.log('✅ Created tenant plan:', tenantPlan.tier);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
