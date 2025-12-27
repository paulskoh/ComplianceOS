'use client'

import { useEffect, useState } from 'react'
import { ArrowRightIcon, ExclamationCircleIcon, CheckCircleIcon, DocumentArrowUpIcon
} from '@heroicons/react/24/solid'
import { ShieldCheckIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { readiness, risks, onboarding, evidenceRequirements, inspectionPacks, frameworks } from '@/lib/api'
import Link from 'next/link'
import WorkflowProgress, { useWorkflowSteps } from '@/components/WorkflowProgress'

interface GapItem {
  type: string
  severity: string
  obligationId: string
  obligationTitle: string
  controlId?: string
  controlName?: string
  description: string
  actionRequired?: string
}

interface RiskItem {
  id: string
  title: string
  description: string
  severity: string
  status: string
  dueDate?: string
}

interface ActivePack {
  id: string
  code: string
  name: string
  version: string
  controlCount: number
  evidenceCount: number
}

interface EvidenceStats {
  total: number
  completed: number
  missing: number
}

export default function Home() {
  const [scoreData, setScoreData] = useState<any>(null)
  const [gapData, setGapData] = useState<{ gaps: GapItem[] } | null>(null)
  const [riskData, setRiskData] = useState<RiskItem[]>([])
  const [activePacks, setActivePacks] = useState<ActivePack[]>([])
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats>({ total: 0, completed: 0, missing: 0 })
  const [loading, setLoading] = useState(true)

  // SOFT-LAUNCH: Golden path workflow state
  const [hasOnboarding, setHasOnboarding] = useState(false)
  const [hasEvidence, setHasEvidence] = useState(false)
  const [hasFrameworksViewed, setHasFrameworksViewed] = useState(false)
  const [hasReadiness, setHasReadiness] = useState(false)
  const [hasInspectionPack, setHasInspectionPack] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [scoreResponse, gapsResponse, risksResponse, packsResponse] = await Promise.all([
          readiness.getScore().catch(() => ({ data: null })),
          readiness.getGaps().catch(() => ({ data: { gaps: [] } })),
          risks.getAll().catch(() => ({ data: [] })),
          inspectionPacks.getAll().catch(() => ({ data: [] })),
        ])

        setScoreData(scoreResponse.data)
        setGapData(gapsResponse.data)
        setRiskData(risksResponse.data || [])

        // Check for inspection packs
        const packs = packsResponse.data || []
        setHasInspectionPack(packs.length > 0)

        // Check workflow completion status
        if (scoreResponse.data) {
          setHasReadiness(scoreResponse.data?.score?.overall > 0)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Check onboarding and evidence status
    async function checkWorkflowStatus() {
      try {
        const [profileRes, evidenceRes, frameworksRes] = await Promise.all([
          onboarding.getProfile().catch(() => null),
          evidenceRequirements.getOverview().catch(() => null),
          frameworks.getAll().catch(() => null),
        ])

        // Check if company profile exists
        const profile = profileRes?.data
        setHasOnboarding(!!profile?.id || !!profile?.industry)

        // Calculate evidence stats
        const obligations = evidenceRes?.data?.obligations || []
        let totalEvidence = 0
        let completedEvidence = 0
        let missingEvidence = 0

        obligations.forEach((ob: any) => {
          ob.evidenceRequirements?.forEach((er: any) => {
            totalEvidence++
            if (er.status === 'VERIFIED' || er.status === 'UPLOADED') {
              completedEvidence++
            } else if (er.status === 'MISSING') {
              missingEvidence++
            }
          })
        })

        setEvidenceStats({ total: totalEvidence, completed: completedEvidence, missing: missingEvidence })
        setHasEvidence(completedEvidence > 0)

        // Frameworks are viewable if onboarding is done
        const frameworksList = frameworksRes?.data || []
        setHasFrameworksViewed(frameworksList.length > 0 || !!profile?.id)

        // Build active packs list from frameworks
        if (frameworksList.length > 0) {
          const packs: ActivePack[] = frameworksList.map((fw: any) => ({
            id: fw.id || fw.code,
            code: fw.code,
            name: fw.name || fw.code,
            version: fw.version || '1.0',
            controlCount: fw.controlCount || fw.domains?.reduce((sum: number, d: any) => sum + (d.controls?.length || 0), 0) || 0,
            evidenceCount: totalEvidence,
          }))
          setActivePacks(packs)
        }
      } catch (error) {
        console.error('Failed to check workflow status:', error)
      }
    }

    fetchData()
    checkWorkflowStatus()
  }, [])

  // Get workflow steps based on current state
  const workflowSteps = useWorkflowSteps(
    hasOnboarding,
    hasEvidence,
    hasFrameworksViewed,
    hasReadiness,
    hasInspectionPack
  )

  const score = scoreData?.score?.overall || 0
  const level = scoreData?.score?.level || 'UNKNOWN'
  const domains = scoreData?.breakdown || []

  // Convert gaps and risks to attention items
  const getAttentionItems = () => {
    const items: Array<{ title: string; desc: string; time: string; severity: string }> = []

    // Add gaps as attention items
    if (gapData?.gaps) {
      gapData.gaps.slice(0, 3).forEach((gap) => {
        const gapTypeLabels: Record<string, string> = {
          MISSING_EVIDENCE: '증빙 미제출',
          OUTDATED_EVIDENCE: '증빙 만료',
          NO_CONTROL: '통제 미정의',
          UNAPPROVED_EXCEPTION: '예외 승인 대기',
        }
        items.push({
          title: gapTypeLabels[gap.type] || gap.type,
          desc: gap.obligationTitle || gap.description,
          time: gap.severity === 'CRITICAL' ? '심각' : gap.severity === 'HIGH' ? '높음' : '조치 필요',
          severity: gap.severity,
        })
      })
    }

    // Add open risks as attention items
    const openRisks = riskData.filter(r => r.status === 'OPEN')
    openRisks.slice(0, 2).forEach((risk) => {
      const daysOverdue = risk.dueDate ? Math.floor((new Date().getTime() - new Date(risk.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
      items.push({
        title: risk.title,
        desc: risk.description?.substring(0, 50) || 'Risk item requires attention',
        time: daysOverdue > 0 ? `${daysOverdue}일 초과` : risk.severity === 'CRITICAL' ? '심각' : '진행 중',
        severity: risk.severity,
      })
    })

    return items
  }

  const getAttentionItemCount = () => {
    const gapCount = gapData?.gaps?.length || 0
    const openRiskCount = riskData.filter(r => r.status === 'OPEN').length
    return gapCount + openRiskCount
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return { bg: 'bg-green-50', text: 'text-green-700', label: '감사 준비 완료' }
      case 'GOOD':
        return { bg: 'bg-blue-50', text: 'text-blue-700', label: '양호' }
      case 'FAIR':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '주의 필요' }
      case 'POOR':
        return { bg: 'bg-orange-50', text: 'text-orange-700', label: '조치 필요' }
      case 'CRITICAL':
        return { bg: 'bg-red-50', text: 'text-red-700', label: '긴급 조치' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: '데이터 수집 중' }
    }
  }

  const badge = getLevelBadge(level)

  // Check if user is in the setup phase (hasn't completed key workflow steps)
  const isInSetupPhase = !hasOnboarding || !hasEvidence
  const completedSteps = workflowSteps.filter(s => s.status === 'complete').length
  const evidenceProgress = evidenceStats.total > 0
    ? Math.round((evidenceStats.completed / evidenceStats.total) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">대시보드</h2>
        <p className="mt-1 text-sm text-gray-500">컴플라이언스 현황 및 즉시 조치 항목</p>
      </div>

      {/* SOFT-LAUNCH: Show workflow progress for users in setup phase */}
      {isInSetupPhase && completedSteps < 5 && (
        <WorkflowProgress steps={workflowSteps} />
      )}

      {/* Active Packs & Evidence Progress Section */}
      {hasOnboarding && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Packs */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center">
                <BookOpenIcon className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">적용 규제 팩</h3>
              </div>
              <Link href="/dashboard/frameworks" className="text-sm text-primary-600 hover:text-primary-700">
                상세 보기 →
              </Link>
            </div>
            <div className="p-4">
              {activePacks.length > 0 ? (
                <div className="space-y-3">
                  {activePacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{pack.name}</p>
                        <p className="text-xs text-gray-500">v{pack.version}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-600">{pack.controlCount} 통제항목</p>
                        <p className="text-gray-500">{pack.evidenceCount} 증빙 요구</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">규제 팩이 적용되지 않았습니다</p>
                  <Link href="/dashboard/frameworks" className="text-primary-600 text-sm hover:underline">
                    규제 팩 확인하기
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Completion Progress */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900">증빙 제출 현황</h3>
              <span className="text-sm text-gray-500">{evidenceStats.completed}/{evidenceStats.total} 완료</span>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">전체 진행률</span>
                  <span className="font-medium text-gray-900">{evidenceProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      evidenceProgress >= 80 ? 'bg-green-500' :
                      evidenceProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${evidenceProgress}%` }}
                  />
                </div>
              </div>

              {evidenceStats.missing > 0 && (
                <Link
                  href="/dashboard/evidence"
                  className="flex items-center justify-center w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                  미제출 증빙 업로드 ({evidenceStats.missing}건)
                </Link>
              )}

              {evidenceStats.missing === 0 && evidenceStats.total > 0 && (
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">모든 증빙이 제출되었습니다</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Readiness & Domains (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* Readiness Score Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200"></div>
            <div className="text-center space-y-2 z-10">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">준수 현황 점수</span>
              <div className="flex items-baseline justify-center space-x-2">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-16 w-32 bg-gray-200 rounded"></div>
                  </div>
                ) : (
                  <>
                    <span className="text-6xl font-bold text-gray-900 tracking-tighter">{score}</span>
                    <span className="text-2xl text-gray-400 font-light">/ 100</span>
                  </>
                )}
              </div>
              <div className={`flex items-center justify-center space-x-2 mt-4 ${badge.bg} px-3 py-1 rounded-full`}>
                <CheckCircleIcon className={`w-4 h-4 ${badge.text}`} />
                <span className={`text-sm font-medium ${badge.text}`}>{badge.label}</span>
              </div>
            </div>

            {/* Subtle background flair */}
            <div className="absolute opacity-[0.03] scale-150 pointer-events-none">
              <ShieldCheckIcon className="w-96 h-96" />
            </div>
          </div>

          {/* Domain Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-medium text-gray-900">도메인별 현황</h3>
            </div>
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ) : domains.length > 0 ? (
                domains.map((domain: any) => (
                  <DomainRow
                    key={domain.domain}
                    name={domain.domain}
                    score={domain.score}
                    status={domain.score >= 75 ? 'good' : domain.score >= 60 ? 'warning' : 'attention'}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">증빙 자료를 제출하면 도메인별 분석 결과가 표시됩니다</p>
                  <Link href="/dashboard/evidence" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
                    증빙 제출하기 →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Immediate Attention (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <h3 className="text-base font-medium text-gray-900 flex items-center">
                <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                즉시 조치 필요
              </h3>
              <span className="bg-white text-xs font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                {getAttentionItemCount()}건
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ) : getAttentionItems().length > 0 ? (
                getAttentionItems().slice(0, 5).map((item, index) => (
                  <AttentionItem
                    key={index}
                    title={item.title}
                    desc={item.desc}
                    time={item.time}
                    severity={item.severity}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">즉시 조치 항목 없음</p>
                  <p className="text-xs mt-1">모든 컴플라이언스 항목이 최신 상태입니다</p>
                </div>
              )}
            </div>
            {getAttentionItems().length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link
                  href="/dashboard/readiness"
                  className="w-full text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center group transition-colors"
                >
                  전체 갭 분석 보기
                  <ArrowRightIcon className="w-4 h-4 ml-1 text-gray-400 group-hover:text-gray-600" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DomainRow({ name, score, status }: { name: string, score: number, status: 'good' | 'warning' | 'attention' }) {
  const domainLabels: Record<string, string> = {
    'LABOR': '근로기준',
    'DATA_PRIVACY': '개인정보보호',
    'SAFETY': '안전보건',
    'ENVIRONMENT': '환경',
    'FINANCIAL': '재무/회계',
    'GOVERNANCE': '거버넌스',
  }

  let colorClass = 'bg-gray-200';
  if (status === 'good') colorClass = 'bg-green-500';
  if (status === 'warning') colorClass = 'bg-yellow-500';
  if (status === 'attention') colorClass = 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-700">{domainLabels[name] || name}</span>
        <span className="text-sm font-mono text-gray-500">{score}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  )
}

function AttentionItem({ title, desc, time, severity }: { title: string, desc: string, time: string, severity?: string }) {
  const getSeverityStyles = (sev?: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'LOW':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center">
        <span className={`text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border ${getSeverityStyles(severity)}`}>
          {time}
        </span>
      </div>
    </div>
  )
}
