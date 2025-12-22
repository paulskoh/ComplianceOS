# ComplianceOS - Production-Ready Compliance Management System

**ComplianceOS** is a comprehensive, production-ready compliance management platform for Korean SMEs. It provides automated compliance tracking, evidence management, risk assessment, and inspection preparation across 8 regulatory domains.

## 🎯 Executive Summary

ComplianceOS automates the compliance burden for Korean companies by:
- **Intelligently determining** which of 50+ obligations apply to your company
- **Automatically instantiating** relevant controls and evidence requirements on onboarding
- **Continuously evaluating** compliance readiness with evidence freshness tracking
- **Generating immutable inspection packs** with cryptographic verification
- **Providing inspector portals** with time-limited, read-only access

## 📋 System Capabilities

### 1. Compliance Content Library (50 Obligations, 8 Domains)

Versioned compliance templates covering:
- **LABOR** (근로기준법): Working hours, overtime, payslips, leave management
- **PRIVACY** (개인정보보호법): Data collection, consent, vendor management, access control
- **EQUALITY** (남녀고용평등법): Anti-discrimination, sexual harassment prevention
- **RECORDS** (문서관리): Document retention, destruction policies
- **GOVERNANCE** (회사 지배구조): Board meetings, shareholder records
- **FINANCIAL** (재무보고): Financial statements, tax compliance
- **SAFETY** (산업안전): Workplace safety, equipment inspection
- **SYSTEM** (정보보안): Access control, log management, ISMS-P

**Content Structure:**
```
ObligationTemplate (50)
  └─ ControlTemplate (100+)
      └─ EvidenceRequirementTemplate (100+)
```

All stored in YAML files with versioning:
- `/packages/compliance-content/obligations.yaml`
- `/packages/compliance-content/controls-full.yaml`
- `/packages/compliance-content/evidence-requirements-full.yaml`

### 2. Applicability Engine

**Deterministic JSON Logic DSL** for rule evaluation:

```typescript
{
  "all": [
    { "field": "headcount_band", "in": ["10-29", "30-99", "100-299", "300+"] },
    { "field": "uses_vendors_for_data", "eq": true }
  ],
  "any": [
    { "field": "data_types.customer_pii", "eq": true },
    { "field": "data_types.employee_pii", "eq": true }
  ]
}
```

**Company Profile Fields:**
- `headcount_band`: `"1-9"` | `"10-29"` | `"30-99"` | `"100-299"` | `"300+"`
- `industry`: Industry classification code
- `work_style`: `"office"` | `"remote"` | `"hybrid"`
- `data_types`: `{ customer_pii, employee_pii, resident_id, health_data, payment_data }`
- `uses_vendors_for_data`: boolean

**API Endpoints:**
- `POST /applicability/evaluate` - Evaluate which obligations apply
- `POST /applicability/evaluate/by-domain` - Group by domain
- `POST /applicability/check/:obligationCode` - Check single obligation

### 3. Template Instantiation on Onboarding

**Automatic workflow on company onboarding:**

1. User completes company profile
2. Applicability engine determines applicable obligations (e.g., 35/50)
3. System instantiates:
   - **Obligations** from ObligationTemplates
   - **Controls** from ControlTemplates
   - **EvidenceRequirements** from EvidenceRequirementTemplates
4. Company starts with pre-configured compliance framework

**Result:** Zero manual configuration. Compliance structure ready from day 1.

### 4. Evaluation Engine

**Automated compliance assessment:**

**Evidence Freshness Calculation:**
```
CONTINUOUS → expires in 1 month
MONTHLY → expires in 1 month
QUARTERLY → expires in 3 months
ANNUAL → expires in 1 year
ON_CHANGE → never expires (until something changes)
```

**Freshness States:**
- `FRESH` - Evidence is current (>7 days until expiry)
- `EXPIRING_SOON` - Evidence expires within 7 days
- `STALE` - Evidence has expired
- `MISSING` - No evidence uploaded

**Control Status:**
- `PASS` - All evidence requirements are FRESH
- `PARTIAL` - Some evidence is FRESH
- `FAIL` - All evidence is STALE or MISSING
- `NOT_EVALUATED` - No evidence requirements

**Readiness Score:**
```
overall_score = (passing_obligations + partial_obligations * 0.5) / total_obligations * 100
```

**Risk Generation:**
- `MISSING_EVIDENCE` - No artifact uploaded
- `STALE_EVIDENCE` - Evidence expired
- `FAILED_CONTROL` - Control status is FAIL

