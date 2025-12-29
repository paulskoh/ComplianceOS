/**
 * Analysis Mapper
 * Translates internal DocumentAnalysis model to normalized LatestAnalysisDTO
 * CEO Demo: Ensures consistent schema between backend and frontend
 */

/**
 * Citation for auditor-grade credibility
 */
export interface CitationDTO {
  fileName: string;
  artifactId: string;
  artifactVersionId?: string;
  page?: number;
  locationLabel?: string;
  excerpt: string;
}

/**
 * Finding with citations
 */
export interface FindingDTO {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'MET' | 'PARTIAL' | 'NOT_MET' | 'INSUFFICIENT_EVIDENCE';
  category: string;
  title: string;
  description: string;
  messageKo?: string;
  recommendation: string;
  citations: CitationDTO[];
}

/**
 * Normalized analysis DTO for frontend
 */
export interface LatestAnalysisDTO {
  overallStatus: 'VERIFIED' | 'FLAGGED' | 'NEEDS_REVIEW' | 'FAILED' | 'UNPARSEABLE';
  score: number; // 0-100
  summaryKo: string;
  findings: FindingDTO[];
  missingElements: string[];
  recommendations: string[];
  citations?: CitationDTO[];
}

/**
 * Analysis run status DTO
 */
export interface LatestRunDTO {
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED' | 'UNPARSEABLE';
  statusKo: string;
  model?: string;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Internal DocumentAnalysis shape from database
 */
interface InternalDocumentAnalysis {
  id: string;
  artifactId: string;
  version: number;
  overallCompliance: string;
  confidence: number;
  findings: any;
  missingElements: any;
  recommendations: any;
  analysisMetadata: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal AnalysisRun shape from database
 */
interface InternalAnalysisRun {
  id: string;
  tenantId: string;
  artifactId: string;
  version: number;
  status: string;
  statusKo?: string;
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  errorMessage?: string;
  retryCount: number;
  metadata?: any;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * Map internal DocumentAnalysis to normalized LatestAnalysisDTO
 */
export function mapToLatestAnalysisDTO(
  analysis: InternalDocumentAnalysis | null,
  artifactName?: string,
  artifactId?: string,
  isScanned?: boolean,
): LatestAnalysisDTO | null {
  if (!analysis) return null;

  // Handle scanned/unparseable documents
  if (isScanned) {
    return {
      overallStatus: 'NEEDS_REVIEW',
      score: 0,
      summaryKo: '스캔된 문서입니다. 텍스트 추출이 불가능하여 수동 검토가 필요합니다.',
      findings: [],
      missingElements: ['텍스트 추출 불가'],
      recommendations: ['OCR 분석 시도 또는 텍스트 버전 문서를 업로드하세요.'],
    };
  }

  // Calculate score (0-100)
  let score: number;
  if (typeof analysis.confidence === 'number') {
    // If confidence is 0-1, multiply by 100
    score = analysis.confidence <= 1 ? Math.round(analysis.confidence * 100) : Math.round(analysis.confidence);
  } else {
    score = 0;
  }

  // Determine overall status
  let overallStatus: LatestAnalysisDTO['overallStatus'];
  const compliance = (analysis.overallCompliance || '').toUpperCase();

  if (compliance === 'COMPLIANT' || score >= 80) {
    overallStatus = 'VERIFIED';
  } else if (compliance === 'PARTIAL' || score >= 50) {
    overallStatus = 'FLAGGED';
  } else if (compliance === 'UNCLEAR' || compliance === 'UNPARSEABLE') {
    overallStatus = 'NEEDS_REVIEW';
  } else if (compliance === 'NON_COMPLIANT' || score < 50) {
    overallStatus = 'FLAGGED';
  } else {
    overallStatus = 'FLAGGED';
  }

  // Map findings with citations
  const rawFindings = Array.isArray(analysis.findings) ? analysis.findings : [];
  const findings: FindingDTO[] = rawFindings.map((f: any, index: number) => {
    // Build citations from finding
    const citations: CitationDTO[] = [];

    if (f.excerpt || f.pageRef !== undefined) {
      citations.push({
        fileName: artifactName || 'Unknown',
        artifactId: artifactId || analysis.artifactId,
        page: f.pageRef,
        locationLabel: f.pageRef ? `p.${f.pageRef}` : (f.section || f.category || '문서 내'),
        excerpt: f.excerpt || f.messageKo || f.description || '',
      });
    }

    // Determine finding status
    let status: FindingDTO['status'] = 'MET';
    if (f.status) {
      status = f.status;
    } else if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
      status = 'NOT_MET';
    } else if (f.severity === 'MEDIUM') {
      status = 'PARTIAL';
    }

    // CEO Demo Critical: MET without citations → INSUFFICIENT_EVIDENCE
    if (status === 'MET' && citations.length === 0) {
      status = 'INSUFFICIENT_EVIDENCE';
    }

    return {
      id: f.id || `finding-${index}`,
      severity: (f.severity || 'LOW').toUpperCase() as FindingDTO['severity'],
      status,
      category: f.category || '일반',
      title: f.title || f.category || `발견사항 ${index + 1}`,
      description: f.description || f.messageKo || '',
      messageKo: f.messageKo,
      recommendation: f.recommendation || f.recommendationKo || '',
      citations,
    };
  });

