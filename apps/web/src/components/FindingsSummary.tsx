import StatusPill from './StatusPill'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface Finding {
  severity: string
  category: string
  description: string
  recommendation?: string
  // Citation fields for auditor-grade credibility
  status?: 'MET' | 'PARTIAL' | 'NOT_MET'
  messageKo?: string
  pageRef?: number
  excerpt?: string
}

interface Citation {
  page: number
  text: string
  relevance?: string
}

interface Analysis {
  overallStatus: string
  score: number
  summaryKo: string
  findings: Finding[]
  citations?: Citation[]
}

interface FindingsSummaryProps {
  analysis: Analysis
}

export default function FindingsSummary({ analysis }: FindingsSummaryProps) {
  const criticalFindings = analysis.findings?.filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
  ) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-3xl font-bold text-gray-900">{analysis.score}점</div>
          <StatusPill
            status={analysis.overallStatus}
            label={getOverallStatusLabel(analysis.overallStatus)}
          />
        </div>
        {analysis.findings && analysis.findings.length > 0 && (
          <div className="text-sm text-gray-600">
            {analysis.findings.length}개 발견사항
            {criticalFindings.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({criticalFindings.length}개 중요)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700">{analysis.summaryKo}</p>
      </div>

      {analysis.findings && analysis.findings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">발견사항</h3>
          <div className="space-y-2">
            {analysis.findings.map((finding, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                    ? 'border-red-200 bg-red-50'
                    : finding.severity === 'MEDIUM'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {finding.status && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        finding.status === 'MET' ? 'bg-green-100 text-green-700' :
                        finding.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {finding.status === 'MET' ? '충족' :
                         finding.status === 'PARTIAL' ? '부분충족' : '미충족'}
                      </span>
                    )}
                    <StatusPill
                      status={finding.severity}
                      label={getSeverityLabel(finding.severity)}
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {finding.category}
                    </span>
                  </div>
                  {/* Citation indicator */}
                  {(finding.pageRef || finding.excerpt) && (
                    <span className="text-xs text-blue-500 flex items-center">
                      <DocumentTextIcon className="w-3 h-3 mr-0.5" />
                      인용
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 mb-2">
                  {finding.messageKo || finding.description}
                </p>

                {/* Citation display - auditor-grade credibility */}
                {(finding.pageRef || finding.excerpt) && (
                  <div className="mt-2 p-2 bg-white border border-gray-200 rounded">
                    <div className="flex items-start space-x-2">
                      <DocumentTextIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {finding.pageRef && (
                          <span className="text-xs font-medium text-blue-600">
                            p.{finding.pageRef}
                          </span>
                        )}
                        {finding.excerpt && (
                          <p className="text-xs text-gray-600 mt-1 italic border-l-2 border-blue-300 pl-2">
                            &ldquo;{finding.excerpt}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {finding.recommendation && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">권장 조치:</span> {finding.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-level citations section */}
      {analysis.citations && analysis.citations.length > 0 && (
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <DocumentTextIcon className="w-4 h-4 mr-1 text-blue-500" />
            인용 근거 ({analysis.citations.length}개)
          </h3>
          <div className="space-y-2">
            {analysis.citations.map((citation, index) => (
              <div
                key={index}
                className="border border-blue-100 bg-blue-50 rounded-lg p-3"
              >
                <div className="flex items-start">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded mr-2">
                    p.{citation.page}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 italic">
                      &ldquo;{citation.text}&rdquo;
                    </p>
                    {citation.relevance && (
                      <p className="text-xs text-gray-500 mt-1">
                        {citation.relevance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getOverallStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'PASS':
      return '통과'
    case 'FAIL':
      return '실패'
    case 'REVIEW':
      return '검토 필요'
    case 'PENDING':
      return '대기중'
    default:
      return status
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return '치명적'
    case 'HIGH':
      return '높음'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    case 'INFO':
      return '정보'
    default:
      return severity
  }
}