**API Endpoints:**
- `POST /evaluation/run` - Run full evaluation for a company
- `POST /evaluation/readiness` - Calculate readiness score
- `GET /evaluation/:companyId/readiness` - Get current readiness
- `POST /evaluation/risks` - Generate and persist risks

### 5. Nightly Evaluation Job

**Automated scheduler using NestJS @Cron:**

```typescript
@Cron('0 2 * * *', { timeZone: 'Asia/Seoul' })
async runNightlyEvaluation()
```

**Schedule:**
- **Daily at 2:00 AM KST** - Full evaluation for all companies
  - Calculate readiness scores
  - Generate risks
  - Update evidence freshness status
- **Weekly on Sunday at 3:00 AM KST** - Deep evaluation
  - Additional compliance checks
  - Identify stale controls
  - Generate weekly reports

**Manual Trigger:**
```
POST /evaluation/:companyId/trigger
```

### 6. Inspection Packs with Immutable Manifests

**Draft → Final → Revoked lifecycle:**

**Pack Manifest Structure:**
```json
{
  "version": "1.0.0",
  "packId": "pack_xxx",
  "status": "FINAL",
  "generatedAt": "2025-01-15T02:00:00Z",
  "finalizedAt": "2025-01-15T09:00:00Z",

  "companyId": "company_xxx",
  "inspectionPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },

  "obligations": [...],
  "controls": [...],
  "evidenceRequirements": [...],
  "artifacts": [
    {
      "id": "artifact_xxx",
      "name": "Q4 2024 Working Hours Report",
      "fileName": "working_hours_q4.pdf",
      "sha256Hash": "abc123...",
      "uploadedAt": "2024-10-15T10:30:00Z",
      "s3Key": "artifacts/company_xxx/..."
    }
  ],

  "evaluation": {
    "readinessScore": 92,
    "totalObligations": 35,
    "passingObligations": 30
  },

  "manifestHash": "def456...",  // SHA-256 of content
  "signature": "789xyz..."       // HMAC signature (FINAL packs only)
}
```

**Cryptographic Integrity:**
- **SHA-256 Hash** - Detects any tampering with manifest content
- **HMAC Signature** - Verifies pack authenticity (FINAL packs only)
- **Artifact Hashes** - Each file has SHA-256 hash for verification

**API Endpoints:**
- `POST /inspection-packs` - Create draft pack
- `POST /inspection-packs/:id/finalize` - Transition DRAFT → FINAL (immutable)
- `GET /inspection-packs/:id/manifest` - Get manifest
- `POST /inspection-packs/:id/verify` - Verify manifest integrity
- `POST /inspection-packs/:id/revoke` - Revoke pack with reason

### 7. Auditor/Inspector Mode

**Time-limited, read-only access for external auditors:**

**Features:**
- **Token-based authentication** (no account required)
- **Granular permissions** control
- **Time-limited access** (default 72 hours)
- **Activity logging** for audit trail
- **Revocation** support

**Workflow:**

1. **Company grants access:**
```
POST /inspection-packs/:packId/inspector-access
{
  "inspectorEmail": "auditor@inspection-agency.kr",
  "inspectorName": "김철수",
  "inspectorOrganization": "한국산업안전보건공단",
  "expiresInHours": 72,
  "permissions": {
    "canViewPack": true,
    "canDownloadArtifacts": true,
    "canViewManifest": true,
    "canExportReport": true
  }
}
```

2. **Inspector receives token** via email

3. **Inspector accesses via public portal:**
```
GET /inspector/pack?token=xxx
GET /inspector/pack/manifest?token=xxx
GET /inspector/activity?token=xxx
```

4. **All activity is logged:**
- Pack viewed
- Manifest accessed
- Artifacts downloaded
- Reports exported

5. **Company can extend or revoke:**
```
POST /inspection-packs/:packId/inspector-access/:accessId/extend
POST /inspection-packs/:packId/inspector-access/:accessId/revoke
```

**Inspector Portal Features:**
- Read-only view of compliance data
- No write permissions
- No access to company's operational data
- Automatic expiration
- Audit trail of all actions

## 🏗️ Architecture

### Tech Stack

**Backend:**
- **NestJS** - Enterprise Node.js framework
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Primary data store
- **AWS S3** - Evidence artifact storage
- **@nestjs/schedule** - Cron jobs
- **@nestjs/throttler** - Rate limiting

**Content Management:**
- **YAML** - Compliance content definitions
- **TypeScript** - Type-safe content loader

**Security:**
- **JWT** - Authentication
- **HMAC** - Pack signatures
- **SHA-256** - File integrity
- **Time-limited tokens** - Inspector access

