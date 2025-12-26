'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    HomeIcon,
    ClipboardDocumentCheckIcon,
    ScaleIcon,
    ShieldCheckIcon,
    InboxStackIcon,
    CpuChipIcon,
    DocumentDuplicateIcon,
    AcademicCapIcon,
    BuildingOfficeIcon,
    ChartBarIcon,
    PuzzlePieceIcon,
    Cog6ToothIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline'

const navigation = [
    { name: '홈', href: '/dashboard', icon: HomeIcon },
    { name: '증빙 제출', href: '/dashboard/evidence', icon: InboxStackIcon },
    { name: '준수 현황', href: '/dashboard/readiness', icon: ClipboardDocumentCheckIcon },
    { name: '검사 팩', href: '/dashboard/inspection-packs', icon: DocumentDuplicateIcon },
    { name: '프레임워크', href: '/dashboard/frameworks', icon: BookOpenIcon },
]

const secondaryNavigation = [
    { name: 'Admin', href: '/dashboard/admin', icon: Cog6ToothIcon },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-40">
            <div className="flex items-center h-14 px-4 border-b border-gray-200">
                {/* Logo Area */}
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">COS</span>
                    </div>
                    <span className="text-gray-900 font-bold text-sm tracking-tight">ComplianceOS</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${isActive
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                                    }`}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-gray-200 p-3">
                {secondaryNavigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
                    >
                        <item.icon
                            className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                        />
                        {item.name}
                    </Link>
                ))}
            </div>
        </div>
    )
}
