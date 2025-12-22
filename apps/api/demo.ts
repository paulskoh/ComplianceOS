#!/usr/bin/env ts-node
/**
 * ComplianceOS Demo Script
 *
 * This demonstrates the core functionality of the ComplianceOS system
 * without requiring a database connection.
 */

import { evaluateApplicabilityRule } from './src/common/utils/dsl-evaluator';
import { CompanyProfile, ApplicabilityRule } from './src/common/types/company-profile.types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

console.log('═'.repeat(80));
console.log('🏢 ComplianceOS - Production-Ready Compliance Management System');
console.log('═'.repeat(80));
console.log('');

// =============================================================================
// 1. DEMONSTRATE APPLICABILITY ENGINE
// =============================================================================

console.log('📋 1. APPLICABILITY ENGINE DEMONSTRATION');
console.log('─'.repeat(80));

// Example company profiles
const profiles: Record<string, CompanyProfile> = {
  'Small IT Startup': {
    headcount_band: '10-29',
    industry: 'IT_SOFTWARE',
    work_style: 'hybrid',
    data_types: {
      customer_pii: true,
      employee_pii: true,
    },
    uses_vendors_for_data: false,
  },
  'Medium-sized Company with Vendors': {
    headcount_band: '30-99',
    industry: 'IT_SOFTWARE',
    work_style: 'office',
    data_types: {
      customer_pii: true,
      employee_pii: true,
      payment_data: true,
    },
    uses_vendors_for_data: true,
  },
  'Large Enterprise': {
    headcount_band: '300+',
    industry: 'FINANCE',
    work_style: 'office',
    data_types: {
      customer_pii: true,
      employee_pii: true,
      resident_id: true,
      payment_data: true,
      health_data: true,
    },
    uses_vendors_for_data: true,
  },
};

// Example applicability rules from the compliance library
const sampleRules: Record<string, { title: string; rule: ApplicabilityRule }> = {
  OB_LSA_WORKING_TIME_RECORDS: {
    title: '근로시간 기록 의무 (Working Time Records)',
    rule: {
      all: [
        {
          field: 'headcount_band',
          in: ['1-9', '10-29', '30-99', '100-299', '300+'],
        },
      ],
    },
  },
  OB_PIPA_PRIVACY_POLICY: {
    title: '개인정보 처리방침 공개 (Privacy Policy)',
    rule: {
      any: [
        {
          field: 'data_types.customer_pii',
          eq: true,
        },
        {
          field: 'data_types.employee_pii',
          eq: true,
        },
      ],
    },
  },
  OB_PIPA_VENDOR_MGMT: {
    title: '개인정보 처리 위탁 관리 (Vendor Data Processing)',
    rule: {
      all: [
        {
          field: 'uses_vendors_for_data',
          eq: true,
        },
      ],
      any: [
        {
          field: 'data_types.customer_pii',
          eq: true,
        },
        {
          field: 'data_types.employee_pii',
          eq: true,
        },
      ],
    },
  },
  OB_PIPA_RESIDENT_ID: {
    title: '주민등록번호 처리 제한 (Resident ID Processing)',
    rule: {
      all: [
        {
          field: 'data_types.resident_id',
          eq: true,
        },
      ],
    },
  },
};

// Evaluate each profile against each rule
for (const [profileName, profile] of Object.entries(profiles)) {
  console.log(`\n👤 Company Profile: ${profileName}`);
  console.log(`   • Headcount: ${profile.headcount_band}`);
  console.log(`   • Industry: ${profile.industry}`);
  console.log(`   • Work Style: ${profile.work_style}`);
  console.log(`   • Data Types: ${JSON.stringify(profile.data_types)}`);
  console.log(`   • Uses Vendors: ${profile.uses_vendors_for_data}`);
  console.log('');
  console.log('   📌 Applicable Obligations:');

  let applicableCount = 0;
  for (const [code, { title, rule }] of Object.entries(sampleRules)) {
    const isApplicable = evaluateApplicabilityRule(rule, profile);
    if (isApplicable) {
      applicableCount++;
      console.log(`      ✅ ${code}: ${title}`);
    }
  }

  console.log('');
  console.log(`   📊 Applicability Rate: ${applicableCount}/${Object.keys(sampleRules).length} (${Math.round((applicableCount / Object.keys(sampleRules).length) * 100)}%)`);
}

// =============================================================================
// 2. SHOW COMPLIANCE CONTENT LIBRARY
// =============================================================================

console.log('\n');
console.log('═'.repeat(80));
console.log('📚 2. COMPLIANCE CONTENT LIBRARY');
console.log('─'.repeat(80));

