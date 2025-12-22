# ComplianceOS Testing Guide

## System Overview

ComplianceOS is an Inspection Readiness & Evidence System for Korean compliance. It automatically:
- Activates legal obligations based on company profile
- Detects compliance gaps in real-time
- Auto-collects evidence from integrated systems
- Generates inspection-ready evidence packs

## Quick Start

### 1. Start Development Servers

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3001/api
- **Web**: http://localhost:3000
- **API Docs**: http://localhost:3001/api/docs

### 2. Database Setup

The database already has:
- ✅ 18 obligation templates (labor, privacy, contracts, security, training)
- ✅ Schema with all models migrated
- ✅ Enum values fixed (EvidenceFrequency: ANNUAL, ON_CHANGE, etc.)

### 3. Test the System

#### Step 1: Complete Onboarding
1. Navigate to http://localhost:3000/onboarding
2. Fill out the company profile form:
   - Company Name: "Test Company"
   - Industry: TECHNOLOGY
   - Employees: 50
   - Check boxes for:
     - ✅ Has remote workers
     - ✅ Employees work overtime
     - ✅ Uses contractors
     - ✅ Works with vendors
   - Data types: Select "Employee Data", "Customer Data", "Resident Numbers"
   - Has international transfer: ✅ Yes

3. Click "Complete Setup"

**Expected Result**: System will activate ~10+ obligations based on your profile:
- Labor law obligations (if overtime/contractors selected)
- Privacy obligations (based on data types)
- Vendor management obligations (if vendors selected)
- Security obligations (if certain data types selected)

#### Step 2: View Dashboard
1. Navigate to http://localhost:3000/dashboard
2. See your **Readiness Score** (will show gaps if obligations activated)
3. View **Domain Performance** breakdown

**Expected Result**:
- If obligations activated but no controls/evidence: Score ~40-60
- Domain breakdown shows scores by compliance area

#### Step 3: Check Gap Analysis
1. Navigate to http://localhost:3000/dashboard/readiness
2. View all detected compliance gaps
3. Filter by severity (Critical, High, Medium, Low)

**Expected Gap Types**:
- **NO_CONTROL**: Obligations without any controls defined
- **MISSING_EVIDENCE**: Controls without evidence artifacts
- **OUTDATED_EVIDENCE**: Evidence older than required frequency
- **UNAPPROVED_EXCEPTION**: Exceptions pending approval

#### Step 4: View Activated Obligations
1. Navigate to http://localhost:3000/dashboard/obligations
2. See list of activated obligations
3. Click each to view:
   - Korean and English titles
   - Description
   - Associated controls
   - Evidence requirements
   - Activation details

**Expected Result**: Only obligations relevant to your company profile are shown.

## Key Features Implemented

### Backend (NestJS API)

#### 1. Obligation Activation Engine
- **File**: `apps/api/src/onboarding/onboarding.service.ts`
- **Activation Rules**: 18 pre-defined rules mapping company profile to obligations
- **Auto-Control Creation**: Automatically creates control templates when obligations activate

**Example Activation Rules**:
```typescript
{
  templateId: 'labor_overtime_approval',
  condition: (profile) => profile.hasOvertimeWork,
  reason: '연장근로가 있으므로 사전 승인 의무 발생',
  autoCreateControls: true,
}
```

#### 2. Gap Detection Algorithm
- **File**: `apps/api/src/readiness/readiness.service.ts`
- **Detection Logic**:
  - Scans all active obligations
  - Checks for missing controls
  - Validates evidence freshness based on frequency
  - Auto-generates risk items for critical gaps

**Scoring Algorithm**:
- Base score: 100
- Critical gap: -15 points
- High gap: -8 points
- Medium gap: -3 points
- Low gap: -1 point

**Readiness Levels**:
- EXCELLENT: 90-100
- GOOD: 75-89
- FAIR: 60-74
- POOR: 40-59
- CRITICAL: 0-39

#### 3. Workflow Execution Engine
- **File**: `apps/api/src/workflows/workflow-execution.service.ts`
- **Step Types**: APPROVAL, NOTIFICATION, TASK_CREATION, CONDITION
- **SLA Monitoring**: Auto-escalates approvals pending >48 hours

#### 4. Integration Auto-Sync
- **File**: `apps/api/src/integrations/sync.service.ts`
- **Cron Job**: Runs every hour
- **Supported Integrations**:
  - HR_SYSTEM (payroll, attendance)
  - TIME_TRACKING (overtime approvals)
  - GOOGLE_DRIVE (document sync)
