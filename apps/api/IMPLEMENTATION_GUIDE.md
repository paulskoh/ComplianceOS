# ComplianceOS Implementation Guide

This document provides technical details for developers working on ComplianceOS.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Systems](#core-systems)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Code Organization](#code-organization)
6. [Development Workflow](#development-workflow)
7. [Testing Strategy](#testing-strategy)

## Architecture Overview

ComplianceOS is built as a modular NestJS application with the following architectural patterns:

- **Hexagonal Architecture** - Core business logic isolated from infrastructure
- **Domain-Driven Design** - Modules organized by business domains
- **Event-Driven** - Scheduled jobs for async processing
- **Service Layer** - Business logic encapsulated in services
- **Repository Pattern** - Data access through Prisma ORM

### Module Structure

```
src/
├── applicability/       # Applicability engine (DSL evaluator)
│   ├── applicability.service.ts
│   ├── applicability.controller.ts
│   ├── applicability.module.ts
│   └── README.md
├── evaluation/          # Evaluation engine (pass/fail, freshness, risks)
│   ├── evaluation.service.ts
│   ├── evaluation-scheduler.service.ts
│   ├── evaluation.controller.ts
│   └── evaluation.module.ts
├── onboarding/          # Onboarding & template instantiation
│   ├── onboarding.service.ts
│   ├── template-instantiation.service.ts
│   ├── onboarding.controller.ts
│   └── onboarding.module.ts
├── inspection-packs/    # Inspection packs & inspector mode
│   ├── inspection-packs.service.ts
│   ├── pack-generator.service.ts
│   ├── pack-manifest.service.ts
│   ├── inspector-access.service.ts
│   ├── inspection-packs.controller.ts
│   ├── inspector.controller.ts
│   └── inspection-packs.module.ts
├── common/
│   ├── types/
│   │   └── company-profile.types.ts
│   └── utils/
│       └── dsl-evaluator.ts
└── prisma/
    ├── schema.prisma
    └── migrations/
```

## Core Systems

### 1. Applicability Engine

**Location:** `src/applicability/`

**Purpose:** Determine which compliance obligations apply to a company based on their profile.

**Key Components:**

**DSL Evaluator** (`src/common/utils/dsl-evaluator.ts`):
```typescript
export function evaluateApplicabilityRule(
  rule: ApplicabilityRule | null,
  profile: CompanyProfile,
): boolean {
  if (!rule) return true; // Null rule = applies to all

  let allResult = true;
  let anyResult = false;

  // Evaluate ALL conditions (AND logic)
  if (rule.all) {
    allResult = rule.all.every(condition =>
      evaluateFieldCondition(condition, profile)
    );
  }

  // Evaluate ANY conditions (OR logic)
  if (rule.any) {
    anyResult = rule.any.some(condition =>
      evaluateFieldCondition(condition, profile)
    );
  }

  // Combine: must satisfy both ALL and ANY if both exist
  return rule.all && rule.any
    ? allResult && anyResult
    : rule.all
      ? allResult
      : anyResult;
}
```

**Field Condition Evaluation:**
```typescript
function evaluateFieldCondition(
  condition: FieldCondition,
  profile: CompanyProfile,
): boolean {
  const value = getNestedValue(profile, condition.field);

  if ('in' in condition) {
    return condition.in.includes(value);
  }

  if ('eq' in condition) {
    return value === condition.eq;
  }

  return false;
}
```

**Applicability Service** (`applicability.service.ts`):
```typescript
async evaluateApplicability(
  profile: CompanyProfile,
): Promise<ApplicabilityResult> {
  // 1. Fetch all active obligation templates
  const obligations = await this.prisma.obligationTemplate.findMany({
    where: { isActive: true },
  });

  // 2. Evaluate each obligation's applicability rule
  const applicableObligations = [];
  for (const obligation of obligations) {
    const rule = obligation.applicabilityRule as ApplicabilityRule;
    if (evaluateApplicabilityRule(rule, profile)) {
      applicableObligations.push(obligation);
    }
  }

  // 3. Return results
  return {
    profile,
    applicableObligations,
    totalObligations: obligations.length,
    applicableCount: applicableObligations.length,
    applicabilityRate: (applicableObligations.length / obligations.length) * 100,
  };
}
```

### 2. Template Instantiation

**Location:** `src/onboarding/template-instantiation.service.ts`

**Purpose:** Create company-specific Obligations, Controls, and EvidenceRequirements from templates.

**Process Flow:**

```typescript
async instantiateTemplatesForCompany(
  companyId: string,
  profile: CompanyProfile,
): Promise<InstantiationResult> {
  // 1. Determine applicable obligations
  const applicabilityResult =
    await this.applicabilityService.evaluateApplicability(profile);

  // 2. For each applicable obligation:
  for (const applicableObligation of applicabilityResult.applicableObligations) {
    // 2a. Create Obligation instance
    const obligation = await this.prisma.obligation.create({
      data: {
        companyId,
        code: obligationTemplate.code,
        title: obligationTemplate.title,
        // ... other fields
      },
    });

    // 2b. Fetch control templates for this obligation
    const controlTemplates = await this.prisma.controlTemplate.findMany({
      where: { obligationCode: obligationTemplate.code },
    });

    // 2c. For each control template:
    for (const controlTemplate of controlTemplates) {
      // Create Control instance
      const control = await this.prisma.control.create({
        data: {
          companyId,
          obligationId: obligation.id,
          code: controlTemplate.code,
          // ... other fields
        },
      });

      // 2d. Fetch evidence requirement templates for this control
      const evidenceReqTemplates =
        await this.prisma.evidenceRequirementTemplate.findMany({
          where: { controlCode: controlTemplate.code },
        });

      // 2e. For each evidence requirement template:
      for (const evidenceReqTemplate of evidenceReqTemplates) {
        // Create EvidenceRequirement instance
        await this.prisma.evidenceRequirement.create({
          data: {
            companyId,
            controlId: control.id,
            name: evidenceReqTemplate.name,
            // ... other fields
          },
        });
      }
    }
  }

  return { obligationsCreated, controlsCreated, evidenceRequirementsCreated };
}
```

### 3. Evaluation Engine

**Location:** `src/evaluation/evaluation.service.ts`

**Purpose:** Calculate compliance readiness, evidence freshness, and risks.

**Evidence Freshness Calculation:**

```typescript
calculateEvidenceFreshness(
  uploadedAt: Date | null,
  cadenceType: string,
  cadenceMonths: number | null,
): {
  freshness: EvidenceFreshness;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
} {
  if (!uploadedAt) {
    return { freshness: EvidenceFreshness.MISSING, ... };
  }

  // Calculate expiry date based on cadence
  let expiresAt: Date;
  switch (cadenceType) {
    case 'CONTINUOUS':
    case 'MONTHLY':
      expiresAt = addMonths(uploadedAt, 1);
      break;
    case 'QUARTERLY':
      expiresAt = addMonths(uploadedAt, 3);
      break;
    case 'ANNUAL':
      expiresAt = addYears(uploadedAt, 1);
      break;
    case 'ON_CHANGE':
      return { freshness: EvidenceFreshness.FRESH, ... };
    default:
      expiresAt = addMonths(uploadedAt, cadenceMonths || 1);
  }

  // Calculate days until expiry
  const daysUntilExpiry = differenceInDays(expiresAt, now);

  // Determine freshness
  if (daysUntilExpiry < 0) {
    return { freshness: EvidenceFreshness.STALE, ... };
  } else if (daysUntilExpiry <= 7) {
    return { freshness: EvidenceFreshness.EXPIRING_SOON, ... };
  } else {
    return { freshness: EvidenceFreshness.FRESH, ... };
  }
}
```

**Control Evaluation:**

```typescript
async evaluateControl(
  companyId: string,
  controlId: string,
): Promise<ControlEvaluation> {
  // 1. Fetch control with evidence requirements
  const control = await this.prisma.control.findUnique({
    where: { id: controlId },
    include: {
      evidenceRequirements: {
        include: {
          artifacts: {
            where: { companyId },
            orderBy: { uploadedAt: 'desc' },
            take: 1, // Get most recent artifact
          },
        },
      },
    },
  });

  // 2. Evaluate each evidence requirement
  const evidenceEvaluations = [];
  let freshCount = 0;

  for (const evidenceReq of control.evidenceRequirements) {
    const latestArtifact = evidenceReq.artifacts[0];
    const { freshness, expiresAt, daysUntilExpiry } =
      this.calculateEvidenceFreshness(
        latestArtifact?.uploadedAt,
        evidenceReq.cadenceRule.type,
        evidenceReq.cadenceRule.reviewMonths,
      );

    evidenceEvaluations.push({
      evidenceId: evidenceReq.id,
      freshness,
      expiresAt,
      daysUntilExpiry,
    });

    if (freshness === EvidenceFreshness.FRESH) {
      freshCount++;
    }
  }

  // 3. Determine overall control status
  const totalRequired = control.evidenceRequirements.length;
  const passRate = (freshCount / totalRequired) * 100;

  let status: ControlStatus;
  if (totalRequired === 0) {
    status = ControlStatus.NOT_EVALUATED;
  } else if (freshCount === totalRequired) {
    status = ControlStatus.PASS;
  } else if (freshCount === 0) {
    status = ControlStatus.FAIL;
  } else {
    status = ControlStatus.PARTIAL;
  }

  return { controlId, status, evidenceEvaluations, passRate };
}
```

**Readiness Score Calculation:**

```typescript
async calculateReadinessScore(companyId: string): Promise<ReadinessScore> {
  // 1. Fetch all obligations for the company
  const obligations = await this.prisma.obligation.findMany({
    where: { companyId },
  });

  // 2. Evaluate each obligation
  let passingObligations = 0;
  let partialObligations = 0;

  for (const obligation of obligations) {
    const evaluation = await this.evaluateObligation(companyId, obligation.id);

    if (evaluation.overallStatus === ControlStatus.PASS) {
      passingObligations++;
    } else if (evaluation.overallStatus === ControlStatus.PARTIAL) {
      partialObligations++;
    }
  }

  // 3. Calculate overall score (partial = 50% credit)
  const overall =
    ((passingObligations + partialObligations * 0.5) / obligations.length) * 100;

  return { overall, passingObligations, partialObligations, ... };
}
```

### 4. Nightly Evaluation Job

**Location:** `src/evaluation/evaluation-scheduler.service.ts`

**Purpose:** Automatically evaluate all companies every night.

**Implementation:**

```typescript
@Injectable()
export class EvaluationSchedulerService {
  @Cron('0 2 * * *', { timeZone: 'Asia/Seoul' })
  async runNightlyEvaluation() {
    // 1. Get all active companies
    const companies = await this.prisma.company.findMany();

    // 2. Evaluate each company
    for (const company of companies) {
      try {
        await this.evaluationService.runFullEvaluation(company.id);
      } catch (error) {
        this.logger.error(`Evaluation failed for ${company.id}:`, error);
      }
    }
  }

  @Cron('0 3 * * 0', { timeZone: 'Asia/Seoul' })
  async runWeeklyDeepEvaluation() {
    // Weekly deep checks on Sunday 3 AM
  }
}
```

### 5. Inspection Packs & Immutability

**Location:** `src/inspection-packs/pack-manifest.service.ts`

**Purpose:** Generate cryptographically verifiable, immutable inspection packs.

**Manifest Generation:**

```typescript
async generateManifest(
  packId: string,
  status: 'DRAFT' | 'FINAL',
): Promise<PackManifest> {
  // 1. Fetch pack data
  const pack = await this.prisma.inspectionPack.findUnique({
    where: { id: packId },
    include: { /* ... */ },
  });

  // 2. Build manifest
  const manifest = {
    version: '1.0.0',
    packId,
    status,
    obligations: [...],
    controls: [...],
    artifacts: [...],
    evaluation: {...},
    // ... other fields
  };

  // 3. Calculate SHA-256 hash
  const manifestContent = JSON.stringify(sortObjectKeys(manifest));
  const manifestHash = createHash('sha256')
    .update(manifestContent)
    .digest('hex');

  // 4. Generate HMAC signature (FINAL packs only)
  const signature = status === 'FINAL'
    ? createHmac('sha256', SECRET_KEY)
        .update(manifestContent)
        .digest('hex')
    : null;

  return { ...manifest, manifestHash, signature };
}
```

**Manifest Verification:**

```typescript
verifyManifest(manifest: PackManifest): { isValid: boolean; errors: string[] } {
  const errors = [];

  // 1. Verify hash
  const { manifestHash, signature, ...content } = manifest;
  const calculatedHash = createHash('sha256')
    .update(JSON.stringify(sortObjectKeys(content)))
    .digest('hex');

  if (calculatedHash !== manifestHash) {
    errors.push('Manifest hash mismatch - content has been tampered with');
  }

  // 2. Verify signature (FINAL packs)
  if (manifest.status === 'FINAL') {
    const calculatedSignature = createHmac('sha256', SECRET_KEY)
      .update(JSON.stringify(sortObjectKeys(content)))
      .digest('hex');

    if (calculatedSignature !== signature) {
      errors.push('Signature verification failed - pack may be forged');
    }
  }

  // 3. Verify artifact hashes
  const missingHashes = manifest.artifacts.filter(a => !a.sha256Hash);
  if (missingHashes.length > 0) {
    errors.push(`${missingHashes.length} artifacts missing SHA-256 hash`);
  }

  return { isValid: errors.length === 0, errors };
}
```

**Pack Finalization (DRAFT → FINAL):**

```typescript
async finalizePack(packId: string, userId: string): Promise<PackManifest> {
  const pack = await this.prisma.inspectionPack.findUnique({
    where: { id: packId }
  });

  if (pack.status === 'FINAL') {
    throw new Error('Pack is already final and cannot be modified');
  }

  // Generate FINAL manifest with signature
  const finalManifest = await this.generateManifest(packId, 'FINAL');

  // Update pack status (irreversible)
  await this.prisma.inspectionPack.update({
    where: { id: packId },
    data: {
      status: 'FINAL',
      finalizedAt: new Date(),
      finalizedById: userId,
      manifestHash: finalManifest.manifestHash,
      manifestSignature: finalManifest.signature,
    },
  });

  return finalManifest;
}
```

### 6. Inspector Access Mode

**Location:** `src/inspection-packs/inspector-access.service.ts`

**Purpose:** Provide time-limited, read-only access to external auditors.

**Grant Access:**

```typescript
async grantInspectorAccess(
  packId: string,
  inspectorEmail: string,
  inspectorName: string,
  inspectorOrganization: string,
  expiresInHours: number = 72,
): Promise<InspectorAccess> {
  // 1. Verify pack is FINAL
  const pack = await this.prisma.inspectionPack.findUnique({
    where: { id: packId },
  });

  if (pack.status !== 'FINAL') {
    throw new Error('Only FINAL packs can be shared with inspectors');
  }

  // 2. Generate secure token
  const token = randomBytes(32).toString('hex');

  // 3. Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // 4. Create access record
  const access = await this.prisma.inspectorAccess.create({
    data: {
      packId,
      token,
      inspectorEmail,
      inspectorName,
      inspectorOrganization,
      expiresAt,
      isActive: true,
      permissions: {
        canViewPack: true,
        canDownloadArtifacts: true,
        canViewManifest: true,
        canExportReport: true,
      },
    },
  });

  return access;
}
```

**Verify Access:**

```typescript
async verifyInspectorAccess(token: string): Promise<InspectorAccess> {
  const access = await this.prisma.inspectorAccess.findUnique({
    where: { token },
  });

  if (!access) {
    throw new UnauthorizedException('Invalid inspector access token');
  }

  if (!access.isActive) {
    throw new UnauthorizedException('Inspector access has been revoked');
  }

  if (new Date() > access.expiresAt) {
    throw new UnauthorizedException('Inspector access has expired');
  }

  // Log access for audit trail
  await this.logInspectorActivity(access.id, 'ACCESS_VERIFIED');

  return access;
}
```

## Database Schema

### Templates (Compliance Library)

```prisma
model ObligationTemplate {
  id               String   @id @default(uuid())
  code             String   @unique
  title            String
  titleKo          String
  domain           ObligationDomain
  applicabilityRule Json?   // DSL rule
  isActive         Boolean  @default(true)
  version          Int      @default(1)
}

model ControlTemplate {
  id               String   @id @default(uuid())
  code             String   @unique
  obligationCode   String
  name             String
  controlType      String
  automationLevel  String
  isActive         Boolean  @default(true)
}

model EvidenceRequirementTemplate {
  id           String   @id @default(uuid())
  controlCode  String
  name         String
  cadenceRule  Json     // { type: "MONTHLY", reviewMonths: 1 }
  retentionRule Json?   // { minYears: 3, triggerEvent: "..." }
  isMandatory  Boolean
  evidenceType String
}
```

### Company-Specific Instances

```prisma
model Obligation {
  id          String   @id @default(uuid())
  companyId   String
  code        String
  title       String
  titleKo     String
  domain      ObligationDomain
  severity    String
  status      String
  controls    Control[]
}

model Control {
  id                     String   @id @default(uuid())
  companyId              String
  obligationId           String
  code                   String
  name                   String
  controlType            String
  implementationStatus   String
  evidenceRequirements   EvidenceRequirement[]
}

model EvidenceRequirement {
  id           String   @id @default(uuid())
  companyId    String
  controlId    String
  name         String
  cadenceRule  Json
  retentionRule Json?
  isMandatory  Boolean
  evidenceType String
  artifacts    Artifact[]
}

model Artifact {
  id                     String   @id @default(uuid())
  companyId              String
  evidenceRequirementId  String?
  name                   String
  fileName               String
  fileSize               Int
  mimeType               String
  sha256Hash             String
  uploadedAt             DateTime
  s3Key                  String
}
```

### Inspection Packs

```prisma
model InspectionPack {
  id                String   @id @default(uuid())
  companyId         String
  status            String   // DRAFT, FINAL, REVOKED
  domain            String
  startDate         DateTime
  endDate           DateTime
  manifestHash      String?
  manifestSignature String?
  createdAt         DateTime
  finalizedAt       DateTime?
  finalizedById     String?
  revokedAt         DateTime?
  artifacts         PackArtifact[]
  inspectorAccesses InspectorAccess[]
}

model InspectorAccess {
  id                       String   @id @default(uuid())
  packId                   String
  token                    String   @unique
  inspectorEmail           String
  inspectorName            String
  inspectorOrganization    String
  expiresAt                DateTime
  isActive                 Boolean
  permissions              Json
  createdAt                DateTime
  revokedAt                DateTime?
  activityLogs             InspectorActivityLog[]
}

model InspectorActivityLog {
  id                 String   @id @default(uuid())
  inspectorAccessId  String
  activityType       String
  metadata           Json?
  occurredAt         DateTime
}
```

## Development Workflow

### Adding a New Obligation

1. **Update YAML:**
```yaml
# packages/compliance-content/obligations.yaml
- code: OB_NEW_OBLIGATION
  title: "New Obligation Title"
  titleKo: "새로운 의무사항"
  domain: LABOR
  applicability_rule:
    all:
      - field: headcount_band
        in: ["10-29", "30-99"]
```

2. **Create Controls:**
```yaml
# packages/compliance-content/controls-full.yaml
- code: CTRL_NEW_01
  obligation_code: OB_NEW_OBLIGATION
  name: "Control for New Obligation"
  control_type: PREVENTIVE
  automation_level: SEMI_AUTOMATED
```

3. **Create Evidence Requirements:**
```yaml
# packages/compliance-content/evidence-requirements-full.yaml
- control_code: CTRL_NEW_01
  name: "Evidence for Control"
  cadence_rule:
    type: MONTHLY
    review_months: 1
  is_mandatory: true
  evidence_type: DOCUMENT
```

4. **Load Templates:**
```bash
cd packages/compliance-content
npm run load
```

5. **Test Applicability:**
```bash
POST /applicability/evaluate
{
  "headcount_band": "10-29"
}
# Should include OB_NEW_OBLIGATION
```

### Adding a New API Endpoint

1. **Create DTO:**
```typescript
// src/module/dto/my-action.dto.ts
export class MyActionDto {
  @IsNotEmpty()
  @IsString()
  param1: string;
}
```

2. **Add Service Method:**
```typescript
// src/module/module.service.ts
async performAction(param1: string) {
  // Business logic
  return result;
}
```

3. **Add Controller Endpoint:**
```typescript
// src/module/module.controller.ts
@Post('action')
async action(@Body() dto: MyActionDto) {
  return this.service.performAction(dto.param1);
}
```

4. **Test:**
```bash
POST /module/action
{
  "param1": "value"
}
```

## Testing Strategy

### Unit Tests

Test business logic in isolation:

```typescript
// evaluation.service.spec.ts
describe('EvaluationService', () => {
  it('should calculate evidence freshness correctly', () => {
    const { freshness } = service.calculateEvidenceFreshness(
      new Date('2025-01-01'),
      'MONTHLY',
      1,
    );
    expect(freshness).toBe(EvidenceFreshness.STALE);
  });
});
```

### Integration Tests

Test API endpoints:

```typescript
// evaluation.e2e-spec.ts
describe('Evaluation E2E', () => {
  it('/evaluation/run (POST)', () => {
    return request(app.getHttpServer())
      .post('/evaluation/run')
      .send({ companyId: 'test_company' })
      .expect(200)
      .expect((res) => {
        expect(res.body.readinessScore).toBeDefined();
      });
  });
});
```

---

This guide covers the core implementation details. For deployment, see DEPLOYMENT.md.
