# ComplianceOS CEO Demo Build - Final TODO

> **Target**: Korean SME CEO Demo
> **Company**: 넥스트솔루션 (주) (85명, Technology)
> **Demo Features**: 4 only (Smart Upload, Doc Gen, Contradiction, Audit Sim)
> **Status**: ✅ BUILD COMPLETE
> **Last Updated**: 2025-12-28

---

## Non-Negotiable Principles

1. **Auditor-grade, not AI theater** - Every claim has citations
2. **No guessing** - "판단 불가" when uncertain
3. **Deterministic demo** - Same inputs → same outputs
4. **AI is backend-owned** - Frontend never calls OpenAI directly

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
