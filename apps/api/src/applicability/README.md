# Applicability Engine

The Applicability Engine evaluates which compliance obligations apply to a company based on its profile.

## Features

- ✅ **Deterministic JSON Logic DSL** - Evaluates complex applicability rules using `all` (AND) and `any` (OR) operators
- ✅ **Company Profile Matching** - Matches obligations based on company size, industry, data types, and more
- ✅ **Batch Evaluation** - Efficiently evaluates all obligations at once
- ✅ **Domain Grouping** - Groups applicable obligations by domain (LABOR, PRIVACY, etc.)
- ✅ **Control Resolution** - Returns applicable controls and evidence requirements

## API Endpoints

### 1. Evaluate Applicability

```http
POST /applicability/evaluate
Content-Type: application/json

{
  "headcount_band": "10-29",
  "industry": "IT_SOFTWARE",
  "work_style": "hybrid",
  "data_types": {
    "customer_pii": true,
    "employee_pii": true
  },
  "uses_vendors_for_data": true
}
```

**Response:**
```json
{
  "profile": { ... },
  "applicableObligations": [
    {
      "code": "OB_LSA_WORKING_TIME_RECORDS",
      "titleKo": "근로시간 기록 의무",
      "title": "Working Time Records Obligation",
      "domain": "LABOR",
      "severityDefault": "HIGH",
      "evidenceFrequency": "CONTINUOUS"
    },
    ...
  ],
  "totalObligations": 50,
  "applicableCount": 35,
  "applicabilityRate": 70.0
}
```

### 2. Evaluate by Domain

```http
POST /applicability/evaluate/by-domain
```

Returns obligations grouped by domain (LABOR, PRIVACY, EQUALITY, etc.)

### 3. Evaluate Applicable Controls

```http
POST /applicability/evaluate/controls
```

Returns applicable controls and evidence requirements for the company profile.

### 4. Check Specific Obligation

```http
POST /applicability/check/OB_LSA_WORKING_TIME_RECORDS

{
  "headcount_band": "10-29"
}
```

**Response:**
```json
{
  "obligationCode": "OB_LSA_WORKING_TIME_RECORDS",
  "isApplicable": true
}
```

## DSL Specification

The applicability engine uses a JSON-based Domain Specific Language (DSL) to evaluate rules:

### Operators

- **`all`** - AND logic (all conditions must be true)
- **`any`** - OR logic (at least one condition must be true)
- **`field`** - Field path (supports nested fields like `data_types.customer_pii`)
- **`in`** - Array membership check
- **`eq`** - Equality check

### Examples

#### Simple "in" check:
```json
{
  "all": [
    {
      "field": "headcount_band",
      "in": ["1-9", "10-29", "30-99", "100-299", "300+"]
    }
  ]
}
```
Applies to all company sizes.

#### Boolean equality check:
```json
{
  "all": [
    {
      "field": "uses_vendors_for_data",
      "eq": true
    }
  ]
}
```
Applies only to companies that use vendors for data processing.

#### OR logic with nested fields:
```json
{
  "any": [
    {
      "field": "data_types.customer_pii",
      "eq": true
    },
    {
      "field": "data_types.employee_pii",
      "eq": true
    }
  ]
}
```
Applies if company processes either customer PII or employee PII (or both).

#### Combined AND + OR logic:
```json
{
  "all": [
    {
      "field": "headcount_band",
      "in": ["10-29", "30-99", "100-299", "300+"]
    },
    {
      "field": "uses_vendors_for_data",
      "eq": true
    }
  ],
  "any": [
    {
      "field": "data_types.customer_pii",
      "eq": true
    },
    {
      "field": "data_types.employee_pii",
      "eq": true
    }
  ]
}
```
Applies if:
- Company has 10+ employees AND
- Uses vendors for data processing AND
- Processes either customer or employee PII

## Usage in Code

```typescript
import { ApplicabilityService } from './applicability.service';
import { CompanyProfile } from '../common/types/company-profile.types';

// Example company profile
const profile: CompanyProfile = {
  headcount_band: '10-29',
  industry: 'IT_SOFTWARE',
  work_style: 'hybrid',
  data_types: {
    customer_pii: true,
    employee_pii: true,
    payment_data: true,
  },
  uses_vendors_for_data: true,
};

// Evaluate applicability
const result = await applicabilityService.evaluateApplicability(profile);

console.log(`${result.applicableCount}/${result.totalObligations} obligations apply`);
console.log(`Applicability rate: ${result.applicabilityRate}%`);

// Check specific obligation
const isApplicable = await applicabilityService.isObligationApplicable(
  'OB_PIPA_VENDOR_CONTRACT',
  profile
);

// Get applicable controls
const controls = await applicabilityService.getApplicableControls(profile);
```

## Testing

The DSL evaluator includes comprehensive unit tests covering:
- Simple and complex rules
- AND (`all`) and OR (`any`) logic
- Nested field paths
- Missing field handling
- Real-world examples from the obligation YAML files

Run tests:
```bash
npm test -- dsl-evaluator.spec.ts
```

## Company Profile Fields

### `headcount_band` (string, optional)
Company size by employee count:
- `"1-9"` - Micro business (under 10 employees)
- `"10-29"` - Small business (10-29 employees)
- `"30-99"` - Medium-small business (30-99 employees)
- `"100-299"` - Medium business (100-299 employees)
- `"300+"` - Large business (300+ employees)

### `industry` (string, optional)
Industry classification code (e.g., `"IT_SOFTWARE"`, `"MANUFACTURING"`, etc.)

### `work_style` (string, optional)
Primary work arrangement:
- `"office"` - On-site office work
- `"remote"` - Fully remote work
- `"hybrid"` - Mix of office and remote

### `data_types` (object, optional)
Types of personal data processed:
- `customer_pii` (boolean) - Customer personal information
- `employee_pii` (boolean) - Employee personal information
- `resident_id` (boolean) - Korean resident registration numbers (주민등록번호)
- `health_data` (boolean) - Health and medical data
- `payment_data` (boolean) - Payment and financial data

### `uses_vendors_for_data` (boolean, optional)
Whether the company outsources personal data processing to third-party vendors.

## Architecture

```
┌─────────────────┐
│ Company Profile │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Applicability Service   │
│  - Fetches obligations  │
│  - Evaluates rules      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ DSL Evaluator Utility   │
│  - Parses rules         │
│  - Evaluates conditions │
│  - Returns boolean      │
└─────────────────────────┘
```

## Performance

- **O(n)** complexity where n = number of obligations
- Evaluates all 50 obligations in ~10-20ms
- Caches obligation templates for faster repeated evaluations
- Suitable for real-time API calls during onboarding

## Error Handling

The evaluator handles errors gracefully:
- Invalid rules are logged but don't stop evaluation
- Missing fields return `false` for that condition
- Malformed rules throw validation errors

## Future Enhancements

- [ ] Rule validation during obligation template creation
- [ ] Caching of evaluation results by profile hash
- [ ] Analytics on most common applicable obligation combinations
- [ ] Support for date-based rules (effective dates, sunset clauses)
- [ ] Support for numeric comparisons (e.g., `gt`, `lt` operators)
