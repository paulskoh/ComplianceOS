# Demo Script: ComplianceOS (Bam)

**Duration: 15 minutes**

This script walks through a live demonstration of Bam for executives, investors, or prospects.

---

## Pre-Demo Checklist

Before starting the demo:

```bash
# Ensure services are running
make docker-up
make dev

# Verify database is seeded
# If needed: make db-migrate && make db-seed
```

Confirm access:
- Web UI loads at http://localhost:3000
- Login works with admin@example.com / Admin123!

---

## Minute-by-Minute Flow

### Minutes 0-2: The Problem Statement

**What to say:**
> "Korean SMEs face 150+ regulatory obligations. When an audit comes, they scramble for 2-3 weeks gathering documents. Bam eliminates that scramble by maintaining continuous compliance readiness."

**Show:**
- Start at the login page (http://localhost:3000/login)
- Log in with: admin@example.com / Admin123!

---

### Minutes 2-4: Executive Dashboard

**What to click:**
- Dashboard loads automatically after login
- Point to the **Readiness Score** (large number in center)

**What to say:**
> "This is the executive view. In 5 seconds, you see your compliance status - not 5 days of reports."

**What the system shows:**
- Overall readiness score (0-100)
- Status badge (Audit Ready / Needs Attention / Critical)
- Domain breakdown with progress bars

**Point out:**
- "LABOR at 75% - we have some gaps in overtime documentation"
- "PRIVACY at 90% - consent management is solid"
- "Immediate Attention panel shows 5 items needing action"

---

### Minutes 4-6: Obligations Management

**What to click:**
- Click **"Obligations"** in left sidebar

**What to say:**
> "These are your regulatory requirements. We pre-load Korean templates - 근로기준법, 개인정보보호법, etc."

**What the system shows:**
- Table of obligations with columns: Title, Domain, Severity, Status
- Filter by domain (LABOR, PRIVACY, etc.)
- Korean titles visible (titleKo column)

**Point out:**
- Each obligation has an owner
- Severity levels: CRITICAL, HIGH, MEDIUM, LOW
- Evidence frequency: MONTHLY, QUARTERLY, ON_CHANGE

---

### Minutes 6-8: Controls Framework

**What to click:**
- Click **"Controls"** in left sidebar

**What to say:**
> "Controls are how you prove compliance. Each control links to obligations and defines what evidence you need."

**What the system shows:**
- Table of controls: Overtime Approval Workflow, User Consent Tracking, etc.
- Control types: PREVENTIVE, DETECTIVE, CORRECTIVE
- Linked obligations count

**Point out:**
- "This control requires monthly overtime approval records"
- "It's linked to the Labor Standards obligation"
- "Evidence freshness window: 30 days - if we go past that, we get a gap alert"

---

### Minutes 8-10: Evidence Repository

**What to click:**
- Click **"Evidence"** in left sidebar

**What to say:**
> "Evidence flows in automatically from HR systems, cloud storage, or manual upload. Each document is hashed for integrity."

**What the system shows:**
- Table of artifacts with: Name, Type, Source, Uploaded date
- Sample artifacts: "October 2024 Overtime Report", "User Consent Database Export"
- Links to controls and obligations

**Demo upload (if time permits):**
1. Click "Upload Evidence" button
2. Select a sample PDF
3. Show the upload progress
4. Demonstrate linking to a control

**Point out:**
- "SHA-256 hash ensures no one can tamper with evidence after upload"
- "Documents are automatically classified by type"

---

### Minutes 10-12: Readiness Deep Dive

**What to click:**
- Click **"Readiness"** in left sidebar

**What to say:**
> "Now let's see exactly where our gaps are and what to do about them."

**What the system shows:**
- Detailed breakdown by obligation
- Gap list with severity
- Recommended actions in Korean

**Point out:**
- "Missing evidence: 근로기준법 - 연장근로 관리 requires monthly records"
- "Action: Upload the October overtime approval log"
- "Score will increase once we address these gaps"

---

### Minutes 12-14: Inspection Pack Generation

**What to click:**
- Click **"Inspection Packs"** in left sidebar

**What to say:**
> "When an audit comes, you don't scramble. You click one button."

**What to show:**
1. Click "Generate New Pack" (or show an existing pack)
2. Select domain: LABOR
3. Select date range: Last 90 days
4. Click Generate

**What the system produces:**
- PDF executive summary
- JSON manifest with hashes
- ZIP file with all evidence documents
- Shareable link for external auditors

**Point out:**
- "This would take 2-3 weeks manually. Bam does it in 60 seconds."
- "The manifest includes SHA-256 hashes - auditors can verify nothing was altered"
- "Share link expires after 7 days for security"

---

### Minutes 14-15: Wrap-up & Q&A

**What to say:**
> "That's Bam: continuous compliance visibility, automatic evidence collection, and one-click audit packages. Questions?"

**Key talking points for Q&A:**
- **Pricing**: Starter (free pilot), Growth ($X/month), Enterprise (contact sales)
- **Implementation**: 1-2 weeks for full onboarding
- **Integrations**: HR systems (Flex, Workvivo), cloud storage (Drive, OneDrive)
- **Security**: SOC 2 in progress, data encrypted at rest and in transit
- **Multi-tenant**: Full isolation between organizations

---

## If Something Fails: Fallback Talking Points

### Login fails
> "In production, we use SSO/OAuth. Let me show you the UI screenshots while we troubleshoot."
- Show screenshots from docs/architecture.md

### Dashboard shows 0 score
> "The demo database needs reseeding. In production, you'd see your real data. Let me describe what you'd see..."
- Describe the readiness score concept
- Show the architecture diagram

### Evidence upload fails
> "The storage service needs to be running. Here's what the flow looks like..."
- Describe the upload → classify → link → score flow

### Inspection pack generation hangs
> "Pack generation can take 30-60 seconds for large evidence sets. While we wait..."
- Explain the pack contents: PDF summary, manifest, ZIP archive

### General fallback
- Keep a browser tab open with the Swagger API docs (http://localhost:3001/api)
- Show the API endpoints as proof of real backend functionality

---

## Post-Demo Follow-up

1. Send link to this demo recording (if recorded)
2. Offer a sandbox account for hands-on exploration
3. Schedule a deeper technical dive with the engineering team
4. Provide EXECUTIVE_BRIEF.md as takeaway document

---

*Demo Version: 1.0 | Last Updated: 2025-12-26*
