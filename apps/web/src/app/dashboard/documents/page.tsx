'use client'

import { useState, useEffect } from 'react'
import { documentGen } from '@/lib/api'
import {
  SparklesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

interface Template {
  type: string
  regulationType: string
  name: string
  nameKo: string
  descriptionKo: string
  sections: string[]
  isSystemTemplate: boolean
}

interface GeneratedDocument {
  id: string
  title: string
  titleKo: string
  status: string
  templateType: string
  templateNameKo: string
  content: string
  docxDownloadUrl: string
  generationTime: number
  createdAt: string
}

const templateLabels: Record<string, { ko: string; description: string; icon: string }> = {
  PRIVACY_POLICY: {
    ko: '개인정보처리방침',
    description: '개인정보보호법 제30조에 따른 필수 문서',
    icon: '🔒'
  },
  INTERNAL_MANAGEMENT_PLAN: {
    ko: '내부관리계획',
    description: '개인정보보호법 시행령 제30조 요구사항',
    icon: '📋'
  },
  VENDOR_AGREEMENT: {
    ko: '위탁계약서',
    description: '개인정보 처리 위탁 시 필수 계약서',
    icon: '🤝'
  },
  CONSENT_FORM: {
    ko: '동의서',
    description: '개인정보 수집·이용 동의서',
    icon: '✍️'
  },
  WORK_RULES: {
    ko: '취업규칙',
    description: '근로기준법 제93조 필수 문서',
    icon: '📖'
  },
}

export default function DocumentGenerationPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GeneratedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate')

  useEffect(() => {
    loadTemplates()
    loadGeneratedDocs()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await documentGen.getTemplates()
      setTemplates(response.data)
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  const loadGeneratedDocs = async () => {
    try {
      const response = await documentGen.getGenerated()
      setGeneratedDocs(response.data)
    } catch (err) {
      console.error('Failed to load generated docs:', err)
    }
  }

  const handleGenerate = async (templateType: string) => {
    setSelectedTemplate(templateType)
    setIsGenerating(true)
    setError(null)
    setGenerationResult(null)

    try {
      const response = await documentGen.generate(templateType)
      setGenerationResult(response.data)
      loadGeneratedDocs()
    } catch (err: any) {
      setError(err.response?.data?.message || '문서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = async (docId: string) => {
    try {
      await documentGen.approve(docId)
      loadGeneratedDocs()
      if (generationResult?.id === docId) {
        setGenerationResult(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '문서 승인에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            초안
          </span>
        )
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            승인됨
          </span>
        )
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <DocumentTextIcon className="w-3 h-3 mr-1" />
            게시됨
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 문서 생성</h1>
          <p className="mt-1 text-sm text-gray-500">
            회사 정보를 기반으로 규정 준수 문서를 자동으로 생성합니다
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <SparklesIcon className="w-5 h-5 text-indigo-500" />
          <span>GPT-4o 기반</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generate'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            문서 생성
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            생성 기록 ({generatedDocs.length})
          </button>
        </nav>
      </div>

      {activeTab === 'generate' && (
        <>
          {/* Error Alert */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generation Result */}
          {generationResult && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-8 w-8 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">문서가 생성되었습니다!</h3>
                      <p className="text-indigo-100 text-sm">
                        {(generationResult.generationTime / 1000).toFixed(1)}초 소요
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={generationResult.docxDownloadUrl}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      DOCX 다운로드
                    </a>
                    <button
                      onClick={() => handleApprove(generationResult.id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      증빙으로 등록
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <h4 className="font-medium text-gray-900 mb-2">{generationResult.titleKo}</h4>
                <div className="prose prose-sm max-w-none text-gray-600 max-h-64 overflow-y-auto bg-gray-50 p-4 rounded">
                  <pre className="whitespace-pre-wrap text-xs">{generationResult.content}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Template Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(templateLabels).map(([type, info]) => (
              <div
                key={type}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                  selectedTemplate === type && isGenerating
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{info.ko}</h3>
                        <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={isGenerating}
                    className={`mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors ${
                      isGenerating && selectedTemplate === type
                        ? 'bg-indigo-100 text-indigo-700 cursor-wait'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } disabled:opacity-50`}
                  >
                    {isGenerating && selectedTemplate === type ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        생성하기
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4">작동 방식</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">1</div>
                <div>
                  <p className="font-medium text-gray-900">회사 정보 분석</p>
                  <p className="text-sm text-gray-500">온보딩 시 입력한 정보 활용</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">2</div>
                <div>
                  <p className="font-medium text-gray-900">AI 문서 작성</p>
                  <p className="text-sm text-gray-500">GPT-4o가 맞춤 문서 생성</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">3</div>
                <div>
                  <p className="font-medium text-gray-900">DOCX 출력</p>
                  <p className="text-sm text-gray-500">전문적인 한글 문서 형식</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">4</div>
                <div>
                  <p className="font-medium text-gray-900">증빙 등록</p>
                  <p className="text-sm text-gray-500">승인 후 자동으로 증빙 연결</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  문서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {generatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p>생성된 문서가 없습니다.</p>
                    <p className="text-sm mt-1">위에서 문서를 생성해보세요.</p>
                  </td>
                </tr>
              ) : (
                generatedDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.titleKo}</div>
                          <div className="text-sm text-gray-500">
                            {templateLabels[doc.templateType]?.ko || doc.templateType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {doc.docxDownloadUrl && (
                        <a
                          href={doc.docxDownloadUrl}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          다운로드
                        </a>
                      )}
                      {doc.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprove(doc.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          승인
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