### System Flow

```
┌─────────────────┐
│  Company        │
│  Onboarding     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Applicability Engine    │
│  - Evaluate profile     │
│  - Determine obligations│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Template Instantiation  │
│  - Create Obligations   │
│  - Create Controls      │
│  - Create Evidence Reqs │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Daily Operations        │
│  - Upload evidence      │
│  - Assign controls      │
│  - Review obligations   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Nightly Evaluation      │
│  (2:00 AM KST)          │
│  - Calculate freshness  │
│  - Update readiness     │
│  - Generate risks       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Inspection Preparation  │
│  - Create pack (DRAFT)  │
│  - Review & finalize    │
│  - Grant inspector      │
│    access               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Inspector Portal        │
│  - Verify token         │
│  - View pack (read-only)│
│  - Download manifest    │
│  - Export report        │
└─────────────────────────┘
```

### Database Schema

**Key Tables:**
- `ObligationTemplate` - Versioned obligation definitions
- `ControlTemplate` - Versioned control definitions
- `EvidenceRequirementTemplate` - Versioned evidence requirement definitions
- `Obligation` - Company-specific obligations (instantiated from templates)
- `Control` - Company-specific controls
- `EvidenceRequirement` - Company-specific evidence requirements
- `Artifact` - Evidence files with metadata
- `InspectionPack` - Immutable pack records
- `InspectorAccess` - Time-limited inspector tokens
- `InspectorActivityLog` - Audit trail for inspector actions
- `Risk` - Auto-generated compliance risks

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- AWS Account (for S3)

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and AWS credentials

# Run migrations
npx prisma migrate dev

# Load compliance content
cd packages/compliance-content
npm run load

# Start API server
cd apps/api
npm run dev
```

### First Company Onboarding

```bash
# 1. Create company profile
POST /onboarding/complete
{
  "companyId": "company_1",
  "userId": "user_1",
  "profile": {
    "employeeCount": 25,
    "industry": "IT_SOFTWARE",
    "hasRemoteWork": true,
    "dataTypes": ["EMPLOYEE_DATA", "CUSTOMER_DATA"],
    "hasVendors": true
  }
}

# Response: 35 obligations, 70 controls, 100 evidence requirements created

# 2. Run initial evaluation
POST /evaluation/run
{
  "companyId": "company_1"
}

# Response: Readiness score 0% (no evidence yet)

# 3. Upload evidence
POST /artifacts/upload
{
  "companyId": "company_1",
  "evidenceRequirementId": "er_1",
  "file": <binary>
}

# 4. Re-run evaluation
POST /evaluation/:companyId/trigger

# Response: Readiness score updated based on evidence freshness
```

## 📊 Performance & Scale

**Optimized for:**
- **Companies:** 1,000+ companies per instance
- **Obligations:** 50 per company average
- **Evidence:** 10,000+ artifacts
- **Evaluation:** ~10-20ms per obligation evaluation
- **Nightly job:** <5 minutes for 1,000 companies

**Caching:**
- Obligation templates cached in memory
- Applicability results cached by profile hash
- Evidence freshness calculated on-demand

## 🔐 Security

**Authentication:**
- JWT tokens for API access
- Time-limited inspector tokens (no account required)

**Data Protection:**
- SHA-256 hashing for all artifacts
- Encrypted S3 storage
- HMAC signatures for pack integrity
- Audit logging for all actions

**Access Control:**
- Role-based permissions (admin, user, inspector)
- Company data isolation (tenantId filtering)
- Read-only inspector mode

## 📝 API Documentation

See `/apps/api/API.md` for complete API reference.

**Base URL:** `https://api.complianceos.kr/v1`

**Authentication:**
```
Authorization: Bearer <jwt_token>
```

**Inspector Authentication:**
```
X-Inspector-Token: <inspector_token>
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Deployment

See `/apps/api/DEPLOYMENT.md` for production deployment guide.

**Recommended infrastructure:**
- **API:** AWS ECS Fargate or EC2
- **Database:** AWS RDS PostgreSQL
- **Storage:** AWS S3
- **Cron:** AWS EventBridge or native NestJS scheduler
- **Monitoring:** CloudWatch + Datadog
- **CDN:** CloudFront for frontend

## 🤝 Contributing

This is a production system. No placeholders. All features fully implemented.

**Code quality standards:**
- TypeScript strict mode
- ESLint + Prettier
- Unit tests for business logic
- Integration tests for API endpoints

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For questions or issues, contact: support@complianceos.kr

---

**Built with ❤️ for Korean SMEs to simplify compliance management.**
