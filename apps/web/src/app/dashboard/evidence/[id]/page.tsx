'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { evidenceRequirements, artifacts } from '@/lib/api'
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import StatusPill from '@/components/StatusPill'
import UploadModal from '@/components/UploadModal'
import FindingsSummary from '@/components/FindingsSummary'

interface LatestRun {
  status: string
  statusKo: string
  model?: string
  latencyMs?: number
  tokensIn?: number
  tokensOut?: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

interface Artifact {
  artifactId: string
  version: number
  filename: string
  uploadedAt: string
  status: string
  isApproved: boolean
  analysis: {
    overallStatus: string
    score: number
    summaryKo: string
    findings: any[]
    citations?: any[]
  } | null
  latestRun?: LatestRun | null
}

interface EvidenceRequirementDetail {
  id: string
  titleKo: string
  descriptionKo: string
  status: string
  artifacts: Artifact[]
  latestAnalysis: {
    overallStatus: string
    score: number
    summaryKo: string
    findings: any[]
  } | null
}

// Analysis lifecycle states
type AnalysisState = 'PENDING' | 'UPLOADED' | 'ANALYZING' | 'ANALYZED' | 'NEEDS_REVIEW' | 'APPROVED'

function getAnalysisState(artifact: Artifact): AnalysisState {
  if (artifact.isApproved) return 'APPROVED'
  if (artifact.analysis) {
    const hasIssues = artifact.analysis.findings?.some((f: any) =>
      f.severity === 'CRITICAL' || f.severity === 'HIGH'
    )
    return hasIssues ? 'NEEDS_REVIEW' : 'ANALYZED'
  }
  if (artifact.status === 'ANALYZING') return 'ANALYZING'
  if (artifact.status === 'READY') return 'UPLOADED'
  return 'PENDING'
}

function AnalysisStatusBadge({ state }: { state: AnalysisState }) {
  const configs: Record<AnalysisState, { label: string; icon: any; className: string }> = {
    PENDING: {
      label: '대기중',
      icon: ArrowPathIcon,
      className: 'bg-gray-100 text-gray-600',
    },
    UPLOADED: {
      label: '업로드됨',
      icon: DocumentCheckIcon,
      className: 'bg-blue-50 text-blue-700',
    },
    ANALYZING: {
      label: 'AI 분석중',
      icon: ArrowPathIcon,
      className: 'bg-yellow-50 text-yellow-700 animate-pulse',
    },
    ANALYZED: {
      label: '분석완료',
      icon: ClipboardDocumentCheckIcon,
      className: 'bg-green-50 text-green-700',
    },
    NEEDS_REVIEW: {
      label: '검토필요',
      icon: ExclamationTriangleIcon,
      className: 'bg-orange-50 text-orange-700',
    },
    APPROVED: {
      label: '승인됨',
      icon: CheckCircleSolidIcon,
      className: 'bg-green-100 text-green-800',
    },
  }

  const config = configs[state]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 mr-1 ${state === 'ANALYZING' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}

export default function EvidenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const evidenceReqId = params.id as string

  const [data, setData] = useState<EvidenceRequirementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [evidenceReqId])

