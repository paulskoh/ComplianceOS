'use client'

import { ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  showContactSupport?: boolean
}

/**
 * SOFT-LAUNCH: Graceful failure UX component
 * Displays user-friendly error states with clear next steps
 */
export default function ErrorState({
  title = '오류가 발생했습니다',
  message,
  onRetry,
  showContactSupport = true,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-red-50 rounded-full p-3 mb-4">
        <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">{message}</p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            다시 시도
          </button>
        )}

        {showContactSupport && (
          <a
            href="mailto:support@complianceos.kr"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            문제가 지속되면 고객지원에 문의하세요
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Empty state for when no data is available (not an error, just no content)
 */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-100 rounded-full p-3 mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">{message}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Analysis failure state for AI processing issues
 */
export function AnalysisFailureState({
  status,
  message,
  onRetry,
}: {
  status: 'INSUFFICIENT_EVIDENCE' | 'MANUAL_REVIEW_REQUIRED' | 'PROCESSING_FAILED' | 'UNKNOWN'
  message: string
  onRetry?: () => void
}) {
  const statusConfig = {
    INSUFFICIENT_EVIDENCE: {
      title: '증거 불충분',
      description: '제출된 문서에서 해당 요구사항을 확인할 수 있는 내용을 찾을 수 없습니다.',
      suggestion: '관련 내용이 포함된 다른 문서를 업로드해 주세요.',
      icon: 'warning',
    },
    MANUAL_REVIEW_REQUIRED: {
      title: '수동 검토 필요',
      description: 'AI가 자동으로 판단하기 어려운 문서입니다.',
      suggestion: '담당자가 수동으로 검토할 예정입니다.',
      icon: 'info',
    },
    PROCESSING_FAILED: {
      title: '처리 실패',
      description: '문서 분석 중 오류가 발생했습니다.',
      suggestion: '잠시 후 다시 시도해 주세요.',
      icon: 'error',
    },
    UNKNOWN: {
      title: '알 수 없는 상태',
      description: '문서 분석 상태를 확인할 수 없습니다.',
      suggestion: '고객지원에 문의해 주세요.',
      icon: 'error',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {config.icon === 'warning' && (
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {config.icon === 'info' && (
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {config.icon === 'error' && (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">{config.title}</h3>
          <p className="mt-1 text-sm text-amber-700">{config.description}</p>
          {message && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-100 rounded px-2 py-1">
              상세: {message}
            </p>
          )}
          <p className="mt-2 text-sm text-amber-700">{config.suggestion}</p>
          {onRetry && status === 'PROCESSING_FAILED' && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              다시 분석
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
