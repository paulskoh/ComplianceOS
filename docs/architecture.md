# ComplianceOS Architecture

## System Overview

ComplianceOS is a production-grade, multi-tenant B2B SaaS platform designed to help Korean SMEs maintain continuous compliance across multiple regulatory domains.

## Architecture Principles

1. **Multi-Tenancy**: Strict tenant isolation at the database and application layer
2. **RBAC**: Role-based access control with granular permissions
3. **Auditability**: Immutable audit logging of all compliance-critical actions
4. **Scalability**: Designed for horizontal scaling with stateless API servers
5. **Security-First**: Defense in depth with encryption, authentication, and authorization

## Technology Stack

### Frontend
- **Next.js 14** (App Router) - React framework with server-side rendering
- **TypeScript** - Type safety across the application
- **React Query** - Server state management with caching
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Table** - Advanced table functionality

### Backend
- **NestJS** - Progressive Node.js framework
- **PostgreSQL** - Primary database with Prisma ORM
- **Redis** - Caching and background job queue
- **MinIO** (S3-compatible) - Object storage for evidence and packs
- **BullMQ** - Background job processing (planned)

### Infrastructure
- **Docker Compose** - Local development environment
- **Prisma** - Database ORM with migration support
- **JWT** - Stateless authentication
- **OpenAPI/Swagger** - API documentation

## System Components

### 1. Multi-Tenancy

Every domain entity includes a `tenantId` column. Tenant isolation is enforced at multiple layers:

- **Database Layer**: Prisma queries automatically filter by tenantId
- **API Layer**: Guards extract tenantId from JWT and inject into queries
- **Storage Layer**: S3 keys are prefixed with tenantId

```typescript
// Example: Prisma query with tenant isolation
await prisma.obligation.findMany({
  where: { tenantId: user.tenantId }
})
```

### 2. Authentication & Authorization

#### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates credentials using argon2 password hashing
3. Server generates JWT access token (15m) and refresh token (7d)
4. Client stores tokens and includes access token in Authorization header
5. JwtAuthGuard validates token on protected routes

#### Role-Based Access Control (RBAC)

**Roles**:
- `SUPER_ADMIN` - Platform-level administration
- `ORG_ADMIN` - Organization administrator
- `COMPLIANCE_MANAGER` - Manage obligations and controls
- `HR_MANAGER` - HR-specific compliance
- `SECURITY_MANAGER` - Security-specific compliance
- `AUDITOR` - Read-only access
- `CONTRIBUTOR` - Upload evidence and complete tasks

**Permission Enforcement**:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORG_ADMIN, UserRole.COMPLIANCE_MANAGER)
async createObligation() { }
```

### 3. Core Domain Model

#### Entities & Relationships

```
Tenant (1) -----> (*) User
Tenant (1) -----> (*) Obligation
Tenant (1) -----> (*) Control
Tenant (1) -----> (*) Artifact

Obligation (*) <-----> (*) Control (via ControlObligation)
Control (1) -----> (*) ControlEvidenceRequirement
Artifact (*) <-----> (*) Control (via ArtifactControl)
Artifact (*) <-----> (*) Obligation (via ArtifactObligation)
Artifact (1) -----> (1) ArtifactBinary

RiskItem (*) -----> (1) Obligation
RiskItem (*) -----> (1) Control
RiskItem (1) -----> (*) Task

