'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import { onboarding } from '@/lib/api'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'needs_onboarding'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    checkAuthAndOnboarding()
  }, [pathname])

  const checkAuthAndOnboarding = async () => {
    // Check if user has auth token
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setAuthState('unauthenticated')
      router.replace('/login')
      return
    }

    try {
      // Check if onboarding is complete
      const response = await onboarding.getProfile()
      const profile = response.data

      // If profile exists and has required fields, onboarding is complete
      if (profile && profile.industry) {
        setAuthState('authenticated')
      } else {
        setAuthState('needs_onboarding')
        router.replace('/onboarding')
      }
    } catch (error: any) {
      // If 401, token is invalid
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        setAuthState('unauthenticated')
        router.replace('/login')
        return
      }

      // If 404 or no profile, needs onboarding
      if (error.response?.status === 404 || error.response?.data?.error) {
        setAuthState('needs_onboarding')
        router.replace('/onboarding')
        return
      }

      // For other errors, allow access but log warning
      console.warn('Could not verify onboarding status:', error)
      setAuthState('authenticated')
    }
  }

  // Show loading state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated or needs onboarding
  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar />

      {/* Main Content Wrapper */}
      <main className="pt-14 pl-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
