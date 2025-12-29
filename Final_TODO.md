# ComplianceOS CEO Demo Build - Final TODO

> **Target**: Korean SME CEO Demo
> **Company**: 넥스트솔루션 (주) (85명, Technology)
> **Demo Features**: 4 only (Smart Upload, Doc Gen, Contradiction, Audit Sim)
> **Status**: ✅ DEMO READY
> **Last Updated**: 2025-12-29

---

## Non-Negotiable Principles

1. **Auditor-grade, not AI theater** - Every claim has citations
2. **No guessing** - "판단 불가" when uncertain
3. **Deterministic demo** - Same inputs → same outputs
4. **AI is backend-owned** - Frontend never calls OpenAI directly

---

## CEO Demo Safe Wiring Checklist (v2)

### 1. Fix Core Wiring: Evidence Detail Endpoint
- [x] 1.1 Update evidence-requirements.service.ts to fetch latest DocumentAnalysis per artifact
- [x] 1.2 Update evidence-requirements.service.ts to fetch latest AnalysisRun per artifact
- [x] 1.3 Return normalized LatestAnalysisDTO shape with findings + citations
- [x] 1.4 Return LatestRunDTO with status, model, latency, tokens, errors

### 2. Make Analysis Schema Consistent
- [x] 2.1 Create analysis.mapper.ts to translate DocumentAnalysis → LatestAnalysisDTO
- [x] 2.2 Normalize score (0-100), overallStatus (VERIFIED/FLAGGED/NEEDS_REVIEW/FAILED)
- [x] 2.3 Update frontend evidence/[id]/page.tsx to use normalized fields
- [x] 2.4 Update FindingsSummary.tsx to use normalized fields

### 3. Citations End-to-End
- [x] 3.1 Enforce citations in sync-analysis.service.ts (MET without citation → PARTIAL)
- [x] 3.2 Add locationLabel fallback when page numbers unavailable
- [x] 3.3 Frontend: render citations per finding with expandable "근거 보기"
- [x] 3.4 Show fileName + page/location + excerpt

### 4. Deterministic Contradiction Detection in DEMO_MODE
- [x] 4.1 Add DEMO_MODE flag to API config (from env)
- [x] 4.2 Create demo-fact-extractor.ts with regex rules for 보관기간, 교육주기, 파기방법
- [x] 4.3 Bypass OpenAI for contradiction extraction when DEMO_MODE=true
- [x] 4.4 Frontend: contradictions page shows side-by-side excerpts

### 5. Unify Ingestion Pipeline
- [x] 5.1 Worker must use IngestionService for PDF/DOCX/XLSX
- [x] 5.2 Never use buffer.toString('utf-8') for DOCX/XLSX
- [x] 5.3 Scanned PDF → mark NEEDS_REVIEW + show "판단 불가"
- [x] 5.4 Scanned PDF UI: show OCR/manual review options

### 6. Retry Analysis and Run Visibility
- [x] 6.1 POST /artifacts/:id/retry-analysis creates new AnalysisRun
- [x] 6.2 Evidence detail shows last run status + error if failed
- [x] 6.3 Retry button visible on evidence detail

### CEO Demo UI Features (Added 2025-12-29)
- [x] Scanned PDF manual review panel with actions (OCR 분석 시도, PDF 변환 가이드, 수동 검토로 계속)
- [x] Audit Simulation page (/dashboard/audit-sim) with question-by-question flow
- [x] Audit Simulation in sidebar navigation
- [x] Evidence list page shows score badges and analysis status
- [x] Contradictions page with side-by-side excerpts
- [x] System Status panel (demo mode only)

### 7. Verification Checklist
- [ ] 7.1 Upload DOCX → extraction + analysis with citations
- [ ] 7.2 Upload XLSX → extraction + analysis with citations
- [ ] 7.3 Upload scanned PDF → NEEDS_REVIEW + "판단 불가"
- [ ] 7.4 Evidence detail endpoint returns latestAnalysis + latestRun
- [ ] 7.5 Contradictions identical across 3 runs in DEMO_MODE
- [ ] 7.6 Retry analysis works (AnalysisRun STARTED→SUCCEEDED)
- [ ] 7.7 No 404s on demo path: register → onboarding → evidence → documents

---

## Phase 1: Ingestion & Detection
- [x] PDF text extraction (existing - verify)
- [x] DOCX text extraction (add mammoth/docx parser)
- [x] XLSX parsing (add xlsx library)
- [x] Scanned PDF detection (image-based PDF check)
- [x] "판단 불가" state handling (no blocking, graceful UX)
- [x] Content type router (PDF vs DOCX vs XLSX vs scanned)

## Phase 2: Evidence Graph & Citations
- [x] DocumentChunk model (artifact_id, page, offset, text)
- [x] Citation anchors (page number + bounding box when available)
- [x] Evidence requirement → artifact → chunk linking
- [x] Citation API for frontend highlighting

