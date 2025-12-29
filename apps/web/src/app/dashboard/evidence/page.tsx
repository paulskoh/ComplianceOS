'use client'

import { useEffect, useState } from 'react'
import { evidenceRequirements } from '@/lib/api'
import Link from 'next/link'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import UploadModal from '@/components/UploadModal'
import StatusPill from '@/components/StatusPill'
import ErrorState, { EmptyState } from '@/components/ErrorState'

type EvidenceStatus = 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'FLAGGED'

interface LatestArtifact {
  artifactId: string
  version: number
  filename: string
  uploadedAt: string
}

interface LatestAnalysis {
  overallStatus: string
  score: number
  summaryKo: string
  findings: any[]
}

interface EvidenceRequirement {
  id: string
  titleKo: string
  descriptionKo: string
  status: EvidenceStatus
  obligationId: string
  obligationTitleKo: string
  obligationSeverity: string
  controlId: string
  controlName: string
  latestArtifact: LatestArtifact | null
  latestAnalysis: LatestAnalysis | null
  updatedAt: string
}

interface Obligation {
  id: string
  titleKo: string
  severity: string
}

interface ObligationGroup {
  obligation: Obligation
  evidenceRequirements: EvidenceRequirement[]
}

export default function EvidencePage() {
  const [data, setData] = useState<ObligationGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedEvidenceReqId, setSelectedEvidenceReqId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await evidenceRequirements.getOverview()
      setData(response.data.obligations || [])
    } catch (err: any) {
      console.error('Failed to fetch evidence requirements:', err)
      // SOFT-LAUNCH: Graceful error handling with user-friendly message
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다. 다시 로그인해 주세요.')
      } else if (err.response?.status === 403) {
        setError('이 페이지에 접근할 권한이 없습니다.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.')
      } else {
        setError('증빙 요구사항을 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = (evidenceReqId: string) => {
    setSelectedEvidenceReqId(evidenceReqId)
    setUploadModalOpen(true)
  }

  const handleUploadSuccess = () => {
    setUploadModalOpen(false)
    setSelectedEvidenceReqId(null)
    fetchData() // Refresh data
  }

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
          <h1 className="text-2xl font-bold text-gray-900">증빙 제출</h1>
          <p className="mt-1 text-sm text-gray-500">
            개인정보 보호법 준수를 위해 필요한 증빙 자료를 제출하세요
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200">
          <ErrorState
            title="데이터 로드 실패"
            message={error}
            onRetry={fetchData}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">증빙 제출</h1>
          <p className="mt-1 text-sm text-gray-500">
            개인정보 보호법 준수를 위해 필요한 증빙 자료를 제출하세요
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <EmptyState
            title="아직 증빙 요구사항이 없습니다"
            message="온보딩을 완료하면 귀사에 적용되는 규제에 따라 증빙 요구사항이 자동으로 생성됩니다."
            action={{
              label: '온보딩 시작하기',
              onClick: () => window.location.href = '/onboarding',
            }}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {data.map((group) => (
            <div key={group.obligation.id} className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {group.obligation.titleKo}
                    </h2>
                    <StatusPill
                      status={group.obligation.severity}
                      label={getSeverityLabel(group.obligation.severity)}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.evidenceRequirements.length}개 증빙 항목
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {group.evidenceRequirements.map((req) => (
                    <Link
                      key={req.id}
                      href={`/dashboard/evidence/${req.id}`}
                      className="block border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-base font-medium text-gray-900">
                              {req.titleKo}
                            </h3>
                            <StatusPill
                              status={req.status}
                              label={getStatusLabel(req.status)}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {req.descriptionKo}
                          </p>

                          {req.latestArtifact && (
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                {req.latestArtifact.filename}
                              </span>
                              <span>
                                v{req.latestArtifact.version}
                              </span>
                              <span>
                                {new Date(req.latestArtifact.uploadedAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          )}

                          {req.latestAnalysis && (
                            <div className="mt-2 text-sm text-gray-700">
                              <p className="line-clamp-2">{req.latestAnalysis.summaryKo}</p>
                            </div>
                          )}
                        </div>

                        {/* Analysis Score & Status Signal */}
                        <div className="flex-shrink-0 flex flex-col items-end space-y-2 mr-4">
                          {req.latestAnalysis ? (
                            <>
                              {/* Score Badge */}
                              <div className={`flex items-center px-2.5 py-1 rounded-lg text-sm font-bold ${
                                req.latestAnalysis.score >= 80 ? 'bg-green-100 text-green-800' :
                                req.latestAnalysis.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                req.latestAnalysis.overallStatus === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {req.latestAnalysis.overallStatus === 'NEEDS_REVIEW' ? (
                                  <>
                                    <DocumentMagnifyingGlassIcon className="w-4 h-4 mr-1" />
                                    판단불가
                                  </>
                                ) : (
                                  <>
                                    {req.latestAnalysis.score >= 80 ? (
                                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                                    ) : req.latestAnalysis.score >= 60 ? (
                                      <ClockIcon className="w-4 h-4 mr-1" />
                                    ) : (
                                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                    )}
                                    {req.latestAnalysis.score}%
                                  </>
                                )}
                              </div>
                              {/* Findings count */}
                              {req.latestAnalysis.findings && req.latestAnalysis.findings.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {req.latestAnalysis.findings.length}개 발견사항
                                </span>
                              )}
                            </>
                          ) : req.status === 'MISSING' ? (
                            <span className="text-xs text-gray-400">미분석</span>
                          ) : (
                            <span className="text-xs text-blue-500 flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              분석중
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleUploadClick(req.id)
                          }}
                          className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <DocumentArrowUpIcon className="w-4 h-4 mr-1.5" />
                          업로드
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false)
          setSelectedEvidenceReqId(null)
        }}
        onSuccess={handleUploadSuccess}
        evidenceRequirementId={selectedEvidenceReqId || undefined}
      />
    </div>
  )
}

function getStatusLabel(status: EvidenceStatus): string {
  switch (status) {
    case 'MISSING':
      return '미제출'
    case 'UPLOADED':
      return '검토중'
    case 'VERIFIED':
      return '승인'
    case 'FLAGGED':
      return '수정필요'
    default:
      return status
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
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