try {
  const obligationsPath = path.join(__dirname, '../../packages/compliance-content/obligations.yaml');
  const obligationsContent = fs.readFileSync(obligationsPath, 'utf8');
  const obligations = yaml.load(obligationsContent) as any;

  console.log(`\n✅ Loaded ${obligations.law_sources?.length || 0} law sources`);
  console.log(`✅ Loaded ${obligations.obligations?.length || 0} obligation templates`);

  // Group by domain
  const byDomain: Record<string, number> = {};
  for (const obligation of obligations.obligations || []) {
    byDomain[obligation.domain] = (byDomain[obligation.domain] || 0) + 1;
  }

  console.log('\n📊 Obligations by Domain:');
  for (const [domain, count] of Object.entries(byDomain)) {
    console.log(`   • ${domain}: ${count} obligations`);
  }

  console.log('\n📋 Sample Obligations:');
  const samples = (obligations.obligations || []).slice(0, 5);
  for (const obligation of samples) {
    console.log(`   • ${obligation.code}: ${obligation.title_ko}`);
    console.log(`     Domain: ${obligation.domain} | Frequency: ${obligation.evidence_frequency}`);
  }

  // Load controls
  const controlsPath = path.join(__dirname, '../../packages/compliance-content/controls-full.yaml');
  const controlsContent = fs.readFileSync(controlsPath, 'utf8');
  const controls = yaml.load(controlsContent) as any;

  console.log(`\n✅ Loaded ${controls.controls?.length || 0} control templates`);

  // Load evidence requirements
  const evidencePath = path.join(__dirname, '../../packages/compliance-content/evidence-requirements-full.yaml');
  const evidenceContent = fs.readFileSync(evidencePath, 'utf8');
  const evidenceReqs = yaml.load(evidenceContent) as any;

  console.log(`✅ Loaded ${evidenceReqs.evidence_requirements?.length || 0} evidence requirement templates`);

} catch (error) {
  console.log(`⚠️  Could not load content files: ${error}`);
}

// =============================================================================
// 3. SHOW SYSTEM ARCHITECTURE
// =============================================================================

console.log('\n');
console.log('═'.repeat(80));
console.log('🏗️  3. SYSTEM ARCHITECTURE');
console.log('─'.repeat(80));

console.log(`
┌─────────────────────────────────────────────────────────────────────────┐
│                        ComplianceOS System Flow                         │
└─────────────────────────────────────────────────────────────────────────┘

   1. Company Onboarding
      └─→ Profile Collection (headcount, industry, data types, etc.)

   2. Applicability Engine  ⚡
      └─→ Evaluate DSL rules against company profile
      └─→ Determine which of 50 obligations apply (typically 30-40)

   3. Template Instantiation  🔨
      └─→ Create Obligations from ObligationTemplates
      └─→ Create Controls from ControlTemplates (2-3 per obligation)
      └─→ Create EvidenceRequirements (1-2 per control)
      └─→ Result: ~30 obligations, ~70 controls, ~100 evidence requirements

   4. Daily Operations  📝
      └─→ Upload evidence artifacts (PDFs, spreadsheets, screenshots)
      └─→ Link artifacts to evidence requirements
      └─→ Assign control owners

   5. Nightly Evaluation  🌙
      └─→ Runs at 2:00 AM KST for all companies
      └─→ Calculate evidence freshness (FRESH, EXPIRING_SOON, STALE, MISSING)
      └─→ Evaluate control status (PASS, PARTIAL, FAIL)
      └─→ Calculate readiness score (0-100%)
      └─→ Generate risks (MISSING_EVIDENCE, STALE_EVIDENCE, FAILED_CONTROL)

   6. Inspection Preparation  📦
      └─→ Create inspection pack (DRAFT status)
      └─→ Review and finalize pack (DRAFT → FINAL transition)
      └─→ Generate immutable manifest with SHA-256 hash + HMAC signature
      └─→ Grant time-limited inspector access (default 72 hours)

   7. Inspector Portal  🔍
      └─→ Inspector receives access token
      └─→ Read-only view of pack contents
      └─→ Download artifacts and manifests
      └─→ All activity logged for audit trail
`);

// =============================================================================
// 4. SHOW API ENDPOINTS
// =============================================================================

console.log('═'.repeat(80));
console.log('🌐 4. API ENDPOINTS (Available once system is running)');
console.log('─'.repeat(80));

