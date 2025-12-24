'use client'

import { useState, useEffect } from 'react'
import {
  DocumentCheckIcon,
  CalendarIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { inspectionPacks, readiness, obligations as obligationsApi } from '@/lib/api'

interface Obligation {
  id: string
  titleKo: string
  domain: string
  severity: string
}

const DOMAINS = [
  { value: 'PRIVACY', label: '개인정보보호 (PIPA)' },
  { value: 'LABOR', label: '노동법' },
  { value: 'SECURITY', label: '정보보안' },
  { value: 'TRAINING', label: '교육훈련' },
]

export default function InspectionPackGenerator() {
  const [step, setStep] = useState<'config' | 'preview' | 'generating' | 'complete'>('config')
  const [packName, setPackName] = useState('')
  const [domain, setDomain] = useState('PRIVACY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedObligations, setSelectedObligations] = useState<string[]>([])
  const [availableObligations, setAvailableObligations] = useState<Obligation[]>([])
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [packId, setPackId] = useState<string | null>(null)
  const [downloadUrls, setDownloadUrls] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Load available obligations when domain changes
  useEffect(() => {
    async function loadObligations() {
      try {
        const response = await obligationsApi.getAll()
        const filtered = response.data.filter((o: Obligation) => o.domain === domain)
        setAvailableObligations(filtered)
      } catch (error) {
        console.error('Failed to load obligations:', error)
      }
    }
    loadObligations()
  }, [domain])

  const handleRunSimulation = async () => {
    if (!packName || !startDate || !endDate) {
      alert('모든 필수 항목을 입력하세요')
      return
    }

    setLoading(true)
    try {
      const presets = await readiness.getSimulationPresets()
      const preset = presets.data.find((p: any) => p.domains.includes(domain))

      if (preset) {
        const result = await readiness.simulate({
          preset: preset.nameKo,
          startDate,
          endDate,
        })
        setSimulationResult(result.data)
        setStep('preview')
      }
    } catch (error) {
      console.error('Simulation failed:', error)
      alert('시뮬레이션 실행 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePack = async () => {
    setLoading(true)
    setStep('generating')

    try {
      const response = await inspectionPacks.create({
        name: packName,
        domain,
        startDate,
        endDate,
        obligationIds: selectedObligations.length > 0 ? selectedObligations : undefined,
      })

      setPackId(response.data.id)

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const pack = await inspectionPacks.getOne(response.data.id)
          if (pack.data.status === 'COMPLETED') {
            clearInterval(pollInterval)
            const urls = await inspectionPacks.getDownloadUrls(response.data.id)
            setDownloadUrls(urls.data)
            setStep('complete')
            setLoading(false)
          } else if (pack.data.status === 'FAILED') {
            clearInterval(pollInterval)
            alert('점검팩 생성에 실패했습니다')
            setStep('config')
            setLoading(false)
          }
        } catch (error) {
          clearInterval(pollInterval)
          console.error('Failed to check pack status:', error)
        }
      }, 2000)
    } catch (error) {
      console.error('Pack generation failed:', error)
      alert('점검팩 생성 중 오류가 발생했습니다')
      setStep('config')
      setLoading(false)
    }
  }

  const toggleObligation = (obligationId: string) => {
    setSelectedObligations((prev) =>
      prev.includes(obligationId)
        ? prev.filter((id) => id !== obligationId)
        : [...prev, obligationId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuration Step */}
      {step === 'config' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <DocumentCheckIcon className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">점검팩 생성</h2>
          </div>

          <div className="space-y-4">
            {/* Pack Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                점검팩 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 2025년 상반기 개인정보보호 점검"
              />
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                점검 영역 <span className="text-red-500">*</span>
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Optional: Specific Obligations */}
            {availableObligations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  포함할 의무사항 (선택사항)
                </label>
                <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                  {availableObligations.map((obligation) => (
                    <label
                      key={obligation.id}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedObligations.includes(obligation.id)}
                        onChange={() => toggleObligation(obligation.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        {obligation.titleKo}
                      </span>
                      <span className="ml-auto text-xs text-gray-500">
                        {obligation.severity}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  선택하지 않으면 모든 의무사항이 포함됩니다
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleRunSimulation}
                disabled={loading}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                미리보기 (시뮬레이션)
              </button>
              <button
                onClick={handleGeneratePack}
                disabled={loading}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <FolderIcon className="h-5 w-5 mr-2" />
                점검팩 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && simulationResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">시뮬레이션 결과</h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">준비도 점수</p>
                <p className="text-3xl font-bold text-blue-900">{simulationResult.score}</p>
                <p className="text-xs text-blue-600">{simulationResult.level}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700">발견된 갭</p>
                <p className="text-3xl font-bold text-yellow-900">{simulationResult.gaps}</p>
                <p className="text-xs text-yellow-600">개 항목</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700">누락 증빙</p>
                <p className="text-3xl font-bold text-purple-900">
                  {simulationResult.missingEvidence?.length || 0}
                </p>
                <p className="text-xs text-purple-600">개 파일</p>
              </div>
            </div>

            {simulationResult.recommendations && simulationResult.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">권장 사항</h4>
                <ul className="space-y-2">
                  {simulationResult.recommendations.map((rec: any, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm">
                      <ExclamationCircleIcon
                        className={`h-5 w-5 flex-shrink-0 ${
                          rec.priority === 'HIGH' ? 'text-red-500' : 'text-yellow-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{rec.action}</p>
                        <p className="text-gray-600">{rec.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('config')}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              설정 수정
            </button>
            <button
              onClick={handleGeneratePack}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              점검팩 생성 진행
            </button>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">점검팩 생성 중...</h3>
          <p className="text-sm text-gray-500">
            증빙 자료를 수집하고 문서를 생성하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && downloadUrls && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">점검팩 생성 완료!</h3>
            <p className="text-sm text-gray-600">
              점검팩이 성공적으로 생성되었습니다. 아래에서 다운로드할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            {downloadUrls.summaryUrl && (
              <a
                href={downloadUrls.summaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <DocumentCheckIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">요약 보고서 (PDF)</p>
                    <p className="text-xs text-gray-500">점검 결과 요약 및 통계</p>
                  </div>
                </div>
                <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
              </a>
            )}

            {downloadUrls.manifestUrl && (
              <a
                href={downloadUrls.manifestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <DocumentCheckIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">매니페스트 (JSON)</p>
                    <p className="text-xs text-gray-500">증빙 목록 및 메타데이터</p>
                  </div>
                </div>
                <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
              </a>
            )}

            {downloadUrls.bundleUrl && (
              <a
                href={downloadUrls.bundleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <FolderIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">증빙 자료 묶음 (ZIP)</p>
                    <p className="text-xs text-gray-500">모든 증빙 파일 포함</p>
                  </div>
                </div>
                <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
              </a>
            )}
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => {
                setStep('config')
                setPackName('')
                setStartDate('')
                setEndDate('')
                setSelectedObligations([])
                setSimulationResult(null)
                setPackId(null)
                setDownloadUrls(null)
              }}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              새 점검팩 생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
