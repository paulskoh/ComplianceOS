'use client'

import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

export interface WorkflowStep {
  id: string
  name: string
  nameKo: string
  description: string
  href: string
  status: 'complete' | 'current' | 'upcoming'
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  compact?: boolean
}

/**
 * SOFT-LAUNCH: Golden path workflow progress indicator
 * Guides users through the canonical workflow:
 * 1. Organization Setup -> 2. Evidence Upload -> 3. Framework Review -> 4. Results Review -> 5. Inspection Pack
 */
export default function WorkflowProgress({ steps, compact = false }: WorkflowProgressProps) {
  const currentStep = steps.find((s) => s.status === 'current')
  const completedSteps = steps.filter((s) => s.status === 'complete').length
  const progress = Math.round((completedSteps / steps.length) * 100)

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">설정 진행률</h3>
          <span className="text-sm text-gray-500">{completedSteps}/{steps.length} 완료</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {currentStep && (
          <Link
            href={currentStep.href}
            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-blue-900">다음 단계: {currentStep.nameKo}</p>
              <p className="text-xs text-blue-700">{currentStep.description}</p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-blue-600" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">시작 가이드</h2>
          <span className="text-sm text-gray-500">{progress}% 완료</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          아래 단계를 순서대로 완료하여 컴플라이언스 관리를 시작하세요
        </p>
      </div>

      <nav aria-label="Progress">
        <ol className="divide-y divide-gray-200">
          {steps.map((step, stepIdx) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={`flex items-center px-6 py-4 transition-colors ${
                  step.status === 'current'
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {step.status === 'complete' ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600">
                      <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    </span>
                  ) : step.status === 'current' ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                      <span className="text-sm font-semibold text-blue-600">{stepIdx + 1}</span>
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                      <span className="text-sm font-medium text-gray-500">{stepIdx + 1}</span>
                    </span>
                  )}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <div className="flex items-center">
                    <span
                      className={`text-sm font-medium ${
                        step.status === 'complete'
                          ? 'text-green-700'
                          : step.status === 'current'
                          ? 'text-blue-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.nameKo}
                    </span>
                    {step.status === 'complete' && (
                      <span className="ml-2 text-xs text-green-600">완료</span>
                    )}
                    {step.status === 'current' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                <ArrowRightIcon
                  className={`h-5 w-5 ${
                    step.status === 'current' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {progress === 100 && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              모든 설정이 완료되었습니다! 이제 컴플라이언스 현황을 관리할 수 있습니다.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to determine workflow step status based on organization state
 */
export function useWorkflowSteps(
  hasOnboarding: boolean,
  hasEvidence: boolean,
  hasFrameworksViewed: boolean,
  hasReadiness: boolean,
  hasInspectionPack: boolean = false
): WorkflowStep[] {
  const getStatus = (stepCompleted: boolean, prevCompleted: boolean): 'complete' | 'current' | 'upcoming' => {
    if (stepCompleted) return 'complete'
    if (prevCompleted) return 'current'
    return 'upcoming'
  }

  return [
    {
      id: 'onboarding',
      name: 'Organization Setup',
      nameKo: '회사 정보 설정',
      description: '회사 프로필과 적용 규제를 설정합니다',
      href: '/onboarding',
      status: getStatus(hasOnboarding, true),
    },
    {
      id: 'evidence',
      name: 'Evidence Upload',
      nameKo: '증빙 자료 업로드',
      description: '컴플라이언스 증빙 문서를 업로드합니다',
      href: '/dashboard/evidence',
      status: getStatus(hasEvidence, hasOnboarding),
    },
    {
      id: 'frameworks',
      name: 'Compliance Packs',
      nameKo: '규제 팩 확인',
      description: '적용되는 규제 요구사항을 확인합니다',
      href: '/dashboard/frameworks',
      status: getStatus(hasFrameworksViewed, hasEvidence),
    },
    {
      id: 'readiness',
      name: 'Results Review',
      nameKo: '준수 현황 확인',
      description: '컴플라이언스 점수와 개선점을 확인합니다',
      href: '/dashboard/readiness',
      status: getStatus(hasReadiness, hasFrameworksViewed),
    },
    {
      id: 'inspection',
      name: 'Inspection Pack',
      nameKo: '검사 팩 생성',
      description: '감사용 증빙 패키지를 생성합니다',
      href: '/dashboard/inspection-packs',
      status: getStatus(hasInspectionPack, hasReadiness),
    },
  ]
}