InspectionPack (*) -----> (*) Artifact (via PackArtifact)
InspectionPack (1) -----> (*) PackShareLink
```

#### Key Concepts

**Obligations**: Regulatory requirements (e.g., "근로기준법 - 연장근로 관리")
- Domain-categorized (Labor, Privacy, Finance, etc.)
- Can be created from templates
- Assigned to owners

**Controls**: Mechanisms that prove compliance
- Types: Preventive, Detective, Corrective
- Mapped to obligations
- Define evidence requirements

**Artifacts**: Evidence items (logs, reports, documents)
- Stored in S3 with SHA-256 hash
- Linked to controls and obligations
- Soft-deleted with tombstone pattern
- Classified by access level

### 4. Evidence Management

#### Upload Flow
1. Client uploads file via multipart/form-data
2. Server generates unique S3 key: `{tenantId}/{timestamp}-{filename}`
3. File uploaded to MinIO with SHA-256 hash calculated
4. Artifact metadata created in database
5. Links to controls/obligations created
6. Audit log event recorded

#### Storage Structure
```
S3 Buckets:
  evidence-artifacts/
    {tenantId}/
      {timestamp}-{filename}

  inspection-packs/
    packs/{packId}/
      summary.pdf
      manifest.json
      evidence.zip
```

### 5. Inspection Pack Generation

#### Generation Flow
1. User creates pack with domain, date range, obligations
2. Pack record created with status=GENERATING
3. Background job queries relevant data:
   - Obligations in domain
   - Controls linked to those obligations
   - Artifacts created in date range
4. PDF summary generated using PDFKit
5. JSON manifest created with artifact metadata
6. ZIP bundle created with artifact files
7. All files uploaded to S3
8. Pack status updated to COMPLETED

#### Pack Components
- **Summary PDF**: Executive summary with obligations, controls, evidence count
- **Manifest JSON**: Structured metadata with hashes and timestamps
- **Evidence ZIP**: Actual artifact files organized by folder structure

### 6. Integration Framework

#### Connector Architecture
Each integration connector implements:
- `run(config)`: Execute the integration
- Return `{ artifactsCollected: number }`

#### Supported Integrations
- **Manual Upload**: Direct file upload (always available)
- **Google Drive**: OAuth-based sync from folders (connector stub)
- **Generic S3 Import**: Import from external S3 bucket (planned)

#### Integration Execution
```typescript
// 1. Create integration record
const integration = await prisma.integration.create({
  data: { tenantId, name, type, config, status: 'ACTIVE' }
})

// 2. Run integration (async)
const run = await prisma.integrationRun.create({
  data: { integrationId, status: 'RUNNING' }
})

// 3. Execute connector
const result = await connector.run(config)

// 4. Update run status
await prisma.integrationRun.update({
  where: { id: run.id },
  data: { status: 'COMPLETED', artifactsCollected: result.count }
})
```

### 7. Audit Logging

All compliance-critical actions are logged to an immutable audit log:

**Logged Events**:
- USER_LOGIN, USER_LOGOUT
- USER_CREATED, USER_UPDATED, USER_ROLE_CHANGED
- ARTIFACT_UPLOADED, ARTIFACT_DELETED, ARTIFACT_LINKED
- PACK_GENERATED, PACK_DOWNLOADED
- EXCEPTION_REQUESTED, EXCEPTION_APPROVED
- WORKFLOW_APPROVED
- POLICY_PUBLISHED, POLICY_ACKNOWLEDGED

**Log Structure**:
```typescript
{
  tenantId: string
  userId?: string
  eventType: AuditEventType
  resourceType?: string
  resourceId?: string
  metadata?: object
  ipAddress?: string
  userAgent?: string
  createdAt: timestamp
}
```

**Enforcement**: Audit logs are append-only (no updates or deletes allowed)

### 8. Readiness Scoring

Readiness score calculation:
```
Base Score: 100
Deductions:
  - Critical Risk (OPEN): -10 points each
  - High/Medium/Low Risk: -2 points each

