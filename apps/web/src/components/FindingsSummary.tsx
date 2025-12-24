import StatusPill from './StatusPill'

interface Finding {
  severity: string
  category: string
  description: string
  recommendation?: string
}

interface Analysis {
  overallStatus: string
  score: number
  summaryKo: string
  findings: Finding[]
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
                    <StatusPill
                      status={finding.severity}
                      label={getSeverityLabel(finding.severity)}
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {finding.category}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-900 mb-2">{finding.description}</p>
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
