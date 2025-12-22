'use client'

import { useEffect, useState } from 'react'
import { plans } from '@/lib/api'

interface UsageLimit {
  used: number
  max: number
  unit?: string
}

interface PlanUsage {
  plan: string
  limits: {
    obligations: UsageLimit
    integrations: UsageLimit
    packsThisMonth: UsageLimit
    storage: UsageLimit
    users: UsageLimit
  }
  billingPeriod: {
    start: Date
    end: Date
  }
}

export function PlanUsageMeter() {
  const [usage, setUsage] = useState<PlanUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsage()
  }, [])

  const loadUsage = async () => {
    try {
      const res = await plans.getUsage()
      setUsage(res.data)
    } catch (err) {
      console.error('Failed to load plan usage:', err)
      setError('플랜 사용량을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getPercentage = (used: number, max: number) => {
    if (max === 0) return 0
    return Math.min(100, (used / max) * 100)
  }

  const getLimitLabel = (key: string) => {
    const labels: Record<string, string> = {
      obligations: '의무사항',
      integrations: '연동',
      packsThisMonth: '이번 달 팩 생성',
      storage: '저장공간',
      users: '사용자',
    }
    return labels[key] || key
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!usage) return null

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">플랜 사용량</h3>
        <span className="px-3 py-1 bg-gray-900 text-white text-sm rounded-md">
          {usage.plan}
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(usage.limits).map(([key, limit]) => {
          const pct = getPercentage(limit.used, limit.max)
          const isNearLimit = pct > 80
          const isAtLimit = pct >= 100

          return (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">
                  {getLimitLabel(key)}
                </span>
                <span
                  className={`${
                    isAtLimit
                      ? 'text-red-600 font-semibold'
                      : isNearLimit
                      ? 'text-yellow-600 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {limit.used.toFixed(limit.unit === 'GB' ? 2 : 0)} /{' '}
                  {limit.max} {limit.unit || ''}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    isAtLimit
                      ? 'bg-red-500'
                      : isNearLimit
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isAtLimit && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ 한도에 도달했습니다. 플랜을 업그레이드하세요.
                </p>
              )}
              {isNearLimit && !isAtLimit && (
                <p className="text-xs text-yellow-600">
                  ⚠️ 곧 한도에 도달합니다.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between mb-1">
            <span>청구 기간</span>
            <span className="font-medium">
              {new Date(usage.billingPeriod.start).toLocaleDateString()} -{' '}
              {new Date(usage.billingPeriod.end).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <button className="w-full mt-4 bg-gray-900 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-800 transition">
        플랜 업그레이드
      </button>
    </div>
  )
}
