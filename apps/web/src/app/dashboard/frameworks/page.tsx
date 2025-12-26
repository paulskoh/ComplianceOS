'use client'

import { useEffect, useState } from 'react'
import { frameworks as frameworksApi } from '@/lib/api'
import { BookOpenIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import ErrorState from '@/components/ErrorState'

interface Framework {
  code: string
  name: string
  nameKo: string
  description: string
  domains: string[]
  version: string
  isActive: boolean
  comingSoon?: boolean
  obligationCount: number
}

interface DomainDetail {
  domain: string
  obligationCount: number
  obligations: Array<{
    code: string
    title: string
    titleKo: string
    severity: string
    evidenceFrequency: string
  }>
}

export default function FrameworksPage() {
  const [frameworkList, setFrameworkList] = useState<Framework[]>([])
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null)
  const [domainDetails, setDomainDetails] = useState<DomainDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchFrameworks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await frameworksApi.getAll()
      setFrameworkList(response.data.frameworks || [])
      if (response.data.frameworks?.length > 0) {
        const activeFramework = response.data.frameworks.find((f: Framework) => f.isActive)
        if (activeFramework) {
          await selectFramework(activeFramework)
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch frameworks:', err)
      // SOFT-LAUNCH: Graceful error handling with user-friendly message
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다. 다시 로그인해 주세요.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.')
      } else {
        setError('프레임워크 목록을 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFrameworks()
  }, [])

  const selectFramework = async (framework: Framework) => {
    setSelectedFramework(framework)
    if (framework.isActive) {
      try {
        const response = await frameworksApi.getOne(framework.code)
        setDomainDetails(response.data.domains || [])
      } catch (error) {
        console.error('Failed to fetch framework details:', error)
      }
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDomainLabel = (domain: string) => {
    const labels: Record<string, string> = {
      PRIVACY: 'Privacy (개인정보)',
      LABOR: 'Labor (근로)',
      SECURITY: 'Security (보안)',
      TRAINING: 'Training (교육)',
      CONTRACTS: 'Contracts (계약)',
      FINANCE: 'Finance (재무)',
    }
    return labels[domain] || domain
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
          <h1 className="text-2xl font-bold text-gray-900">Compliance Frameworks</h1>
          <p className="mt-1 text-sm text-gray-500">
            View the compliance frameworks and requirements your organization is evaluated against
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200">
          <ErrorState
            title="데이터 로드 실패"
            message={error}
            onRetry={fetchFrameworks}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Frameworks</h1>
          <p className="mt-1 text-sm text-gray-500">
            View the compliance frameworks and requirements your organization is evaluated against
          </p>
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {frameworkList.map((framework) => (
          <div
            key={framework.code}
            onClick={() => !framework.comingSoon && selectFramework(framework)}
            className={`bg-white rounded-lg border p-6 ${
              framework.comingSoon
                ? 'opacity-60 cursor-not-allowed'
                : selectedFramework?.code === framework.code
                ? 'border-blue-500 ring-2 ring-blue-100 cursor-pointer'
                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}
          >
            <div className="flex items-start justify-between">
              <BookOpenIcon className="w-8 h-8 text-blue-600" />
              {framework.comingSoon && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Coming Soon
                </span>
              )}
              {framework.isActive && !framework.comingSoon && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Active
                </span>
              )}
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">{framework.nameKo}</h3>
            <p className="text-sm text-gray-600">{framework.name}</p>
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">{framework.description}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">{framework.obligationCount} obligations</span>
              <span className="text-gray-400">v{framework.version}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Framework Details */}
      {selectedFramework && selectedFramework.isActive && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedFramework.nameKo} - Framework Requirements
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              These are the compliance requirements your organization is evaluated against.
            </p>
          </div>

          {/* Domains */}
          <div className="divide-y divide-gray-200">
            {domainDetails.map((domain) => (
              <div key={domain.domain} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400 mr-2" />
                    {getDomainLabel(domain.domain)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {domain.obligationCount} obligations
                  </span>
                </div>

                <div className="space-y-3 ml-7">
                  {domain.obligations.map((obligation) => (
                    <div
                      key={obligation.code}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {obligation.titleKo || obligation.title}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${getSeverityBadge(
                              obligation.severity
                            )}`}
                          >
                            {obligation.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Code: {obligation.code} | Frequency: {obligation.evidenceFrequency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900">Understanding Your Compliance Requirements</h3>
        <p className="text-sm text-blue-800 mt-1">
          Each obligation represents a legal or regulatory requirement that your organization must comply with.
          Obligations are organized by domain and each has associated controls and evidence requirements
          that define how compliance is measured.
        </p>
      </div>
    </div>
  )
}
