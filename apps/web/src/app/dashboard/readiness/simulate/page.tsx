'use client'

import { useState, useEffect } from 'react'
import { readiness } from '@/lib/api'

interface SimulationPreset {
  name: string
  nameKo: string
  domains: string[]
  description: string
}

interface SimulationResult {
  preset: SimulationPreset
  dateRange: { startDate: Date; endDate: Date }
  score: number
  level: string
  delta: number
  deltaLabel: string
  gaps: number
  failingControls: any[]
  missingEvidence: any[]
  recommendations: any[]
}

export default function SimulationPage() {
  const [presets, setPresets] = useState<SimulationPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const res = await readiness.getSimulationPresets()
      setPresets(res.data)
      if (res.data.length > 0) {
        setSelectedPreset(res.data[0].nameKo)
      }
    } catch (err) {
      console.error('Failed to load presets:', err)
      setError('점검 유형을 불러오는데 실패했습니다.')
    }
  }

  const runSimulation = async () => {
    if (!selectedPreset) {
      setError('점검 유형을 선택하세요.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await readiness.simulate({
        preset: selectedPreset,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      setResult(res.data)
    } catch (err: any) {
      console.error('Simulation failed:', err)
      setError(err.response?.data?.message || '시뮬레이션에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateDraftPack = async () => {
    if (!result) return

    try {
      const res = await readiness.generateDraftPack(result)
      alert(`드래프트 팩이 생성되었습니다. ID: ${res.data.packId}`)
    } catch (err) {
      console.error('Draft pack generation failed:', err)
      alert('드래프트 팩 생성에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">점검 시뮬레이션</h1>
          <p className="mt-2 text-gray-600">
            실제 점검 상황을 시뮬레이션하여 현재 준비도를 확인하세요
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Preset Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">점검 유형 선택</h2>
          <div className="space-y-3">
            {presets.map((preset) => (
              <label
                key={preset.nameKo}
                className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
              >
                <input
                  type="radio"
                  checked={selectedPreset === preset.nameKo}
                  onChange={() => setSelectedPreset(preset.nameKo)}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{preset.nameKo}</div>
                  <div className="text-sm text-gray-500">{preset.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    도메인: {preset.domains.join(', ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">증빙 검토 기간</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || !selectedPreset}
          className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? '시뮬레이션 실행 중...' : '시뮬레이션 실행'}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">준비도 점수</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.level === 'EXCELLENT'
                      ? 'bg-green-100 text-green-800'
                      : result.level === 'GOOD'
                      ? 'bg-blue-100 text-blue-800'
                      : result.level === 'FAIR'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.level}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-5xl font-bold text-gray-900">{result.score}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        result.score >= 75
                          ? 'bg-green-500'
                          : result.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {result.deltaLabel === 'IMPROVED' && (
                      <span className="text-green-600">
                        ↑ 지난달 대비 +{result.delta.toFixed(1)} 향상
                      </span>
                    )}
                    {result.deltaLabel === 'DECLINED' && (
                      <span className="text-red-600">
                        ↓ 지난달 대비 {result.delta.toFixed(1)} 하락
                      </span>
                    )}
                    {result.deltaLabel === 'UNCHANGED' && (
                      <span className="text-gray-600">지난달과 동일</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gaps Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">발견된 문제점</h2>
              <div className="text-3xl font-bold text-red-600">{result.gaps}개</div>
              <p className="text-sm text-gray-600 mt-1">
                {result.preset.nameKo} 관련 컴플라이언스 갭
              </p>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">권장 조치사항</h2>
                <div className="space-y-3">
                  {result.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-3 p-4 border rounded-lg"
                    >
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rec.priority === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{rec.action}</div>
                        <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failing Controls */}
            {result.failingControls.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">문제가 있는 통제 항목</h2>
                <div className="space-y-2">
                  {result.failingControls.map((control) => (
                    <div
                      key={control.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{control.name}</div>
                        <div className="text-sm text-gray-500">{control.obligation}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {control.gapCount} 문제
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            control.highestSeverity === 'CRITICAL' ||
                            control.highestSeverity === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {control.highestSeverity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Evidence */}
            {result.missingEvidence.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">누락된 증빙</h2>
                <div className="space-y-2">
                  {result.missingEvidence.slice(0, 10).map((evidence, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {evidence.requirementName}
                        </div>
                        <div className="text-sm text-gray-500">{evidence.controlName}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        유효기간: {evidence.freshnessWindowDays}일
                      </div>
                    </div>
                  ))}
                  {result.missingEvidence.length > 10 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      외 {result.missingEvidence.length - 10}건
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={generateDraftPack}
                className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                드래프트 점검팩 생성
              </button>
              <button
                onClick={() => setResult(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                새로운 시뮬레이션
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
