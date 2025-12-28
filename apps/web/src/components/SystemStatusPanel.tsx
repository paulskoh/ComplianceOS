'use client'

import { useState, useEffect } from 'react'
import { health } from '@/lib/api'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface AIHealthStatus {
  status: string
  openai: { available: boolean; model: string }
  extractionPipeline: { available: boolean; method: string }
  lastAnalysis?: { timestamp: string; artifactId: string; status: string }
}

export default function SystemStatusPanel() {
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await health.getAIHealth()
        setAiHealth(response.data)
        setError(null)
      } catch (err) {
        setError('연결 실패')
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="animate-pulse flex space-x-2">
            <div className="rounded-full bg-gray-300 h-3 w-3"></div>
            <div className="h-3 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
      </div>
    )
  }

  const isHealthy = aiHealth?.openai?.available && aiHealth?.extractionPipeline?.available
  const StatusIcon = error ? XCircleIcon : isHealthy ? CheckCircleIcon : ExclamationTriangleIcon
  const statusColor = error ? 'text-red-500' : isHealthy ? 'text-green-500' : 'text-yellow-500'
  const bgColor = error ? 'bg-red-50 border-red-200' : isHealthy ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'

  return (
    <div className="px-3 py-2">
      <div className={`rounded-lg p-3 border ${bgColor}`}>
        <div className="flex items-center space-x-2 mb-2">
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <span className="text-xs font-medium text-gray-700">시스템 상태</span>
        </div>

        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">AI 분석</span>
              <span className={aiHealth?.openai?.available ? 'text-green-600' : 'text-red-600'}>
                {aiHealth?.openai?.available ? '정상' : '오류'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">문서 추출</span>
              <span className={aiHealth?.extractionPipeline?.available ? 'text-green-600' : 'text-red-600'}>
                {aiHealth?.extractionPipeline?.available ? '정상' : '오류'}
              </span>
            </div>
            {aiHealth?.lastAnalysis && (
              <div className="pt-1 mt-1 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  마지막 분석: {new Date(aiHealth.lastAnalysis.timestamp).toLocaleTimeString('ko-KR')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
