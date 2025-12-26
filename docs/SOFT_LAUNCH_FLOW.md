# ComplianceOS Soft-Launch Flow

> **This is the ONLY supported workflow for soft-launch.**
> Complete this flow within 10-15 minutes without developer assistance.

## Overview

ComplianceOS is an AI-native enterprise compliance operating system for Korean SMEs. This document defines the canonical golden path for first-time users during soft-launch.

## Golden Path Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SOFT-LAUNCH GOLDEN PATH                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. ORGANIZATION SETUP                                             │
│      └─→ Create account / Login                                     │
│      └─→ Complete 3-step onboarding wizard                          │
│      └─→ Company profile captures applicability data                │
│                                                                     │
│   2. EVIDENCE UPLOAD                                                │
│      └─→ Navigate to 증빙 제출 (Evidence)                            │
│      └─→ Upload real compliance documents (PDF, DOCX)               │
│      └─→ Link evidence to requirements                              │
│      └─→ AI automatically analyzes documents                        │
│                                                                     │
│   3. FRAMEWORK SELECTION                                            │
│      └─→ View 프레임워크 (Frameworks) to see requirements            │
│      └─→ Understand what you're being evaluated against             │
│      └─→ Obligations are auto-activated based on company profile    │
│                                                                     │
│   4. COMPLIANCE ANALYSIS                                            │
│      └─→ AI processes uploaded evidence                             │
│      └─→ Controls are evaluated against evidence                    │
│      └─→ Gaps are identified with specific citations                │
│                                                                     │
│   5. RESULTS REVIEW                                                 │
│      └─→ Navigate to 준수 현황 (Readiness)                           │
│      └─→ View overall compliance score (0-100)                      │
│      └─→ Review covered / partial / missing controls                │
│      └─→ Inspect AI reasoning with evidence citations               │
│      └─→ Get prioritized remediation recommendations                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Guide

### Step 1: Organization Setup (3 minutes)

1. **Navigate to the application**
   - URL: `https://app.complianceos.kr` (or local: `http://localhost:3000`)

2. **Create Account or Login**
   - New users: Click "회원가입" (Register)
   - Existing users: Login with email/password

3. **Complete Onboarding Wizard**
   The wizard collects company information to determine applicable regulations:

   **Step 1 - Company Information:**
   - 회사명 (Company Name)
   - 사업자등록번호 (Business Number)
   - 산업분류 (Industry)
   - 직원 수 (Employee Count)

   **Step 2 - Data Processing:**
   - 처리하는 개인정보 유형 (Types of personal data processed)
   - 국외이전 여부 (International data transfer)
   - 수탁사 유무 (Use of data processors)

   **Step 3 - Work Environment:**
   - 근무 형태 (Work style: office/remote/hybrid)
   - 연장근로 여부 (Overtime work)
   - 외주인력 유무 (Contractors)

4. **Automatic Obligation Activation**
   Based on your company profile, applicable obligations are automatically activated.

### Step 2: Evidence Upload (5 minutes)

1. **Navigate to 증빙 제출 (Evidence)**
   - Click the evidence upload section in the sidebar

2. **View Evidence Requirements**
   - See what documents are needed for each control
   - Requirements show acceptance criteria

3. **Upload Documents**
   - Click "파일 업로드" (Upload File)
   - Drag and drop or select files (PDF, DOCX supported)
   - Link to specific evidence requirement

4. **Wait for AI Processing**
   - Document extraction (text extraction from PDF/DOCX)
   - Document classification (type identification)
   - Compliance analysis (requirement verification)

### Step 3: Framework Review (2 minutes)

1. **Navigate to 프레임워크 (Frameworks)**
   - View available compliance frameworks
   - PIPA (개인정보 보호법) - Active
   - Labor Standards (근로기준법) - Active
   - ISMS-P - Coming Soon

2. **Understand Your Requirements**
   - Click on a framework to see domains
   - Expand domains to see specific obligations
   - Each obligation shows severity and frequency

### Step 4: View Results (3 minutes)

1. **Navigate to 준수 현황 (Readiness)**

2. **Review Overall Score**
   - Score: 0-100
   - Level: EXCELLENT (90+), GOOD (75-89), FAIR (60-74), POOR (40-59), CRITICAL (<40)

3. **Review Obligation Breakdown**
   - Each obligation shows completion percentage
   - Severity-weighted scoring
   - Top 3 risks highlighted

4. **Inspect AI Analysis**
   - Click on evidence items to see analysis details
   - View specific citations from documents
   - See AI confidence levels
   - Understand uncertainty statements when applicable

5. **Get Remediation Guidance**
   - Missing evidence clearly indicated
   - Specific actions recommended
   - Priority based on severity

### Step 5: Generate Inspection Pack (2 minutes)

1. **Navigate to 검사 팩 (Inspection Packs)**

2. **Create New Pack**
   - Click "새 팩 생성" (Create New Pack)
   - Select domain (LABOR, PRIVACY, etc.)
   - Choose date range
   - Select preset template (optional)

3. **Review and Download**
   - Pack includes all relevant evidence
   - Signed manifest for integrity verification
   - Auditor-ready format

## Output Schemas

### Control Coverage Output
```json
{
  "control_id": "string",
  "control_description": "string",
  "coverage_status": "COVERED | PARTIAL | MISSING",
  "evidence_used": [
    {
      "file_id": "string",
      "excerpt": "string"
    }
  ],
  "reasoning": "string"
}
```

### Gap / Finding Output
```json
{
  "gap_id": "string",
  "severity": "HIGH | MEDIUM | LOW",
  "description": "string",
  "missing_or_weak_evidence": true,
  "recommended_action": "string"
}
```

### Explicit Failure States

The system will explicitly communicate when:
- **"Insufficient evidence to determine compliance"** - Not enough information in documents
- **"Control is defined but not enforceable"** - Control exists but cannot be validated
- **"Manual review required"** - AI confidence too low for automated determination

## Success Criteria

A successful soft-launch flow completion means:

- [ ] User can create/login to organization
- [ ] Onboarding wizard captures applicability data
- [ ] Evidence files can be uploaded and processed
- [ ] Framework requirements are visible and understandable
- [ ] AI analysis runs with proper traceability
- [ ] Readiness score displays with gap breakdown
- [ ] Inspection pack can be generated and downloaded
- [ ] All failures are explicit with clear next steps

## Troubleshooting

### Common Issues

1. **Evidence upload fails**
   - Check file size (max 50MB)
   - Ensure PDF/DOCX format
   - Verify file is not corrupted

2. **AI analysis shows "Insufficient Evidence"**
   - Document may be scanned without OCR
   - Content may not match evidence requirements
   - Upload additional supporting documents

3. **Score seems incorrect**
   - Verify all evidence is linked to requirements
   - Check that documents are approved
   - Review AI analysis for each finding

4. **Cannot generate inspection pack**
   - Ensure at least some evidence exists
   - Check date range includes uploaded documents
   - Verify domain selection matches obligations

## Contact Support

For issues during soft-launch:
- Email: support@complianceos.kr
- In-app: Settings > Support Ticket

---

*Document Version: 1.0 (Soft-Launch)*
*Last Updated: 2024*