- **Auto-Artifact Creation**: Creates evidence artifacts automatically

### Frontend (Next.js)

#### 1. Dashboard
- Real-time readiness score
- Domain performance breakdown
- Loading states with skeleton screens

#### 2. Gap Analysis Page
- Filterable gap list
- Severity statistics
- Actionable recommendations

#### 3. Obligations Page
- Master-detail view
- Shows controls and evidence requirements
- Highlights gaps (missing controls)

#### 4. Onboarding Page
- Multi-step company profile form
- Triggers obligation activation on submit

## API Endpoints

### Onboarding
- `POST /api/onboarding/complete` - Complete onboarding and activate obligations
- `GET /api/onboarding/profile` - Get current company profile

### Readiness
- `GET /api/readiness/score` - Get readiness score and breakdown
- `GET /api/readiness/gaps` - Get detailed gap analysis

### Obligations
- `GET /api/obligations` - Get all obligations (filtered by tenant)
- `POST /api/obligations` - Create new obligation

### Workflows
- `GET /api/workflows` - Get all workflow definitions
- `POST /api/workflows/:id/start` - Start workflow execution
- `POST /api/workflows/executions/:id/approve` - Process approval

### Integrations
- `GET /api/integrations` - Get all integrations
- `POST /api/integrations/:id/sync` - Manual sync trigger
- `GET /api/integrations/:id/sync-status` - Get sync status

## Database Schema

### Key Models

**CompanyProfile**
- Stores company characteristics for obligation activation
- Fields: industry, employeeCount, hasRemoteWork, hasOvertimeWork, dataTypes, etc.

**ObligationTemplate**
- Library of pre-defined legal requirements
- 18 templates covering Korean labor, privacy, contract, security, training laws

**Obligation**
- Activated instance of a template for a specific tenant
- Links to controls and evidence requirements

**Control**
- Preventive or detective measures to satisfy obligations
- Links to artifacts (evidence)

**GapDetection**
- Auto-detected compliance gaps
- Types: NO_CONTROL, MISSING_EVIDENCE, OUTDATED_EVIDENCE, UNAPPROVED_EXCEPTION

**WorkflowExecution**
- Running instance of a workflow
- Tracks current step, status, context

## Troubleshooting

### Backend Errors

**"Cannot read properties of undefined (reading 'findMany')"**
- **Fix**: Ensure SyncService is registered in IntegrationsModule
- **Status**: ✅ Fixed in latest commit

### Frontend Errors

**"__webpack_modules__[moduleId] is not a function"**
- **Cause**: Next.js dev server hot reload issue
- **Fix**: `rm -rf apps/web/.next && npm run build`
- **Status**: ✅ Resolved (production build works)

### Database Errors

**"Invalid value for EvidenceFrequency"**
- **Fix**: Use ANNUAL (not ANNUALLY), ON_CHANGE (not AS_NEEDED)
- **Status**: ✅ Fixed in seed-templates.ts

## Next Steps

### Pending Features (Phase 5)

**Exception Tracking with Approval Workflow**:
- Allow users to request exceptions to obligations
- Route through approval workflow
- Track approved exceptions separately from gaps

### Future Enhancements

1. **Real Integration Connectors**:
   - Google Drive API integration
   - Korean HR systems (Flex, Jobplanet)
   - Time tracking systems

2. **AI-Powered Gap Recommendations**:
   - Suggest controls for obligations without controls
   - Recommend evidence collection strategies

3. **Inspection Pack Generation**:
   - One-click evidence pack download
   - Organized by inspector questions
   - PDF/ZIP export with Korean labels

4. **Mobile App**:
   - iOS/Android for evidence collection
   - Photo capture with metadata
   - Push notifications for due evidence

## Architecture Notes

### Tech Stack
- **Backend**: NestJS, Prisma, PostgreSQL, Redis
- **Frontend**: Next.js 14, React, TailwindCSS, Axios
- **Infrastructure**: Docker Compose (local dev)
- **Storage**: MinIO (S3-compatible)

### Design Patterns
- **Multi-tenant B2B**: Tenant isolation on all queries
- **RBAC**: 7 roles (SUPER_ADMIN, ORG_ADMIN, COMPLIANCE_MANAGER, etc.)
- **Event Sourcing**: Immutable audit logs
- **Workflow Engine**: State machine pattern
- **Cron Jobs**: Scheduled auto-sync, SLA monitoring, gap detection

### Security
- JWT authentication with refresh tokens
- Password hashing with argon2
- Tenant isolation at database level
- Role-based access control

---

Built with ❤️ using Claude Code