  // Poll for analysis updates if any artifact is in ANALYZING state
  useEffect(() => {
    if (!data) return

    const hasAnalyzing = data.artifacts.some(a => a.status === 'ANALYZING')
    if (hasAnalyzing && !polling) {
      setPolling(true)
      const interval = setInterval(async () => {
        try {
          const response = await evidenceRequirements.getOne(evidenceReqId)
          setData(response.data)

          // Stop polling if no more analyzing
          const stillAnalyzing = response.data.artifacts.some((a: Artifact) => a.status === 'ANALYZING')
          if (!stillAnalyzing) {
            clearInterval(interval)
            setPolling(false)
          }
        } catch (e) {
          console.error('Polling error:', e)
        }
      }, 5000) // Poll every 5 seconds

      return () => {
        clearInterval(interval)
        setPolling(false)
      }
    }
  }, [data, polling, evidenceReqId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await evidenceRequirements.getOne(evidenceReqId)
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch evidence requirement detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = () => {
    setUploadModalOpen(false)
    fetchData()
  }

  const handleDownloadArtifact = async (artifactId: string) => {
    try {
      const response = await artifacts.getOne(artifactId)
      const downloadUrl = response.data.downloadUrl
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Failed to download artifact:', error)
    }
  }

  const handleApproveArtifact = async (artifactId: string) => {
    try {
      setApproving(artifactId)
      await artifacts.approve(artifactId)
      fetchData()
    } catch (error) {
      console.error('Failed to approve artifact:', error)
    } finally {
      setApproving(null)
    }
  }

  const handleRetryAnalysis = async (artifactId: string) => {
    try {
      setRetrying(artifactId)
      await artifacts.retryAnalysis(artifactId)
      // Refresh data to show new analysis status
      fetchData()
    } catch (error) {
      console.error('Failed to retry analysis:', error)
    } finally {
      setRetrying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">증빙 요구사항을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/dashboard/evidence')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          증빙 목록으로 돌아가기
        </button>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{data.titleKo}</h1>
              <StatusPill status={data.status} label={getStatusLabel(data.status)} />
            </div>
            <p className="text-gray-600">{data.descriptionKo}</p>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
          >
            <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
            새 버전 업로드
          </button>
        </div>
      </div>

      {/* Analysis Lifecycle Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">증빙 처리 단계</h3>
        <div className="flex items-center space-x-4 text-xs text-blue-700">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
            업로드
          </span>
          <span className="text-blue-400">→</span>
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
            AI 분석
          </span>
          <span className="text-blue-400">→</span>
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
            분석완료
          </span>
          <span className="text-blue-400">→</span>
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-600 mr-1"></span>
            승인
          </span>
        </div>
      </div>

      {data.latestAnalysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <ClipboardDocumentCheckIcon className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">AI 분석 결과</h2>
          </div>
          <FindingsSummary analysis={data.latestAnalysis} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">업로드 히스토리</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {data.artifacts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">아직 업로드된 파일이 없습니다</p>
              <p className="text-sm mt-1">증빙 자료를 업로드하면 AI가 자동으로 분석합니다</p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                첫 파일 업로드하기
              </button>
            </div>
          ) : (
            data.artifacts.map((artifact) => {
              const analysisState = getAnalysisState(artifact)

              return (
                <div key={artifact.artifactId} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {artifact.filename}
                        </p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          v{artifact.version}
                        </span>
                        <AnalysisStatusBadge state={analysisState} />
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(artifact.uploadedAt).toLocaleString('ko-KR')}
                      </p>

                      {artifact.analysis && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">AI 분석 요약</span>
                            {artifact.analysis.score !== undefined && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                artifact.analysis.score >= 80 ? 'bg-green-100 text-green-700' :
                                artifact.analysis.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                적합도: {artifact.analysis.score}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{artifact.analysis.summaryKo}</p>
                          {artifact.analysis.findings && artifact.analysis.findings.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              {artifact.analysis.findings.length}개 발견사항
                            </p>
                          )}
                        </div>
                      )}

                      {analysisState === 'ANALYZING' && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center">
                            <ArrowPathIcon className="w-4 h-4 text-yellow-600 mr-2 animate-spin" />
                            <span className="text-sm text-yellow-700">
                              AI가 문서를 분석하고 있습니다... 잠시만 기다려주세요.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Run status and error display */}
                      {artifact.latestRun && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          artifact.latestRun.status === 'FAILED'
                            ? 'bg-red-50 border-red-200'
                            : artifact.latestRun.status === 'SUCCEEDED'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${
                              artifact.latestRun.status === 'FAILED' ? 'text-red-700' :
                              artifact.latestRun.status === 'SUCCEEDED' ? 'text-green-700' :
                              'text-gray-600'
                            }`}>
                              분석 상태: {artifact.latestRun.statusKo || artifact.latestRun.status}
                            </span>
                            <div className="flex items-center space-x-2 text-gray-500">
                              {artifact.latestRun.model && (
                                <span>모델: {artifact.latestRun.model}</span>
                              )}
                              {artifact.latestRun.latencyMs && (
                                <span>{(artifact.latestRun.latencyMs / 1000).toFixed(1)}초</span>
                              )}
                            </div>
                          </div>
                          {artifact.latestRun.errorMessage && (
                            <p className="mt-2 text-xs text-red-600">
                              오류: {artifact.latestRun.errorMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {(artifact.status === 'READY' || analysisState !== 'PENDING') && (
                        <>
                          <button
                            onClick={() => handleDownloadArtifact(artifact.artifactId)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            다운로드
                          </button>
                          {/* Retry button - show when analysis failed or needs re-run */}
                          {(artifact.latestRun?.status === 'FAILED' ||
                            (analysisState !== 'ANALYZING' && !artifact.analysis)) && (
                            <button
                              onClick={() => handleRetryAnalysis(artifact.artifactId)}
                              disabled={retrying === artifact.artifactId}
                              className="inline-flex items-center px-3 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50"
                            >
                              <ArrowPathIcon className={`w-4 h-4 mr-1 ${retrying === artifact.artifactId ? 'animate-spin' : ''}`} />
                              {retrying === artifact.artifactId ? '분석중...' : '재분석'}
                            </button>
                          )}
                          {!artifact.isApproved && analysisState !== 'ANALYZING' && (
                            <button
                              onClick={() => handleApproveArtifact(artifact.artifactId)}
                              disabled={approving === artifact.artifactId}
                              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              {approving === artifact.artifactId ? '승인중...' : '승인'}
                            </button>
                          )}
                          {artifact.isApproved && (
                            <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md">
                              <CheckCircleSolidIcon className="w-4 h-4 mr-1" />
                              승인됨
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        evidenceRequirementId={evidenceReqId}
      />
    </div>
  )
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'MISSING':
      return '미제출'
    case 'UPLOADED':
      return '검토중'
    case 'VERIFIED':
      return '승인완료'
    case 'FLAGGED':
      return '수정필요'
    case 'EXPIRED':
      return '만료됨'
    default:
      return status
  }
}
