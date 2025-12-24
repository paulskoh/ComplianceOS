'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DocumentCheckIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { inspection } from '@/lib/api'

interface InspectionPack {
  id: string
  name: string
  domain: string
  startDate: string
  endDate: string
  status: string
  createdAt: string
  tenant: {
    companyName: string
  }
  artifacts: Array<{
    artifact: {
      id: string
      filename: string
      mimeType: string
      uploadedAt: string
      status: string
    }
  }>
  summaryS3Key?: string
  manifestS3Key?: string
  bundleS3Key?: string
}

const DOMAIN_LABELS: Record<string, string> = {
  PRIVACY: '개인정보보호',
  LABOR: '노동법',
  SECURITY: '정보보안',
  TRAINING: '교육훈련',
}

export default function InspectorReview() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pack, setPack] = useState<InspectionPack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadUrls, setDownloadUrls] = useState<any>(null)

  useEffect(() => {
    if (!token) {
      setError('접근 토큰이 필요합니다')
      setLoading(false)
      return
    }

    loadPack()
  }, [token])

  const loadPack = async () => {
    if (!token) return

    try {
      const response = await inspection.getPackByToken(token)
      setPack(response.data.pack)

      // Load download URLs
      if (response.data.pack.id) {
        // Note: We'll need to add a method to get download URLs via token
        // For now, we'll construct URLs based on S3 keys
        setDownloadUrls({
          summaryUrl: response.data.downloadUrls?.summaryUrl,
          manifestUrl: response.data.downloadUrls?.manifestUrl,
          bundleUrl: response.data.downloadUrls?.bundleUrl,
        })
      }
    } catch (err: any) {
      console.error('Failed to load pack:', err)
      if (err.response?.status === 404) {
        setError('점검팩을 찾을 수 없습니다')
      } else if (err.response?.status === 410) {
        setError('이 링크는 만료되었습니다')
      } else {
        setError('점검팩을 불러올 수 없습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            승인됨
          </span>
        )
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <DocumentCheckIcon className="h-4 w-4 mr-1" />
            분석 완료
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="h-4 w-4 mr-1" />
            반려됨
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            검토 중
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">점검팩을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">접근 오류</h3>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pack) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{pack.name}</h1>
                <p className="text-sm text-gray-500">
                  {pack.tenant.companyName} • {DOMAIN_LABELS[pack.domain] || pack.domain}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pack Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">점검팩 정보</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    <CalendarIcon className="inline h-4 w-4 mr-1" />
                    점검 기간
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(pack.startDate).toLocaleDateString('ko-KR')} ~{' '}
                    {new Date(pack.endDate).toLocaleDateString('ko-KR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
                    대상 기업
                  </dt>
                  <dd className="text-sm text-gray-900">{pack.tenant.companyName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">생성 일시</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(pack.createdAt).toLocaleString('ko-KR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">증빙 파일 수</dt>
                  <dd className="text-sm text-gray-900">{pack.artifacts.length}개</dd>
                </div>
              </dl>
            </div>

            {/* Artifacts List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                포함된 증빙 자료 ({pack.artifacts.length}개)
              </h2>
              {pack.artifacts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  포함된 증빙 자료가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {pack.artifacts.map(({ artifact }) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <DocumentCheckIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {artifact.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            업로드: {new Date(artifact.uploadedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4">{getStatusBadge(artifact.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Download Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">다운로드</h3>
              <div className="space-y-3">
                {downloadUrls?.summaryUrl && (
                  <a
                    href={downloadUrls.summaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">요약 보고서</p>
                        <p className="text-xs text-gray-500">PDF</p>
                      </div>
                    </div>
                    <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
                  </a>
                )}

                {downloadUrls?.manifestUrl && (
                  <a
                    href={downloadUrls.manifestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">매니페스트</p>
                        <p className="text-xs text-gray-500">JSON</p>
                      </div>
                    </div>
                    <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
                  </a>
                )}

                {downloadUrls?.bundleUrl && (
                  <a
                    href={downloadUrls.bundleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">전체 증빙</p>
                        <p className="text-xs text-gray-500">ZIP</p>
                      </div>
                    </div>
                    <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
                  </a>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">보안 안내</h4>
                  <p className="text-xs text-yellow-700">
                    본 점검팩은 암호화되어 있으며, 접근 로그가 기록됩니다.
                    다운로드한 파일은 점검 목적으로만 사용하시고 제3자에게 공유하지 마세요.
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">검증 정보</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">디지털 서명 적용</p>
                    <p className="text-xs text-gray-500">
                      모든 파일은 KMS로 서명되었습니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">변조 방지</p>
                    <p className="text-xs text-gray-500">
                      매니페스트로 무결성 검증 가능
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">접근 추적</p>
                    <p className="text-xs text-gray-500">
                      모든 접근 및 다운로드 기록됨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
