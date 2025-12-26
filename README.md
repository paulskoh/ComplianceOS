# ComplianceOS (Bam)

**The AI-Powered Inspection Readiness Platform for Korean SMEs**

ComplianceOS (internally: Bam) is a production-grade, multi-tenant B2B SaaS platform that transforms how Korean SMEs manage regulatory compliance. Instead of scrambling before audits, organizations maintain continuous readiness through automated evidence collection, real-time gap analysis, and one-click audit package generation. The system covers HR/Labor (근로기준법), Privacy (개인정보보호법), Finance, Contracts, Security, and Training domains.

---

## How Bam Works (System Loop)

Bam follows a 6-step compliance lifecycle that runs continuously:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BAM COMPLIANCE LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. INGEST        2. INTERPRET       3. MAP           4. EVALUATE          │
│   ─────────        ───────────        ────           ──────────             │
│   Documents &      AI classifies      Link evidence   Identify gaps,        │
│   evidence flow    document types     to controls &   missing evidence,     │
│   into system      and extracts       obligations     stale records         │
│                    metadata                                                 │
│                                                                             │
│   5. EXPLAIN                          6. REMEDIATE                          │
│   ─────────                           ────────────                          │
│   Surface gaps in dashboard           Assign tasks, track fixes,            │
│   with severity scores and            generate audit-ready packages         │
│   actionable recommendations          when ready                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step Details:

1. **Ingest**: Evidence enters via manual upload, automated HR system sync, or cloud storage integration
2. **Interpret**: Documents are classified (policy, training record, contract, etc.) with metadata extraction
3. **Map**: Evidence is linked to specific controls and regulatory obligations
4. **Evaluate**: The system scores each obligation, identifies gaps (missing/stale evidence), and calculates readiness
5. **Explain**: Dashboard surfaces risks by severity (CRITICAL/HIGH/MEDIUM/LOW) with recommended actions
6. **Remediate**: Users address gaps via tasks; when ready, generate inspection packs for auditors

---

## Role of AI in Bam

### What AI Decides vs. Assists

| Capability | AI Role | Human Role |
|------------|---------|------------|
| Document Classification | AI suggests document type | User confirms or corrects |
| Metadata Extraction | AI extracts dates, parties, values | User verifies critical fields |
| Gap Identification | AI identifies missing evidence | System auto-detects gaps |
| Risk Scoring | Deterministic algorithm | No AI - rule-based scoring |
| Remediation Actions | AI suggests next steps | User decides and executes |
| Control Mapping | Template-based matching | Admin configures mappings |

### Confidence Scoring (Planned)

- Document classification will include confidence scores (0-100%)
- Low-confidence classifications are flagged for human review
- High-confidence items can be auto-processed in production mode

### Human Override & Audit Safety

- All AI-generated classifications are logged in immutable audit trail
- Users can override any AI decision with audit record
- Exception requests require human approval
- No fully autonomous compliance decisions - humans remain in control

---

## Demo vs. Production Notes

### What is Real (Production-Ready)

- Multi-tenant authentication with JWT
- Full RBAC (7 roles: SUPER_ADMIN, ORG_ADMIN, COMPLIANCE_MANAGER, etc.)
- Evidence upload and storage (MinIO/S3)
- Obligation and control framework management
- Readiness scoring algorithm (gap-based deductions)
- Inspection pack generation (PDF + manifest + ZIP)
- Immutable audit logging
- Database seeding with Korean regulatory templates

### What is Mocked/Simulated

- AI document classification (returns basic classification, no ML model)
- OCR/text extraction (uses pdf-parse, falls back to mock if unavailable)
- HR system integrations (simulates payroll/attendance data sync)
- Google Drive integration (connector stub, needs OAuth setup)
- Email notifications (logging only in development)

### Demo Mode Behavior

When running locally with `make dev`:
- Seeded with "Demo Company" tenant and sample data
- Korean regulatory templates pre-loaded (PIPA, Labor Standards)
- Sample artifacts linked to controls
- One open risk item for demonstration

---

## Quick Start

### Prerequisites

- Node.js 18+ (required)
- Docker & Docker Compose (for PostgreSQL, Redis, MinIO)
- npm 9+

### One-Command Setup

```bash
# Clone and setup
git clone https://github.com/paulskoh/ComplianceOS.git
cd ComplianceOS

# Copy environment template
cp .env.example .env

# Install dependencies
make install

# Start infrastructure (PostgreSQL, Redis, MinIO)
make docker-up

# Initialize database and seed data
make db-migrate
make db-seed

# Start development servers
make dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Web UI | http://localhost:3000 | admin@example.com / Admin123! |
| API | http://localhost:3001 | - |
| API Docs (Swagger) | http://localhost:3001/api | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

### Verify Installation

After `make dev`, you should see:
1. Web UI loads with login page
2. After login, Executive Overview shows readiness score
3. Navigation works for all dashboard pages

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- React Query for server state
- Tailwind CSS
- TanStack Table for data grids

**Backend:**
- NestJS (Node.js framework)
- PostgreSQL + Prisma ORM (48 models)
- Redis for caching
- MinIO (S3-compatible object storage)
- JWT + Argon2 authentication
- OpenAPI/Swagger for API docs

**Infrastructure:**
- Docker Compose for local development
- Turbo monorepo for workspace management
- Multi-tenant architecture with tenant isolation

---

## Project Structure

```
ComplianceOS/
├── apps/
│   ├── web/                 # Next.js frontend (14 dashboard pages)
│   └── api/                 # NestJS backend (24 controllers, 38 services)
├── packages/
│   ├── shared/              # TypeScript schemas & types
│   └── compliance-content/  # YAML regulatory templates
├── infra/
│   └── docker-compose.yml   # PostgreSQL, Redis, MinIO
├── docs/
│   ├── architecture.md      # System design
│   ├── api.md               # API reference
│   └── threat-model.md      # Security analysis
├── .env.example             # Environment template
├── Makefile                 # Development commands
└── turbo.json               # Monorepo config
```

---

## Available Commands

```bash
# Development
make install       # Install all dependencies
make dev           # Start all dev servers
make docker-up     # Start Docker services
make docker-down   # Stop Docker services

# Database
make db-migrate    # Run Prisma migrations
make db-seed       # Seed sample data
make db-studio     # Open Prisma Studio (DB browser)

# Build & Test
make build         # Build for production
make test          # Run tests
make lint          # Run linter
```

---

## Key Flows

1. **Onboarding**: Create company profile with industry, headcount, data types
2. **Obligations**: View and manage regulatory requirements by domain
3. **Controls**: Configure preventive/detective/corrective controls
4. **Evidence**: Upload and link artifacts to controls/obligations
5. **Readiness**: Real-time score with gap analysis
6. **Inspection Packs**: Generate audit-ready packages

---

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api.md)
- [Threat Model & Security](docs/threat-model.md)
- [Executive Brief](EXECUTIVE_BRIEF.md)
- [Demo Script](DEMO_SCRIPT.md)

---

## License

Proprietary - All rights reserved
