'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'
import {
  ShieldCheckIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { inspection } from '@/lib/api'

function InspectorPortalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
      handleAccessPack(urlToken)
    }
  }, [searchParams])

  const handleAccessPack = async (accessToken?: string) => {
    const tokenToUse = accessToken || token
    if (!tokenToUse) {
      setError('점검팩 접근 토큰을 입력하세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await inspection.getPackByToken(tokenToUse)
      if (response.data) {
        // Navigate to the review interface with the token
        router.push(`/inspector/review?token=${tokenToUse}`)
      }
    } catch (err: any) {
      console.error('Failed to access pack:', err)
      if (err.response?.status === 404) {
        setError('유효하지 않은 토큰입니다. 토큰을 확인하고 다시 시도하세요.')
      } else if (err.response?.status === 410) {
        setError('이 링크는 만료되었습니다. 새로운 링크를 요청하세요.')
      } else {
        setError('점검팩에 접근할 수 없습니다. 나중에 다시 시도하세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShieldCheckIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">감사자 포털</h1>
          <p className="text-sm text-gray-600">
            ComplianceOS 점검팩 검토 시스템
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              점검팩 접근
            </h2>
            <p className="text-sm text-gray-600">
              접근 토큰을 입력하여 점검팩을 확인하세요
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAccessPack()
            }}
            className="space-y-4"
          >
            {/* Token Input */}
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                접근 토큰
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="접근 토큰을 입력하세요"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      접근 오류
                    </h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  접근 중...
                </>
              ) : (
                '점검팩 접근'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                접근 토큰이 없으신가요?
              </h4>
              <p className="text-xs text-blue-700">
                점검팩 접근 토큰은 점검 대상 기업으로부터 제공받습니다.
                이메일로 전송된 링크를 클릭하거나 토큰을 복사하여 위 입력란에 붙여넣으세요.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            본 시스템은 암호화된 보안 연결을 사용합니다
          </p>
          <p className="text-xs text-gray-500 mt-1">
            © 2025 ComplianceOS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InspectorPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <InspectorPortalContent />
    </Suspense>
  )
}
