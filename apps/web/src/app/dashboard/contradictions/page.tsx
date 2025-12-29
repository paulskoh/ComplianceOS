'use client'

import { useEffect, useState } from 'react'
import { contradictions } from '@/lib/api'
import {
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import StatusPill from '@/components/StatusPill'

interface DocExcerpt {
  name: string
  value: string
  excerpt: string
  pageRef: number
}

interface Contradiction {
  id: string
  factType: string
  factTypeKo: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  docA: DocExcerpt
  docB: DocExcerpt
  descriptionKo: string
  resolutionKo: string
}

interface ContradictionResponse {
  total: number
  bySeverity: {
    high: number
    medium: number
    low: number
  }
  contradictions: Contradiction[]
}

export default function ContradictionsPage() {
  const [data, setData] = useState<ContradictionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchContradictions()
  }, [])

  const fetchContradictions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await contradictions.getAll()
      setData(response.data)
    } catch (err: any) {
      console.error('Failed to fetch contradictions:', err)
      setError('문서 간 모순 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '심각'
      case 'MEDIUM':
        return '중간'
      case 'LOW':
        return '낮음'
      default:
        return severity
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문서 간 모순 검출</h1>
          <p className="mt-1 text-sm text-gray-500">
            업로드된 문서들 간의 불일치 사항을 자동으로 검출합니다
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchContradictions}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">문서 간 모순 검출</h1>
        <p className="mt-1 text-sm text-gray-500">
          업로드된 문서들 간의 불일치 사항을 자동으로 검출합니다 (보관기간, 교육주기, 파기방법 등)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <DocumentDuplicateIcon className="w-8 h-8 text-gray-400" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{data?.total || 0}</p>
              <p className="text-sm text-gray-500">총 발견된 모순</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-red-700">{data?.bySeverity.high || 0}</p>
              <p className="text-sm text-red-600">심각</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-yellow-700">{data?.bySeverity.medium || 0}</p>
              <p className="text-sm text-yellow-600">중간</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-2xl font-bold text-blue-700">{data?.bySeverity.low || 0}</p>
              <p className="text-sm text-blue-600">낮음</p>
            </div>
          </div>
        </div>
      </div>

      {/* No contradictions state */}
      {(!data?.contradictions || data.contradictions.length === 0) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">모순 없음</h3>
          <p className="text-green-700">
            업로드된 문서들 간에 발견된 불일치 사항이 없습니다.
          </p>
        </div>
      )}

      {/* Contradiction List */}
      {data?.contradictions && data.contradictions.length > 0 && (
        <div className="space-y-4">
          {data.contradictions.map((contradiction) => (
            <div
              key={contradiction.id}
              className={`bg-white rounded-lg border-2 ${
                contradiction.severity === 'HIGH' ? 'border-red-300' :
                contradiction.severity === 'MEDIUM' ? 'border-yellow-300' :
                'border-blue-300'
              } overflow-hidden`}
            >
              {/* Header */}
              <div
                className={`px-6 py-4 cursor-pointer ${
                  contradiction.severity === 'HIGH' ? 'bg-red-50' :
                  contradiction.severity === 'MEDIUM' ? 'bg-yellow-50' :
                  'bg-blue-50'
                }`}
                onClick={() => setExpandedId(expandedId === contradiction.id ? null : contradiction.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(contradiction.severity)}`}>
                      {getSeverityLabel(contradiction.severity)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {contradiction.factTypeKo}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {contradiction.descriptionKo}
                    </span>
                  </div>
                  <ArrowsRightLeftIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Document A */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {contradiction.docA.name}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        p.{contradiction.docA.pageRef}
                      </span>
                    </div>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold bg-white border-2 border-gray-300 text-gray-900">
                        {contradiction.docA.value}
                      </span>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm text-gray-700 italic">
                        "{contradiction.docA.excerpt}"
                      </p>
                    </div>
                  </div>

                  {/* Document B */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {contradiction.docB.name}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        p.{contradiction.docB.pageRef}
                      </span>
                    </div>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold bg-white border-2 border-gray-300 text-gray-900">
                        {contradiction.docB.value}
                      </span>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm text-gray-700 italic">
                        "{contradiction.docB.excerpt}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resolution Suggestion */}
                {(expandedId === contradiction.id || true) && contradiction.resolutionKo && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <LightBulbIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">해결 방안</p>
                        <p className="text-sm text-blue-800">{contradiction.resolutionKo}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
