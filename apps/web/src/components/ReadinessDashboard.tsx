'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { readiness } from '@/lib/api'

interface ReadinessScore {
  overallScore: number
  level: string
  breakdown: {
    totalPossiblePoints: number
    earnedPoints: number
    criticalRequirements: { total: number; completed: number; percentage: number }
    highRequirements: { total: number; completed: number; percentage: number }
    mediumRequirements: { total: number; completed: number; percentage: number }
    lowRequirements: { total: number; completed: number; percentage: number }
  }
  topRisks: Array<{
    obligationId: string
    obligationTitle: string
    severity: string
    missingRequirements: number
    impact: number
  }>
}

export default function ReadinessDashboard() {
  const [score, setScore] = useState<ReadinessScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await readiness.getScoreV2()
        setScore(response.data)
      } catch (error) {
        console.error('Failed to fetch readiness score:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchScore()
  }, [])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return 'text-green-600'
      case 'GOOD':
        return 'text-blue-600'
      case 'FAIR':
        return 'text-yellow-600'
      case 'POOR':
        return 'text-orange-600'
      case 'CRITICAL':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return '우수'
      case 'GOOD':
        return '양호'
      case 'FAIR':
        return '보통'
      case 'POOR':
        return '미흡'
      case 'CRITICAL':
        return '위험'
      default:
        return level
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '매우 높음'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">준비도 점수 없음</h3>
        <p className="mt-1 text-sm text-gray-500">
          온보딩을 완료하고 증빙 자료를 업로드하면 점수가 계산됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-100 mb-4">
            <span className="text-4xl font-bold text-blue-600">{score.overallScore}</span>
          </div>
          <h2 className={`text-2xl font-bold ${getLevelColor(score.level)}`}>
            {getLevelText(score.level)}
          </h2>
          <p className="mt-1 text-sm text-gray-500">전체 준비도</p>
        </div>
      </div>

      {/* Breakdown by Severity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">중요도별 진행 현황</h3>
        <div className="space-y-4">
          {[
            { key: 'criticalRequirements', label: '매우 높음 (CRITICAL)', color: 'red' },
            { key: 'highRequirements', label: '높음 (HIGH)', color: 'orange' },
            { key: 'mediumRequirements', label: '보통 (MEDIUM)', color: 'yellow' },
            { key: 'lowRequirements', label: '낮음 (LOW)', color: 'blue' },
          ].map(({ key, label, color }) => {
            const data = score.breakdown[key as keyof typeof score.breakdown] as {
              total: number
              completed: number
              percentage: number
            }
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm text-gray-500">
                    {data.completed} / {data.total} ({data.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top 3 Risks */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">상위 3대 리스크</h3>
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
        </div>

        {score.topRisks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm text-gray-600">식별된 주요 리스크가 없습니다!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {score.topRisks.map((risk, index) => (
              <div
                key={risk.obligationId}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(risk.severity)}`}>
                        {getSeverityText(risk.severity)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {risk.obligationTitle}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      미제출 증빙: {risk.missingRequirements}개 • 영향도: {risk.impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ChartBarIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">준비도 점수 계산 방식</p>
            <p className="text-xs text-blue-700">
              각 의무사항의 중요도에 따라 가중치가 부여됩니다 (매우 높음: 20%, 높음: 15%, 보통: 10%, 낮음: 5%).
              증빙 자료 제출 완료율에 따라 점수가 계산됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
