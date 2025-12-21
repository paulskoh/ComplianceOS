# ComplianceOS

**Inspection Readiness & Evidence System for Korean SMEs**

ComplianceOS is a production-grade, multi-tenant B2B SaaS platform that helps Korean SMEs maintain continuous compliance across HR/Payroll, Privacy, Finance, Contracts, Security, and Training domains.

## Features

- **Readiness Dashboard**: Real-time compliance score and risk visibility
- **Obligation Management**: Pre-loaded templates for Korean regulations (근로기준법, 개인정보보호법, etc.)
- **Control Framework**: Preventive, detective, and corrective controls with evidence requirements
- **Evidence Repository**: Automated collection, classification, and retention
- **Workflow Automation**: Approval flows, exceptions, and remediation tasks
- **Inspection Pack Generation**: One-click audit-ready packages with PDF summaries and signed manifests
- **Integration Framework**: Connectors for HR systems, cloud storage, and SaaS tools
- **Audit Trail**: Immutable logging of all compliance-critical actions

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm 9+

### Installation

```bash
# Install dependencies
make install

# Start Docker services (PostgreSQL, Redis, MinIO)
make docker-up

# Run database migrations
make db-migrate

# Seed with sample data
make db-seed

# Start development servers
make dev
```

The application will be available at:
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

### Default Login

```
Email: admin@example.com
Password: Admin123!
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- React Query
- Tailwind CSS + shadcn/ui
- TanStack Table

**Backend:**
- NestJS
- PostgreSQL + Prisma ORM
- Redis + BullMQ
- MinIO (S3-compatible storage)
- JWT Authentication

**Infrastructure:**
- Docker Compose (local dev)
- Multi-tenant architecture
- RBAC with granular permissions

## Project Structure

```
/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types and schemas
├── infra/
│   └── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── threat-model.md
│   └── api.md
└── Makefile
```

## Available Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev           # Start development
make build         # Build for production
make test          # Run tests
make db-migrate    # Run migrations
make db-seed       # Seed database
make db-studio     # Open Prisma Studio
make docker-up     # Start Docker services
make docker-down   # Stop Docker services
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Threat Model & Security](docs/threat-model.md)
- [API Documentation](docs/api.md)

## License

Proprietary - All rights reserved
