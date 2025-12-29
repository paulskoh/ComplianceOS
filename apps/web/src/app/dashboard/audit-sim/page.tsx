'use client'

import { useState } from 'react'
import { auditSimulation } from '@/lib/api'
import {
  PlayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

interface Evidence {
  artifactId: string
  artifactName: string
  excerpt: string
  page?: number
  locationLabel?: string
}

interface QuestionResponse {
  questionId: string
  determination: 'PASS' | 'WARN' | 'FAIL'
  determinationKo: string
  explanationKo: string
  evidenceFound: Evidence[]
  citationsKo?: string[]
}

interface Question {
  id: string
  order: number
  questionKo: string
  category: string
  controlRef: string
}

interface FinalReport {
  overallScore: number
  passCount: number
  warnCount: number
  failCount: number
  summaryKo: string
  recommendations: string[]
  gaps: Array<{
    questionId: string
    severity: string
    issue: string
    recommendation: string
  }>
}

type SimulationState = 'IDLE' | 'RUNNING' | 'COMPLETED'

export default function AuditSimulationPage() {
  const [state, setState] = useState<SimulationState>('IDLE')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [lastResponse, setLastResponse] = useState<QuestionResponse | null>(null)
  const [allResponses, setAllResponses] = useState<QuestionResponse[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 5 })
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSimulation = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await auditSimulation.start()
      setSessionId(response.data.sessionId)
      setCurrentQuestion(response.data.currentQuestion)
      setProgress({ current: 1, total: response.data.totalQuestions })
      setState('RUNNING')
      setAllResponses([])
      setLastResponse(null)
      setFinalReport(null)
    } catch (err: any) {
      console.error('Failed to start simulation:', err)
      setError('심사 시뮬레이션을 시작할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const processNextQuestion = async () => {
    if (!sessionId) return

    try {
      setLoading(true)
      setError(null)
      const response = await auditSimulation.processNext(sessionId)
      const data = response.data

      // Save the response
      setLastResponse(data.response)
      setAllResponses(prev => [...prev, data.response])

      // Update progress
      setProgress(data.progress)

      if (data.isCompleted) {
        setState('COMPLETED')
        setFinalReport(data.finalReport)
        setCurrentQuestion(null)
      } else {
        setCurrentQuestion(data.nextQuestion)
      }
    } catch (err: any) {
      console.error('Failed to process question:', err)
      setError('질문 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getDeterminationBadge = (determination: string) => {
    switch (determination) {
      case 'PASS':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-800 border-2 border-green-300">
            <CheckCircleSolidIcon className="w-5 h-5 mr-1.5" />
            적합
          </span>
        )
      case 'WARN':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
            <ExclamationTriangleIcon className="w-5 h-5 mr-1.5" />
            보완 필요
          </span>
        )
      case 'FAIL':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-800 border-2 border-red-300">
            <XCircleIcon className="w-5 h-5 mr-1.5" />
            미흡
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">K-ISMS 심사 시뮬레이션</h1>
          <p className="mt-1 text-sm text-gray-500">
            가상 심사원이 귀사의 준비 상태를 점검합니다
          </p>
        </div>
        {state !== 'IDLE' && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>진행률:</span>
            <span className="font-bold">{progress.current} / {progress.total}</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Idle State - Start Button */}
      {state === 'IDLE' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            심사 시뮬레이션 시작
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            가상 K-ISMS 심사원이 5개의 핵심 질문을 통해 귀사의 개인정보보호 준비 상태를 점검합니다.
            각 질문에 대해 시스템이 자동으로 관련 증빙을 검색하고 적합 여부를 판단합니다.
          </p>
          <button
            onClick={startSimulation}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            {loading ? '시작하는 중...' : '심사 시작하기'}
          </button>
        </div>
      )}

      {/* Running State - Current Question */}
      {state === 'RUNNING' && currentQuestion && (
        <div className="space-y-6">
          {/* Auditor Question Card */}
          <div className="bg-white rounded-lg border-2 border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">심사원 질문 #{currentQuestion.order}</p>
                    <p className="text-xs text-blue-500">{currentQuestion.category} | {currentQuestion.controlRef}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-lg font-medium text-gray-900 mb-6">
                "{currentQuestion.questionKo}"
              </p>
              <button
                onClick={processNextQuestion}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    증빙 검색 및 판정 중...
                  </>
                ) : (
                  <>
                    자동 증빙 검색 및 판정
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Last Response */}
          {lastResponse && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">이전 질문 결과</span>
                {getDeterminationBadge(lastResponse.determination)}
              </div>
              <div className="p-6">
                <p className="text-gray-800 mb-4">{lastResponse.explanationKo}</p>

                {/* Evidence Found */}
                {lastResponse.evidenceFound && lastResponse.evidenceFound.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                      <DocumentTextIcon className="w-4 h-4 mr-1" />
                      발견된 증빙 ({lastResponse.evidenceFound.length}건)
                    </p>
                    <div className="space-y-2">
                      {lastResponse.evidenceFound.map((evidence, idx) => (
                        <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{evidence.artifactName}</p>
                          {evidence.locationLabel && (
                            <p className="text-xs text-gray-500">{evidence.locationLabel}</p>
                          )}
                          {evidence.excerpt && (
                            <p className="text-sm text-gray-600 mt-1 italic">"{evidence.excerpt}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 rounded-lg p-4 text-red-700 text-sm">
                    관련 증빙을 찾을 수 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed State - Final Report */}
      {state === 'COMPLETED' && finalReport && (
        <div className="space-y-6">
          {/* Score Overview */}
          <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <ChartBarIcon className="w-6 h-6 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">심사 결과 요약</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className={`text-6xl font-bold ${
                  finalReport.overallScore >= 80 ? 'text-green-600' :
                  finalReport.overallScore >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {finalReport.overallScore}
                </div>
                <span className="text-2xl text-gray-500 ml-2">/ 100</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{finalReport.passCount}</p>
                  <p className="text-sm text-green-600">적합</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{finalReport.warnCount}</p>
                  <p className="text-sm text-yellow-600">보완 필요</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <XCircleIcon className="w-8 h-8 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{finalReport.failCount}</p>
                  <p className="text-sm text-red-600">미흡</p>
                </div>
              </div>

              <p className="text-gray-700">{finalReport.summaryKo}</p>
            </div>
          </div>

          {/* All Responses Summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <ClipboardDocumentListIcon className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-base font-semibold text-gray-900">질문별 결과</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {allResponses.map((response, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Q{idx + 1}</p>
                    <p className="text-sm text-gray-600">{response.explanationKo}</p>
                  </div>
                  <div className="ml-4">
                    {getDeterminationBadge(response.determination)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps & Recommendations */}
          {finalReport.gaps && finalReport.gaps.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                <h3 className="text-base font-semibold text-red-900">개선 필요 사항</h3>
              </div>
              <div className="divide-y divide-red-100">
                {finalReport.gaps.map((gap, idx) => (
                  <div key={idx} className="px-6 py-4">
                    <p className="text-sm font-medium text-red-900 mb-1">{gap.issue}</p>
                    <p className="text-sm text-red-700">{gap.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restart Button */}
          <div className="text-center">
            <button
              onClick={() => {
                setState('IDLE')
                setSessionId(null)
                setCurrentQuestion(null)
                setLastResponse(null)
                setAllResponses([])
                setFinalReport(null)
              }}
              className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              다시 시뮬레이션 시작
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