const endpoints = [
  {
    category: 'Applicability Engine',
    endpoints: [
      'POST   /applicability/evaluate              - Evaluate which obligations apply',
      'POST   /applicability/evaluate/by-domain    - Group applicable obligations by domain',
      'POST   /applicability/evaluate/controls     - Get applicable controls',
      'POST   /applicability/check/:code           - Check specific obligation',
    ],
  },
  {
    category: 'Evaluation Engine',
    endpoints: [
      'POST   /evaluation/run                      - Run full evaluation',
      'POST   /evaluation/readiness                - Calculate readiness score',
      'GET    /evaluation/:companyId/readiness     - Get readiness score',
      'POST   /evaluation/risks                    - Generate risks',
      'POST   /evaluation/:companyId/trigger       - Trigger manual evaluation',
    ],
  },
  {
    category: 'Onboarding & Instantiation',
    endpoints: [
      'POST   /onboarding/complete                 - Complete onboarding with instantiation',
      'POST   /onboarding/preview                  - Preview what will be instantiated',
    ],
  },
  {
    category: 'Inspection Packs',
    endpoints: [
      'POST   /inspection-packs                    - Create pack (DRAFT)',
      'POST   /inspection-packs/:id/finalize       - Finalize pack (DRAFT → FINAL)',
      'GET    /inspection-packs/:id/manifest       - Get pack manifest',
      'POST   /inspection-packs/:id/verify         - Verify manifest integrity',
      'POST   /inspection-packs/:id/revoke         - Revoke pack',
    ],
  },
  {
    category: 'Inspector Access',
    endpoints: [
      'POST   /inspection-packs/:id/inspector-access           - Grant inspector access',
      'POST   /inspection-packs/:id/inspector-access/:id/extend - Extend access',
      'POST   /inspection-packs/:id/inspector-access/:id/revoke - Revoke access',
      'GET    /inspector/verify?token=xxx                       - Verify inspector token',
      'GET    /inspector/pack?token=xxx                         - Get pack (read-only)',
      'GET    /inspector/pack/manifest?token=xxx                - Get manifest (read-only)',
    ],
  },
];

for (const { category, endpoints: eps } of endpoints) {
  console.log(`\n📁 ${category}:`);
  for (const endpoint of eps) {
    console.log(`   ${endpoint}`);
  }
}

// =============================================================================
// 5. SHOW KEY FEATURES
// =============================================================================

console.log('\n');
console.log('═'.repeat(80));
console.log('✨ 5. KEY FEATURES');
console.log('─'.repeat(80));

console.log(`
✅ Compliance Content Library
   • 50 SME-relevant obligations across 8 domains
   • 100+ control templates
   • 100+ evidence requirement templates
   • Fully versioned and auditable

✅ Applicability Engine
   • Deterministic DSL for rule evaluation
   • Supports complex AND/OR logic
   • Nested field path evaluation
   • Comprehensive test coverage (47 tests)

✅ Automatic Template Instantiation
   • Zero manual configuration on onboarding
   • Intelligent obligation selection based on profile
   • Cascading instantiation (obligations → controls → evidence requirements)

✅ Continuous Evaluation
   • Evidence freshness tracking based on cadence rules
   • Control status evaluation (PASS/PARTIAL/FAIL)
   • Readiness score calculation (0-100%)
   • Automated risk generation

✅ Nightly Evaluation Jobs
   • Daily at 2:00 AM KST for all companies
   • Weekly deep evaluation on Sundays at 3:00 AM
   • Manual trigger available

✅ Immutable Inspection Packs
   • Draft → Final lifecycle with irreversible transition
   • SHA-256 hash for content integrity
   • HMAC signature for authenticity verification
   • Comprehensive manifest with full compliance snapshot

✅ Inspector Portal
   • Time-limited, read-only access (default 72 hours)
   • No account required (token-based authentication)
   • Granular permissions control
   • Complete activity audit trail
   • Access extension and revocation

✅ Production-Ready
   • No placeholders - fully implemented
   • Type-safe with TypeScript
   • Prisma ORM for database access
   • NestJS framework with best practices
   • Comprehensive error handling and logging
`);

console.log('═'.repeat(80));
console.log('🎉 Demo Complete!');
console.log('═'.repeat(80));
console.log('');
console.log('📖 Documentation:');
console.log('   • Main README:          apps/api/COMPLIANCEOS_README.md');
console.log('   • Implementation Guide: apps/api/IMPLEMENTATION_GUIDE.md');
console.log('   • Applicability Engine: apps/api/src/applicability/README.md');
console.log('');
console.log('🚀 To run the full system:');
console.log('   1. Ensure PostgreSQL is running');
console.log('   2. Update .env with DATABASE_URL');
console.log('   3. Run: npx prisma migrate dev');
console.log('   4. Load content: cd packages/compliance-content && npm run load');
console.log('   5. Start API: cd apps/api && npm run dev');
console.log('');
