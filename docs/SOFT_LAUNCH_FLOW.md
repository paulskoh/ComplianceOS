# ComplianceOS Soft Launch Flow

## Overview

ComplianceOS is a Korean SME compliance management SaaS focused on labor law (PIPA) and data privacy regulations. This document describes the golden path user journey for soft launch.

## Golden Path

The canonical user journey follows this flow:

```
/ (Landing) → /register → /onboarding → /dashboard → /dashboard/evidence → /dashboard/readiness → /dashboard/inspection-packs
```

### 1. Public/Auth Routes

| Route | Purpose | Endpoint Called |
|-------|---------|-----------------|
| `/` | Landing page with links to register/login | None |
| `/register` | New user registration | `POST /api/auth/register` |
| `/login` | User authentication | `POST /api/auth/login` |

**Registration Flow:**
1. User fills out: firstName, lastName, email, password, organizationName
2. Password requirements: 8+ chars, uppercase, lowercase, number, special char
3. On success: auto-login and redirect to `/onboarding`

**Login Flow:**
1. Email/password authentication
2. Token stored in localStorage as `accessToken`
3. User data stored as `user`
4. Redirect to `/dashboard`

### 2. Onboarding (`/onboarding`)

**Purpose:** Collect company profile to determine applicable regulations.

**Endpoint:** `POST /api/onboarding/complete`

**Fields Collected:**
- Company name
- Industry (enum: TECH, MANUFACTURING, RETAIL, etc.)
- Employee count
- Remote work (boolean)
- Overtime work (boolean)
- Contractors (boolean)
- Vendors (boolean)
- Data types handled (array)
- International data transfer (boolean)

**What happens on complete:**
1. Company profile saved
2. PIPA content pack automatically applied
3. Obligations, controls, and evidence requirements created for tenant
4. User redirected to `/dashboard`

### 3. Dashboard (`/dashboard`)

**Purpose:** Executive overview and workflow guidance.

**What's Displayed:**
- **Workflow Progress:** Guides users through setup steps
- **Active Packs:** Shows applied compliance packs (PIPA)
- **Evidence Progress:** Shows X/Y evidence submitted with CTA
- **Readiness Score:** 0-100 score with level badge
- **Domain Breakdown:** Per-domain compliance scores
- **Immediate Attention:** Gaps and open risks

**Endpoints Called:**
- `GET /api/onboarding/profile` - Check onboarding status
- `GET /api/evidence-requirements/overview` - Evidence stats
- `GET /api/frameworks` - Active packs
- `GET /api/readiness/score` - Compliance score
- `GET /api/readiness/gaps` - Gap analysis
- `GET /api/risks` - Risk items
- `GET /api/inspection-packs` - Existing packs

### 4. Evidence Submission (`/dashboard/evidence`)

**Purpose:** Upload compliance evidence documents.

**List View Endpoints:**
- `GET /api/evidence-requirements/overview` - All requirements grouped by obligation

**Detail View (`/dashboard/evidence/[id]`):**
- `GET /api/evidence-requirements/:id` - Requirement details with artifacts

**Upload Flow:**
1. Click "새 버전 업로드" (New Version Upload)
2. Select file (PDF, DOCX, XLSX, images, etc.)
3. `POST /api/artifacts/upload-intent` - Get presigned URL
4. Upload directly to S3
5. `POST /api/artifacts/finalize-upload` - Complete upload
6. System sets artifact status to READY
7. (Optional) AI analysis runs automatically

**Analysis Lifecycle States:**
```
PENDING → UPLOADED → ANALYZING → ANALYZED → APPROVED
                                    ↓
                              NEEDS_REVIEW
```

**Approval:**
- `POST /api/artifacts/:id/approve` - Mark as approved
- Approved artifacts are immutable
- Status changes from "검토중" to "승인완료"

### 5. Readiness (`/dashboard/readiness`)

**Purpose:** View compliance score and gaps.

**Endpoints:**
- `GET /api/readiness/score` - Overall score with breakdown
- `GET /api/readiness/gaps` - List of compliance gaps

**Score Levels:**
- EXCELLENT (90-100): 감사 준비 완료
- GOOD (75-89): 양호
- FAIR (60-74): 주의 필요
- POOR (40-59): 조치 필요
- CRITICAL (0-39): 긴급 조치

### 6. Inspection Packs (`/dashboard/inspection-packs`)

**Purpose:** Generate audit-ready document packages.

**Endpoints:**
- `GET /api/inspection-packs` - List existing packs
- `POST /api/inspection-packs` - Create new pack
- `GET /api/inspection-packs/:id/download-urls` - Get download links

**Pack Contents:**
- Cover page (manifest)
- All approved evidence artifacts
- SHA-256 hashes for verification

### 7. Compliance Packs / Frameworks (`/dashboard/frameworks`)

**Purpose:** View applicable regulations and control requirements.

**Endpoints:**
- `GET /api/frameworks` - List applied frameworks
- `GET /api/frameworks/:code` - Framework details with domains

**Currently Supported:**
- PIPA (Personal Information Protection Act - Korea)

## Authentication & Authorization

### Auth Guard
Dashboard routes are protected by a client-side guard in `/dashboard/layout.tsx`:

1. Check for `accessToken` in localStorage
2. If missing → redirect to `/login`
3. Call `GET /api/onboarding/profile` to verify completion
4. If no profile → redirect to `/onboarding`
5. If profile exists → render dashboard

### Token Refresh
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- 401 responses trigger logout and redirect

## Environment Variables

### Frontend (apps/web/.env)
```
NEXT_PUBLIC_API_URL=http://localhost:3002/api
NEXT_PUBLIC_DEMO_MODE=false  # Set to 'true' to show demo credentials on login
```

### Backend (apps/api/.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_ARTIFACTS=evidence-artifacts
S3_BUCKET_PACKS=inspection-packs
```

## "Done" Criteria

A user has successfully completed the golden path when:

1. **Registered:** Account created, email verified (if required)
2. **Onboarded:** Company profile saved, PIPA pack applied
3. **Evidence Uploaded:** At least one artifact submitted to an evidence requirement
4. **Evidence Approved:** Artifact marked as approved
5. **Readiness Viewed:** Dashboard shows non-zero score
6. **Pack Generated:** At least one inspection pack created

## UI Language

The product is primarily in Korean for SME users:
- Navigation labels in Korean
- Status messages in Korean
- Help text in Korean
- API responses include Korean fields (`titleKo`, `descriptionKo`, etc.)

## Testing Checklist

- [ ] `/register` creates user and redirects to `/onboarding`
- [ ] `/login` authenticates and redirects to `/dashboard`
- [ ] Dashboard requires authentication (redirects if not logged in)
- [ ] Dashboard requires onboarding (redirects if not complete)
- [ ] Workflow progress shows correct step status
- [ ] Evidence upload creates artifact
- [ ] Artifact approval changes status to VERIFIED
- [ ] Readiness score reflects uploaded/approved evidence
- [ ] Sidebar has no broken links (no 404s)
- [ ] No hardcoded demo credentials visible (unless DEMO_MODE=true)
