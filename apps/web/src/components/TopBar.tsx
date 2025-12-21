'use client'

import { BellIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

export default function TopBar() {
    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-30">
            <div className="flex items-center space-x-4">
                {/* Org Selector Placeholder */}
                <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500">Organization:</span>
                    <span className="font-medium text-gray-900">Acme Corp</span>
                    {/* Chevron down would go here */}
                </div>

                <span className="h-4 w-px bg-gray-200" />

                {/* Mode Indicator */}
                <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                    <span className="w-2 h-2 rounded-full bg-status-success"></span>
                    <span className="text-xs font-medium text-gray-700">Standard Mode</span>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Help */}
                <button className="text-gray-400 hover:text-gray-500 transition-colors">
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>

                {/* Notifications */}
                {/* <button className="text-gray-400 hover:text-gray-500 transition-colors">
            <BellIcon className="h-5 w-5" />
        </button> */}

                <span className="h-4 w-px bg-gray-200" />

                {/* User Profile */}
                <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">Admin User</p>
                        <p className="text-xs text-gray-500">Security Team</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-xs">
                        AU
                    </div>
                </div>
            </div>
        </header>
    )
}