Final Score: max(0, Base Score - Total Deductions)
```

Domain scores calculated independently for each ObligationDomain.

## API Design

### RESTful Endpoints

All endpoints follow REST conventions:
- `GET /api/{resource}` - List all
- `GET /api/{resource}/{id}` - Get one
- `POST /api/{resource}` - Create
- `PUT /api/{resource}/{id}` - Update
- `DELETE /api/{resource}/{id}` - Delete

### Authentication
All endpoints (except `/api/auth/*`) require Bearer token:
```
Authorization: Bearer {jwt-access-token}
```

### Response Format
```typescript
{
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

### Pagination
Paginated endpoints return:
```typescript
{
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

## Deployment Considerations

### Environment Variables
See `.env.example` for all required variables. Key settings:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST/PORT` - Redis connection
- `S3_ENDPOINT` - MinIO/S3 endpoint
- `JWT_SECRET` - JWT signing key (must be secure in production)

### Database Migrations
```bash
cd apps/api
npx prisma migrate dev      # Development
npx prisma migrate deploy   # Production
```

### Scaling Strategy
1. **API Servers**: Stateless, can be horizontally scaled
2. **Database**: Use read replicas for heavy read workloads
3. **Object Storage**: MinIO/S3 handles scaling natively
4. **Background Jobs**: Use BullMQ with Redis for distributed job processing

### Monitoring
Recommended observability:
- **Logs**: Structured JSON logging with pino/winston
- **Metrics**: OpenTelemetry + Prometheus
- **Tracing**: Distributed tracing for request flows
- **Alerts**: Monitor critical failures and SLA breaches

## Security Architecture

See [threat-model.md](./threat-model.md) for detailed security analysis.

## AI Architecture

### Where AI is Invoked

Bam uses AI at specific points in the compliance lifecycle:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        AI INVOCATION POINTS                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. DOCUMENT UPLOAD                    2. METADATA EXTRACTION              │
│  ──────────────────                    ────────────────────                 │
│  Input: Raw file (PDF/DOC/image)       Input: Extracted text               │
│  AI Action: Classify document type     AI Action: Extract dates, parties,  │
│  Output: Type + confidence score       values, key terms                   │
│                                        Output: Structured metadata         │
│                                                                            │
│  3. GAP ANALYSIS (Deterministic)       4. REMEDIATION SUGGESTIONS          │
│  ──────────────────────────────        ───────────────────────             │
│  Input: Evidence requirements          Input: Gap type + context           │
│  Rule Engine: Compare evidence         AI Action: Generate recommended     │
│  dates vs freshness windows            action in Korean                    │
│  Output: Gap list with severity        Output: Actionable next step        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### AI Components

| Component | Location | Model | Purpose |
|-----------|----------|-------|---------|
| DocumentClassifier | `apps/api/src/workers/` | OpenAI GPT-4 | Classify document types |
| MetadataExtractor | `apps/api/src/workers/` | OpenAI GPT-4 | Extract structured data |
| RecommendationEngine | `apps/api/src/readiness/` | Rule-based + AI | Generate action items |

### Current State (MVP)

- **Document Classification**: Basic type detection using file metadata
- **Metadata Extraction**: PDF text extraction via pdf-parse
- **Gap Analysis**: Fully deterministic (no AI needed)
- **Recommendations**: Template-based Korean text

### Production Roadmap

1. **Phase 1**: Integrate OpenAI for classification confidence scoring
2. **Phase 2**: Fine-tune extraction for Korean regulatory documents
3. **Phase 3**: Add vector search for similar evidence discovery
4. **Phase 4**: Predictive risk scoring based on historical patterns

### AI Boundaries

What AI **does NOT** do:
- Make final compliance decisions (human approval required)
- Auto-approve exceptions
- Delete or modify evidence
- Bypass RBAC permissions

All AI actions are:
- Logged to immutable audit trail
- Reversible by human override
- Transparent in confidence scores

## Future Enhancements

1. **Background Jobs**: Implement BullMQ for async pack generation and integrations
2. **OpenSearch**: Full-text search across evidence metadata
3. **SSO**: SAML/OIDC integration for enterprise customers
4. **Workflow Engine**: Temporal for complex approval workflows
5. **Real-time Updates**: WebSocket for live readiness score updates
6. **Mobile App**: React Native app for on-the-go compliance
7. **AI-Powered**: Automated risk detection and evidence classification
