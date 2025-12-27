'use client'

import { useEffect, useState } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { onboarding } from '@/lib/api'

interface UserInfo {
    firstName: string
    lastName: string
    email: string
    role: string
}

interface OrgInfo {
    name: string
}

export default function TopBar() {
    const [user, setUser] = useState<UserInfo | null>(null)
    const [org, setOrg] = useState<OrgInfo | null>(null)

    useEffect(() => {
        // Load user from localStorage
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser))
            } catch (e) {
                console.error('Failed to parse user from localStorage')
            }
        }

        // Load org info from onboarding profile
        loadOrgInfo()
    }, [])

    const loadOrgInfo = async () => {
        try {
            const response = await onboarding.getProfile()
            if (response.data?.tenant?.name) {
                setOrg({ name: response.data.tenant.name })
            }
        } catch (e) {
            // Silently fail - org info is optional for display
        }
    }

    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email
        : 'User'

    const initials = user
        ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
        : 'U'

    const roleLabel = user?.role === 'ORG_ADMIN' ? 'Administrator' : user?.role || 'Member'

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-30">
            <div className="flex items-center space-x-4">
                {/* Org Selector */}
                <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500">Organization:</span>
                    <span className="font-medium text-gray-900">
                        {org?.name || 'Loading...'}
                    </span>
                </div>

                <span className="h-4 w-px bg-gray-200" />

                {/* Mode Indicator */}
                <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-xs font-medium text-gray-700">Active</span>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Help */}
                <button className="text-gray-400 hover:text-gray-500 transition-colors">
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>

                <span className="h-4 w-px bg-gray-200" />

                {/* User Profile */}
                <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-500">{roleLabel}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs">
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    )
}
