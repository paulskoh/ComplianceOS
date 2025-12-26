'use client'

import { useEffect, useState } from 'react'
import { readiness } from '@/lib/api'
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import StatusPill from '@/components/StatusPill'
import Link from 'next/link'
import ErrorState, { EmptyState } from '@/components/ErrorState'

interface ObligationScore {
  obligationId: string
  obligationTitleKo: string
  severity: string
  weightPercent: number
  evidenceCount: number
  verifiedCount: number
  missingCount: number
  flaggedCount: number
  score: number
}

interface ReadinessScore {
  overallScore: number
  totalObligations: number
  totalEvidence: number
  verifiedEvidence: number
  obligationScores: ObligationScore[]
  topRisks: Array<{
    obligationTitleKo: string
    evidenceRequirementTitleKo: string
    severity: string
    reason: string
    evidenceRequirementId: string
  }>
}

export default function ReadinessPage() {
  const [scoreData, setScoreData] = useState<ReadinessScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScore = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await readiness.getScoreV2()
      setScoreData(response.data)
    } catch (err: any) {
      console.error('Failed to fetch readiness score:', err)
      // SOFT-LAUNCH: Graceful error handling with user-friendly message
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다. 다시 로그인해 주세요.')
      } else if (err.response?.status === 403) {
        setError('이 페이지에 접근할 권한이 없습니다.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.')
      } else {
        setError('준수 현황 데이터를 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScore()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // SOFT-LAUNCH: Graceful error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">준수 현황</h1>
          <p className="mt-1 text-sm text-gray-500">
            개인정보 보호법 준수 점수 및 개선이 필요한 영역을 확인하세요
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200">
          <ErrorState
            title="데이터 로드 실패"
            message={error}
            onRetry={fetchScore}
          />
        </div>
      </div>
    )
  }

  if (!scoreData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">준수 현황</h1>
          <p className="mt-1 text-sm text-gray-500">
            개인정보 보호법 준수 점수 및 개선이 필요한 영역을 확인하세요
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200">
          <EmptyState
            title="준수 현황 데이터가 없습니다"
            message="증빙 자료를 업로드하면 준수 현황 점수가 계산됩니다. 먼저 증빙 제출 페이지에서 필요한 서류를 업로드해 주세요."
            action={{
              label: '증빙 제출하기',
              onClick: () => window.location.href = '/dashboard/evidence',
            }}
          />
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '우수'
    if (score >= 60) return '보통'
    return '미흡'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">준수 현황</h1>
          <p className="mt-1 text-sm text-gray-500">
            개인정보 보호법 준수 점수 및 개선이 필요한 영역을 확인하세요
          </p>
        </div>
        <Link
          href="/dashboard/inspection-packs"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
        >
          검사 팩 생성
        </Link>
      </div>

      {/* Overall Score Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">전체 준수 점수</h2>
            <div className="flex items-center space-x-8">
              <div className="relative">
                <div className="flex items-center justify-center w-32 h-32">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - scoreData.overallScore / 100)}`}
                      className={getScoreColor(scoreData.overallScore)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-3xl font-bold ${getScoreColor(scoreData.overallScore)}`}>
                      {scoreData.overallScore}
                    </span>
                    <span className="text-xs text-gray-500">점</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <StatusPill
                    status={getScoreLabel(scoreData.overallScore)}
                    label={getScoreLabel(scoreData.overallScore)}
                  />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 의무사항</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {scoreData.totalObligations}개
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 증빙 항목</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {scoreData.totalEvidence}개
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">승인된 증빙</div>
                  <div className="text-2xl font-semibold text-green-600">
                    {scoreData.verifiedEvidence}개
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Risks */}
      {scoreData.topRisks && scoreData.topRisks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">우선 개선 필요 영역 (상위 3개)</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {scoreData.topRisks.map((risk, index) => (
              <Link
                key={index}
                href={`/dashboard/evidence/${risk.evidenceRequirementId}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-medium text-gray-900">
                        {risk.evidenceRequirementTitleKo}
                      </h3>
                      <StatusPill
                        status={risk.severity}
                        label={getSeverityLabel(risk.severity)}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{risk.obligationTitleKo}</p>
                    <p className="text-sm text-gray-700">{risk.reason}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Obligation Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">의무사항별 상세 현황</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {scoreData.obligationScores.map((obligation) => (
            <div key={obligation.obligationId} className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="text-base font-medium text-gray-900">
                    {obligation.obligationTitleKo}
                  </h3>
                  <StatusPill
                    status={obligation.severity}
                    label={getSeverityLabel(obligation.severity)}
                  />
                  <span className="text-xs text-gray-500">가중치 {obligation.weightPercent}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-semibold ${getScoreColor(obligation.score)}`}>
                    {obligation.score}점
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-600 mr-1" />
                  <span>승인: {obligation.verifiedCount}개</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="w-4 h-4 text-yellow-600 mr-1" />
                  <span>검토중: {obligation.evidenceCount - obligation.verifiedCount - obligation.missingCount - obligation.flaggedCount}개</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mr-1" />
                  <span>수정필요: {obligation.flaggedCount}개</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="w-4 h-4 mr-1 flex items-center justify-center text-gray-400">−</span>
                  <span>미제출: {obligation.missingCount}개</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreColor(obligation.score).replace('text-', 'bg-')}`}
                  style={{ width: `${obligation.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getSeverityLabel(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'HIGH':
      return '높음'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    default:
      return severity
  }
}
