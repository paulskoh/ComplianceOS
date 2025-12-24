# Local Development Setup with LocalStack

This guide explains how to set up a complete local development environment for ComplianceOS using LocalStack to emulate AWS services.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- AWS CLI v2 installed (for manual LocalStack interaction)

## Quick Start

1. **Start LocalStack and supporting services:**

```bash
cd /path/to/ComplianceOS
docker-compose -f docker-compose.localstack.yml up -d
```

This will start:
- LocalStack (AWS services emulator)
- PostgreSQL (database)
- Redis (cache)

2. **Wait for initialization:**

The LocalStack init script will automatically create:
- S3 buckets for artifacts and inspection packs
- KMS keys for signing and encryption
- Secrets Manager secrets for database credentials and JWT

You can check the logs to see when initialization is complete:

```bash
docker-compose -f docker-compose.localstack.yml logs -f localstack
```

3. **Configure your applications:**

Create `.env.local` files in both `apps/api` and `apps/web`:

**apps/api/.env.local:**
```env
# Database
DATABASE_URL=postgresql://complianceos:dev_password@localhost:5432/complianceos_dev

# Redis
REDIS_URL=redis://localhost:6379

# AWS LocalStack
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=ap-northeast-2

# S3
S3_ARTIFACTS_BUCKET=complianceos-artifacts-local
S3_PACKS_BUCKET=complianceos-packs-local
S3_FORCE_PATH_STYLE=true

# KMS
KMS_SIGNING_KEY_ALIAS=alias/complianceos-pack-signing-local
KMS_ENCRYPTION_KEY_ALIAS=alias/complianceos-data-encryption-local

# JWT
JWT_SECRET=local-dev-jwt-secret-key-do-not-use-in-production

# Application
NODE_ENV=development
PORT=3001
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. **Run database migrations:**

```bash
cd apps/api
npm run prisma:migrate:dev
npm run db:seed
```

5. **Seed PIPA content pack:**

```bash
npm run seed:pipa
```

6. **Start the applications:**

In separate terminals:

```bash
# Terminal 1: Start API
cd apps/api
npm run dev

# Terminal 2: Start Web
cd apps/web
npm run dev
```

7. **Access the application:**

- Web UI: http://localhost:3000
- API: http://localhost:3001
- LocalStack: http://localhost:4566

## Accessing LocalStack Services

You can interact with LocalStack using the AWS CLI:

```bash
# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List objects in artifacts bucket
aws --endpoint-url=http://localhost:4566 s3 ls s3://complianceos-artifacts-local

# List KMS keys
aws --endpoint-url=http://localhost:4566 kms list-keys

# Get secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id complianceos/database
```

## Testing File Uploads

To test file uploads in the local environment:

1. Create a test file:
```bash
echo "Test evidence document" > test-evidence.pdf
```

2. Upload via the web UI or use the API directly:
```bash
curl -X POST http://localhost:3001/api/artifacts/upload-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test-evidence.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 1024
  }'
```

3. Upload to the presigned URL returned from the API

## Troubleshooting

### LocalStack not starting

Check Docker logs:
```bash
docker-compose -f docker-compose.localstack.yml logs localstack
```

### S3 bucket not found

Reinitialize LocalStack:
```bash
docker-compose -f docker-compose.localstack.yml down -v
docker-compose -f docker-compose.localstack.yml up -d
```

### Database connection issues

Ensure PostgreSQL is running:
```bash
docker-compose -f docker-compose.localstack.yml ps postgres
```

Test connection:
```bash
psql -h localhost -U complianceos -d complianceos_dev
# Password: dev_password
```

### KMS signing errors

Verify KMS keys exist:
```bash
aws --endpoint-url=http://localhost:4566 kms list-aliases
```

If missing, run the init script manually:
```bash
docker exec complianceos-localstack /etc/localstack/init/ready.d/init-aws.sh
```

## Stopping Services

To stop all services:
```bash
docker-compose -f docker-compose.localstack.yml down
```

To stop and remove all data (start fresh):
```bash
docker-compose -f docker-compose.localstack.yml down -v
rm -rf localstack-data
```

## Data Persistence

LocalStack data is persisted in the `localstack-data` directory. This includes:
- S3 object storage
- KMS keys
- Secrets Manager secrets

To start with a clean slate, remove this directory.

## Production vs Development

**IMPORTANT:** The LocalStack configuration is for development only. Never use these credentials or configuration in production:

- AWS credentials are `test` / `test`
- JWT secret is a simple string
- S3 buckets are not secure
- KMS keys are local only

Production should use:
- Real AWS IAM credentials
- AWS KMS in the production region
- Proper VPC and security group configuration
- Environment-specific secrets in AWS Secrets Manager

## Advanced: Running E2E Tests

To run E2E tests against LocalStack:

```bash
cd apps/web
npm run test:e2e
```

The tests will automatically use the local environment variables.

## AWS SDK Configuration

When using AWS SDK in your code, configure it for LocalStack:

```typescript
import { S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL, // http://localhost:4566
  forcePathStyle: true, // Required for LocalStack
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
```

## Contributing

When adding new AWS services to the application:

1. Add the service to `SERVICES` in `docker-compose.localstack.yml`
2. Update `localstack-init.sh` to create necessary resources
3. Update this documentation with configuration details
4. Test locally before submitting PR

## Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS CLI with LocalStack](https://docs.localstack.cloud/user-guide/integrations/aws-cli/)
- [ComplianceOS Architecture](./architecture.md)
