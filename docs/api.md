# ComplianceOS API Documentation

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.complianceos.com/api
```

## Authentication

All endpoints (except `/auth/*`) require Bearer token authentication.

### Get Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123!"
}

Response:
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ORG_ADMIN",
    "tenantId": "uuid"
  }
}
```

### Use Access Token

Include in Authorization header:
```
Authorization: Bearer eyJhbGci...
```

## API Endpoints

### Authentication

#### Register Organization & Admin
```http
POST /auth/register

{
  "email": "string",
  "password": "string (min 8 chars, complexity required)",
  "firstName": "string",
  "lastName": "string",
  "organizationName": "string"
}
```

#### Login
```http
POST /auth/login

{
  "email": "string",
  "password": "string"
}
```

### Users

#### List Users
```http
GET /users
Authorization: Bearer {token}

Response: User[]
```

#### Get User
```http
GET /users/{id}
Authorization: Bearer {token}
```

#### Create User
```http
POST /users
Authorization: Bearer {token}
Roles: ORG_ADMIN, SUPER_ADMIN

{
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "ORG_ADMIN | COMPLIANCE_MANAGER | HR_MANAGER | SECURITY_MANAGER | AUDITOR | CONTRIBUTOR",
  "password": "string (optional)"
}
```

#### Update User
```http
PUT /users/{id}
Authorization: Bearer {token}
Roles: ORG_ADMIN, SUPER_ADMIN

{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "role": "UserRole (optional)",
  "isActive": "boolean (optional)"
}
```

### Obligations

#### List Obligations
```http
GET /obligations
Authorization: Bearer {token}

Response: Obligation[]
```

#### Get Obligation
```http
GET /obligations/{id}
Authorization: Bearer {token}
```

#### Create Obligation
```http
POST /obligations
Authorization: Bearer {token}

{
  "title": "string",
  "titleKo": "string (optional)",
  "description": "string",
  "domain": "LABOR | PRIVACY | FINANCE | CONTRACTS | SECURITY | TRAINING",
  "evidenceFrequency": "CONTINUOUS | DAILY | WEEKLY | MONTHLY | QUARTERLY | ANNUAL | ON_CHANGE",
  "ownerId": "uuid (optional)",
  "templateId": "uuid (optional)",
  "isActive": "boolean (default: true)"
}
```

#### Update Obligation
```http
PUT /obligations/{id}
Authorization: Bearer {token}

{
  "title": "string (optional)",
  "description": "string (optional)",
  "domain": "ObligationDomain (optional)",
  "ownerId": "uuid (optional)",
  "isActive": "boolean (optional)"
}
```

### Controls

#### List Controls
```http
GET /controls
Authorization: Bearer {token}

Response: Control[]
```

#### Get Control
```http
GET /controls/{id}
Authorization: Bearer {token}
```

#### Create Control
```http
POST /controls
Authorization: Bearer {token}

{
  "name": "string",
  "description": "string",
  "type": "PREVENTIVE | DETECTIVE | CORRECTIVE",
  "automationLevel": "MANUAL | SEMI_AUTOMATED | FULLY_AUTOMATED",
  "ownerId": "uuid (optional)",
  "obligationIds": ["uuid"] (array)
}
```

#### Update Control
```http
PUT /controls/{id}
Authorization: Bearer {token}

{
  "name": "string (optional)",
  "description": "string (optional)",
  "type": "ControlType (optional)",
  "automationLevel": "AutomationLevel (optional)",
  "ownerId": "uuid (optional)",
  "obligationIds": ["uuid"] (optional)
}
```

### Artifacts (Evidence)

#### List Artifacts
```http
GET /artifacts
Authorization: Bearer {token}

Response: Artifact[]
```

#### Get Artifact
```http
GET /artifacts/{id}
Authorization: Bearer {token}
```

#### Upload Artifact
```http
POST /artifacts/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
  file: File
  name: string
  description: string (optional)
  type: "LOG | REPORT | POLICY | APPROVAL | SIGNED_DOCUMENT | EXPORT | SCREENSHOT | OTHER"
  source: string
  accessClassification: "PUBLIC | INTERNAL | CONFIDENTIAL | PII"
  retentionDays: number (optional)
  metadata: JSON (optional)
  controlIds: ["uuid"]
  obligationIds: ["uuid"]
```

#### Get Download URL
```http
GET /artifacts/{id}/download-url
Authorization: Bearer {token}

Response:
{
  "url": "https://s3-presigned-url..."
}
```

#### Link Artifact to Resources
```http
PUT /artifacts/{id}/link
Authorization: Bearer {token}

{
  "controlIds": ["uuid"] (optional),
  "obligationIds": ["uuid"] (optional)
}
```

#### Delete Artifact (Soft Delete)
```http
DELETE /artifacts/{id}
Authorization: Bearer {token}
```

### Risks

#### List Risks
```http
GET /risks
Authorization: Bearer {token}

Response: RiskItem[]
```

#### Create Risk
```http
POST /risks
Authorization: Bearer {token}

{
  "title": "string",
  "description": "string",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "obligationId": "uuid (optional)",
  "controlId": "uuid (optional)",
  "ownerId": "uuid (optional)",
  "dueDate": "ISO 8601 datetime (optional)"
}
```

#### Update Risk
```http
PUT /risks/{id}
Authorization: Bearer {token}

{
  "title": "string (optional)",
  "description": "string (optional)",
  "severity": "RiskSeverity (optional)",
  "status": "OPEN | IN_REVIEW | MITIGATED | ACCEPTED (optional)",
  "ownerId": "uuid (optional)",
  "dueDate": "ISO 8601 datetime (optional)"
}
```

### Readiness

#### Get Readiness Score
```http
GET /readiness/score
Authorization: Bearer {token}

Response:
{
  "overallScore": 85,
  "totalObligations": 10,
  "totalControls": 15,
  "totalRisks": 3,
  "criticalRisks": 1,
  "domainScores": [
    {
      "domain": "LABOR",
      "score": 90,
      "obligations": 5,
      "risks": 1
    }
  ]
}
```

### Inspection Packs

#### List Packs
```http
GET /inspection-packs
Authorization: Bearer {token}

Response: InspectionPack[]
```

#### Get Pack
```http
GET /inspection-packs/{id}
Authorization: Bearer {token}
```

#### Create Pack
```http
POST /inspection-packs
Authorization: Bearer {token}

{
  "name": "string",
  "domain": "LABOR | PRIVACY | FINANCE | CONTRACTS | SECURITY | TRAINING",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "obligationIds": ["uuid"] (optional),
  "inspectorProfile": "string (optional)"
}

Response:
{
  "id": "uuid",
  "name": "string",
  "status": "GENERATING | COMPLETED | FAILED",
  ...
}
```

#### Get Download URLs
```http
GET /inspection-packs/{id}/download-urls
Authorization: Bearer {token}

Response:
{
  "summaryUrl": "https://s3-presigned-url/summary.pdf",
  "manifestUrl": "https://s3-presigned-url/manifest.json",
  "bundleUrl": "https://s3-presigned-url/evidence.zip"
}
```

#### Create Share Link
```http
POST /inspection-packs/{id}/share-link
Authorization: Bearer {token}

{
  "expiresInHours": 72 (default)
}

Response:
{
  "id": "uuid",
  "token": "random-hex-string",
  "expiresAt": "ISO 8601 datetime"
}
```

### Integrations

#### List Integrations
```http
GET /integrations
Authorization: Bearer {token}

Response: Integration[]
```

#### Get Integration
```http
GET /integrations/{id}
Authorization: Bearer {token}
```

#### Run Integration
```http
POST /integrations/{id}/run
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "status": "RUNNING",
  "startedAt": "ISO 8601 datetime"
}
```

### Audit Log

#### List Audit Events
```http
GET /audit-log?page=1&limit=50
Authorization: Bearer {token}

Response:
{
  "data": AuditLogEvent[],
  "meta": {
    "total": 1234,
    "page": 1,
    "limit": 50,
    "totalPages": 25
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

Default rate limits:
- Auth endpoints: 10 requests per minute
- All other endpoints: 100 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Pagination

Paginated endpoints accept:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `sortBy` - Field to sort by (optional)
- `sortOrder` - `asc` or `desc` (default: `desc`)

## OpenAPI/Swagger

Interactive API documentation available at:
```
http://localhost:3001/api/docs
```

## SDK Examples

### TypeScript/JavaScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Login
const { data } = await api.post('/auth/login', {
  email: 'admin@example.com',
  password: 'Admin123!'
});

// Set token
api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

// Get obligations
const obligations = await api.get('/obligations');
```

## Webhooks (Planned)

Future webhook support for:
- Pack generation completed
- Risk threshold exceeded
- Integration run completed
- Audit events