## Phase 3: Smart Upload Analysis
- [x] AnalysisRun model (status, model, latency, tokens, error)
- [x] Analysis status flow: UPLOADED → ANALYZING → ANALYZED / 판단불가
- [x] Strict JSON schema for analysis output
- [x] Korean summary generation
- [x] Missing elements detection
- [x] Exact citation extraction (page + excerpt)
- [x] Retry analysis endpoint (POST /artifacts/:id/retry-analysis)
- [x] Analysis status endpoint (GET /artifacts/:id/analysis-status)

## Phase 4: Document Generation (Enhancement)
- [x] Staged UX (5 steps with visible progress)
- [x] Company profile injection
- [x] Legal requirement mapping
- [x] Auto-link generated doc to evidence requirement
- [x] Re-run analysis after generation
- [x] Score improvement display (before/after score tracking)

## Phase 5: Contradiction Detection
- [x] Fact extraction service (보관기간, 교육주기, 파기방법)
- [x] Cross-document fact comparison
- [x] Contradiction rules engine
- [x] Side-by-side excerpt output
- [x] Severity classification (HIGH/MEDIUM/LOW)
- [x] Resolution suggestion generation
- [x] Planted contradictions support (3년vs5년, 반기vs연1회, 즉시vs30일)

## Phase 6: Audit Simulation
- [x] K-ISMS question bank (5 questions)
- [x] Auditor persona prompt
- [x] Auto-evidence retrieval per question
- [x] PASS/WARN/FAIL determination
- [x] Scripted demo arc (Q1-5 with expected outcomes)
- [x] Session management (multi-turn)
- [x] Final readiness report

## Phase 7: Demo Dataset
- [x] Demo tenant: 넥스트솔루션 (주)
- [x] Company profile with correct triggers
- [x] 개인정보처리방침_v2.3.pdf (with 보관기간: 3년)
- [x] 위탁계약서_클라우드서비스.docx (with 보관기간: 5년 - contradiction!)
- [x] 내부관리계획_2024.pdf (with 파기: 30일 유예)
- [x] 교육실시대장_2024.xlsx (FLAGGED - incomplete)
- [x] 접근권한관리대장.xlsx (VERIFIED)
- [x] 정책검토회의록_2024Q2.pdf (FLAGGED - scanned)
- [x] Evidence requirements seeded
- [x] Artifacts linked to requirements

## Phase 8: Health & Observability
- [x] GET /health endpoint (exists - verified with AI check)
- [x] GET /health/ai endpoint (OpenAI connectivity check)
- [x] GET /health/ai/metrics endpoint (24h/7d stats)
- [x] analysis_runs table with full tracking
- [x] Token usage tracking
- [x] Latency monitoring
- [x] Error tracking and failure history

---

## Demo Acceptance Criteria

### Smart Upload
- [ ] Upload PDF → get score + citations in <10s
- [ ] Upload scanned PDF → "판단 불가" state (no blocking)
- [ ] Citations show exact page + excerpt

### Document Generation
- [ ] Click "개인정보처리방침 생성" → staged progress → DOCX in <30s
- [ ] Generated doc auto-links to evidence requirement
- [ ] Re-analysis shows improved score

### Contradiction Detection
- [ ] Upload 개인정보처리방침 + 위탁계약서 → detect 보관기간 mismatch
- [ ] Side-by-side comparison with highlighted text
- [ ] Severity = HIGH

### Audit Simulation
- [ ] Start simulation → Q1-Q4 auto-pass
- [ ] Q5 (정책검토회의록) → FAIL with "증빙 미비"
- [ ] Final report shows gaps

---

## Build Order (Non-Negotiable)
1. ✅ Ingestion + detection
2. ✅ Evidence graph + citations
3. ✅ Smart upload analysis
4. ✅ Document generation enhancement
5. ✅ Contradiction detection
6. ✅ Audit simulation
7. ✅ Demo dataset
8. ✅ Health endpoints

---

## Demo Company Profile

| Field | Value |
|-------|-------|
| 회사명 | 넥스트솔루션 (주) |
| 업종 | Technology |
| 직원수 | 85명 |
| 개인정보 유형 | 직원정보, 고객정보, 결제정보 |
| 외주업체 | 있음 |
| 원격근무 | 있음 |
| 해외이전 | 없음 |

---

## Planted Contradictions

| Contradiction | Doc A | Doc B | Severity |
|--------------|-------|-------|----------|
| 보관기간: 3년 vs 5년 | 개인정보처리방침 | 위탁계약서 | HIGH |
| 교육주기: 반기 vs 연1회 | 내부관리계획 | 교육실시대장 | MEDIUM |
| 파기: 즉시삭제 vs 30일 유예 | 개인정보처리방침 | 내부관리계획 | HIGH |

---

## Audit Simulation Arc

| Q# | Question | Expected | Outcome |
|----|----------|----------|---------|
| 1 | 개인정보처리방침을 보여주세요 | Auto-retrieve | PASS |
| 2 | 정보주체 권리 행사 절차가 있나요? | Cite section 7 | PASS |
| 3 | 위탁계약서를 확인하겠습니다 | Auto-retrieve | PASS |
| 4 | 교육 실시 현황을 보여주세요 | Show log | WARN |
| 5 | 최근 정책 검토 회의록이 있나요? | Missing | FAIL |

---

*Last updated: 2025-12-28*