  // Extract summary from metadata or generate from findings
  let summaryKo = '';
  const metadata = analysis.analysisMetadata || {};
  if (metadata.summaryKo) {
    summaryKo = metadata.summaryKo;
  } else if (metadata.summary) {
    summaryKo = metadata.summary;
  } else {
    // Generate summary from findings
    const metCount = findings.filter(f => f.status === 'MET').length;
    const totalCount = findings.length;
    summaryKo = totalCount > 0
      ? `${totalCount}개 항목 중 ${metCount}개 충족 (${Math.round(metCount / totalCount * 100)}%)`
      : '분석 결과가 없습니다.';
  }

  // Parse missing elements and recommendations
  const missingElements = Array.isArray(analysis.missingElements)
    ? analysis.missingElements
    : [];
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
    : [];

  // Build top-level citations from all findings
  const allCitations: CitationDTO[] = findings.flatMap(f => f.citations);

  return {
    overallStatus,
    score,
    summaryKo,
    findings,
    missingElements,
    recommendations,
    citations: allCitations.length > 0 ? allCitations : undefined,
  };
}

/**
 * Map internal AnalysisRun to LatestRunDTO
 */
export function mapToLatestRunDTO(run: InternalAnalysisRun | null): LatestRunDTO | null {
  if (!run) return null;

  const statusMap: Record<string, LatestRunDTO['status']> = {
    PENDING: 'PENDING',
    STARTED: 'ANALYZING',
    ANALYZING: 'ANALYZING',
    COMPLETED: 'COMPLETED',
    SUCCEEDED: 'COMPLETED',
    FAILED: 'FAILED',
    UNPARSEABLE: 'UNPARSEABLE',
  };

  const statusKoMap: Record<string, string> = {
    PENDING: '대기중',
    STARTED: '분석중',
    ANALYZING: '분석중',
    COMPLETED: '완료',
    SUCCEEDED: '완료',
    FAILED: '실패',
    UNPARSEABLE: '판단 불가',
  };

  const status = statusMap[run.status?.toUpperCase()] || 'PENDING';
  const statusKo = run.statusKo || statusKoMap[run.status?.toUpperCase()] || '알 수 없음';

  return {
    status,
    statusKo,
    model: run.model || undefined,
    latencyMs: run.latencyMs || undefined,
    tokensIn: run.promptTokens || undefined,
    tokensOut: run.outputTokens || undefined,
    errorMessage: run.errorMessage || undefined,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() || undefined,
  };
}

/**
 * Get Korean status label
 */
export function getStatusKo(status: string): string {
  const map: Record<string, string> = {
    VERIFIED: '검증됨',
    FLAGGED: '검토 필요',
    NEEDS_REVIEW: '수동 검토 필요',
    FAILED: '분석 실패',
    UNPARSEABLE: '판단 불가',
    MET: '충족',
    PARTIAL: '부분 충족',
    NOT_MET: '미충족',
    INSUFFICIENT_EVIDENCE: '근거 불충분',
  };
  return map[status] || status;
}
