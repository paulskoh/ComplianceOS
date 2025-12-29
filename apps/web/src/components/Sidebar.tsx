'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    HomeIcon,
    ClipboardDocumentCheckIcon,
    InboxStackIcon,
    DocumentDuplicateIcon,
    BookOpenIcon,
    ArrowRightOnRectangleIcon,
    SparklesIcon,
    ArrowsRightLeftIcon
} from '@heroicons/react/24/outline'
import SystemStatusPanel from './SystemStatusPanel'

// Demo mode detection
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Full navigation for production
const fullNavigation = [
    { name: '홈', nameEn: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: '문서 생성', nameEn: 'Document Generator', href: '/dashboard/documents', icon: SparklesIcon },
    { name: '증빙 제출', nameEn: 'Evidence', href: '/dashboard/evidence', icon: InboxStackIcon },
    { name: '모순 검출', nameEn: 'Contradictions', href: '/dashboard/contradictions', icon: ArrowsRightLeftIcon },
    { name: '준수 현황', nameEn: 'Readiness', href: '/dashboard/readiness', icon: ClipboardDocumentCheckIcon },
    { name: '검사 팩', nameEn: 'Inspection Packs', href: '/dashboard/inspection-packs', icon: DocumentDuplicateIcon },
    { name: '규제 팩', nameEn: 'Compliance Packs', href: '/dashboard/frameworks', icon: BookOpenIcon },
]

// Demo mode: focus on core compliance flow (Smart Upload, Doc Gen, Contradictions, Audit Sim)
const demoNavigation = [
    { name: '홈', nameEn: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: '증빙 제출', nameEn: 'Evidence', href: '/dashboard/evidence', icon: InboxStackIcon },
    { name: '모순 검출', nameEn: 'Contradictions', href: '/dashboard/contradictions', icon: ArrowsRightLeftIcon },
    { name: '준수 현황', nameEn: 'Readiness', href: '/dashboard/readiness', icon: ClipboardDocumentCheckIcon },
    { name: '검사 팩', nameEn: 'Inspection Packs', href: '/dashboard/inspection-packs', icon: DocumentDuplicateIcon },
]

// Select navigation based on mode
const navigation = isDemoMode ? demoNavigation : fullNavigation

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        router.push('/login')
    }

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-40">
            <div className="flex items-center h-14 px-4 border-b border-gray-200">
                {/* Logo Area */}
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">COS</span>
                    </div>
                    <span className="text-gray-900 font-bold text-sm tracking-tight">ComplianceOS</span>
                    {isDemoMode && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                            DEMO
                        </span>
                    )}
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))
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

            {/* Demo Mode: System Status Panel */}
            {isDemoMode && <SystemStatusPanel />}

            <div className="border-t border-gray-200 p-3">
                <button
                    onClick={handleLogout}
                    className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
                >
                    <ArrowRightOnRectangleIcon
                        className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                        aria-hidden="true"
                    />
                    로그아웃
                </button>
            </div>
        </div>
    )
}
