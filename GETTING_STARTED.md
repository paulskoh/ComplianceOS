# Getting Started with ComplianceOS

This guide will help you get ComplianceOS running locally in minutes.

## Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))

Verify installations:
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
docker --version
```

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
cd ComplianceOS
npm install
```

This will install all dependencies for the monorepo (frontend, backend, and shared packages).

### 2. Set Up Environment

```bash
# Copy environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The default `.env` values are pre-configured for local development. No changes needed!

### 3. Start Infrastructure

Start PostgreSQL, Redis, and MinIO using Docker:

```bash
make docker-up
```

Wait ~10 seconds for services to be ready. You can verify with:
```bash
docker ps
```

You should see three containers running:
- `complianceos-postgres`
- `complianceos-redis`
- `complianceos-minio`

### 4. Run Database Migrations

```bash
make db-migrate
```

This creates all database tables using Prisma migrations.

### 5. Seed Sample Data

```bash
make db-seed
```

This creates:
- Demo organization
- Admin user (admin@example.com / Admin123!)
- Sample obligations, controls, and evidence
- Sample risks

### 6. Start Development Servers

```bash
make dev
```

This starts both the API server and the web frontend concurrently.

### 7. Access the Application

Open your browser and navigate to:

**Frontend**: http://localhost:3000
- Login with: `admin@example.com` / `Admin123!`

**API**: http://localhost:3001/api
- Interactive API docs: http://localhost:3001/api/docs

**MinIO Console**: http://localhost:9001
- Login with: `minioadmin` / `minioadmin`

## What You Can Do Now

### Explore the Dashboard

1. **Home** - View overall readiness score and domain breakdown
2. **Obligations** - See the pre-loaded Korean compliance obligations
3. **Controls** - Review preventive and detective controls
4. **Evidence** - Browse uploaded compliance artifacts
5. **Risks** - View the sample risk register
6. **Inspection Packs** - Generate audit-ready packages

### Try Key Features

#### Create an Inspection Pack

1. Navigate to **Inspection Packs**
2. Click **Generate Pack**
3. Select domain (e.g., LABOR)
4. Choose date range
5. Click Create

The pack will generate in the background. Once complete, you can download:
- PDF Executive Summary
- JSON Manifest with artifact metadata
- ZIP bundle of evidence files

#### Upload Evidence

1. Navigate to **Evidence**
2. Click **Upload Evidence**
3. Select a file
4. Choose type, classification, and link to controls
5. Submit

The file is uploaded to MinIO with a SHA-256 hash and appears in the evidence repository.

#### View Readiness Score

Navigate to **Readiness** to see:
- Overall compliance score (0-100)
- Domain-specific scores
- Critical risk count
- Trend indicators

## Development Workflow

### Project Structure

```
ComplianceOS/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types and schemas
├── infra/            # Docker Compose
├── docs/             # Documentation
└── Makefile          # Common commands
```

### Common Commands

```bash
# Development
make dev              # Start all services
make docker-up        # Start Docker services
make docker-down      # Stop Docker services

# Database
make db-migrate       # Run migrations
make db-seed          # Seed database
make db-studio        # Open Prisma Studio

# Building
make build            # Build all apps
make test             # Run tests

# Cleanup
make clean            # Clean build artifacts
```

### API Development

The API uses:
- **NestJS** - Modern Node.js framework
- **Prisma** - Type-safe ORM
- **JWT** - Stateless authentication
- **Swagger** - Auto-generated API docs

Edit files in `apps/api/src/` and the dev server will hot-reload.

### Frontend Development

The web app uses:
- **Next.js 14** - React framework with App Router
- **React Query** - Server state management
- **Tailwind CSS** - Utility-first styling

Edit files in `apps/web/src/app/` and changes appear instantly.

### Database Changes

To modify the database schema:

1. Edit `apps/api/prisma/schema.prisma`
2. Run `cd apps/api && npx prisma migrate dev --name description`
3. Migration files are created automatically

### Adding a New Module

Example: Adding a "Vendors" module

1. **Backend**:
```bash
cd apps/api
nest g module vendors
nest g controller vendors
nest g service vendors
```

2. **Add to app.module.ts**:
```typescript
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [
    // ... existing modules
    VendorsModule,
  ],
})
```

3. **Frontend**: Create `apps/web/src/app/dashboard/vendors/page.tsx`

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Kill process on specific port
lsof -ti:3000 | xargs kill  # Frontend
lsof -ti:3001 | xargs kill  # API
lsof -ti:5432 | xargs kill  # PostgreSQL
```

Or use different ports in `.env` files.

### Docker Services Won't Start

```bash
# Stop and remove containers
make docker-down

# Remove volumes (⚠️ deletes data)
docker-compose -f infra/docker-compose.yml down -v

# Start fresh
make docker-up
```

### Database Connection Errors

Verify PostgreSQL is running:
```bash
docker ps | grep postgres
```

If not running, restart:
```bash
make docker-up
```

### Prisma Errors

Regenerate Prisma Client:
```bash
cd apps/api
npx prisma generate
```

### Frontend Won't Connect to API

Check that:
1. API is running on port 3001
2. `NEXT_PUBLIC_API_URL` is set correctly in `apps/web/.env`

## Next Steps

### Learn the System

1. Read [Architecture Documentation](docs/architecture.md)
2. Review [Threat Model](docs/threat-model.md)
3. Explore [API Documentation](docs/api.md)

### Customize for Your Needs

1. **Add Obligation Templates** - Create templates for your industry
2. **Configure Integrations** - Connect to your HR/finance systems
3. **Customize Workflows** - Define approval flows
4. **Brand the UI** - Update colors and logos in Tailwind config

### Deploy to Production

See deployment guides:
- **Vercel** - For Next.js frontend
- **Railway/Render** - For NestJS backend
- **Supabase** - For PostgreSQL database
- **AWS S3** - For object storage

## Getting Help

- **Documentation**: Check the `/docs` folder
- **API Explorer**: http://localhost:3001/api/docs
- **Issues**: Create an issue on GitHub
- **Community**: Join our Slack channel (link TBD)

## Security Note

The default credentials and secrets in this repo are for **development only**.

**Before deploying to production**:
1. Change all passwords and secrets
2. Use proper secret management (Vault, AWS Secrets Manager)
3. Enable HTTPS/TLS
4. Review the [Threat Model](docs/threat-model.md)
5. Conduct security testing

---

**Welcome to ComplianceOS! Let's make compliance simple.** 🚀
