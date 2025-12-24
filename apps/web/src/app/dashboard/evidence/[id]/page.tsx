'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { evidenceRequirements, artifacts } from '@/lib/api'
import { ArrowLeftIcon, DocumentArrowUpIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import StatusPill from '@/components/StatusPill'
import UploadModal from '@/components/UploadModal'
import FindingsSummary from '@/components/FindingsSummary'

interface Artifact {
  artifactId: string
  version: number
  filename: string
  uploadedAt: string
  status: string
  analysis: {
    overallStatus: string
    score: number
    summaryKo: string
    findings: any[]
  } | null
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

export default function EvidenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const evidenceReqId = params.id as string

  const [data, setData] = useState<EvidenceRequirementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [evidenceReqId])

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
              <p>아직 업로드된 파일이 없습니다.</p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                첫 파일 업로드하기
              </button>
            </div>
          ) : (
            data.artifacts.map((artifact) => (
              <div key={artifact.artifactId} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {artifact.filename}
                      </p>
                      <span className="text-xs text-gray-500">v{artifact.version}</span>
                      <StatusPill
                        status={artifact.status}
                        label={getArtifactStatusLabel(artifact.status)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(artifact.uploadedAt).toLocaleString('ko-KR')}
                    </p>

                    {artifact.analysis && (
                      <div className="mt-3 text-sm text-gray-700">
                        <p className="line-clamp-2">{artifact.analysis.summaryKo}</p>
                        {artifact.analysis.findings && artifact.analysis.findings.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {artifact.analysis.findings.length}개 발견사항
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {artifact.status === 'READY' && (
                      <button
                        onClick={() => handleDownloadArtifact(artifact.artifactId)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        다운로드
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
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
      return '승인'
    case 'FLAGGED':
      return '수정필요'
    case 'EXPIRED':
      return '만료됨'
    default:
      return status
  }
}

function getArtifactStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return '대기중'
    case 'UPLOADING':
      return '업로드중'
    case 'READY':
      return '완료'
    case 'ANALYZING':
      return '분석중'
    case 'FAILED':
      return '실패'
    default:
      return status
  }
}
