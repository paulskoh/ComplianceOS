'use client'

import { useEffect, useState } from 'react'
import { inspectionPacks } from '@/lib/api'
import {
  ArchiveBoxIcon,
  CheckBadgeIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import StatusPill from '@/components/StatusPill'
import PackGenerationModal from '@/components/PackGenerationModal'

interface InspectionPack {
  id: string
  name: string
  description: string
  status: string
  createdAt: string
  finalized: boolean
  downloadUrl?: string
  artifactCount: number
  signatureVerified: boolean
}

export default function InspectionPacksPage() {
  const [packs, setPacks] = useState<InspectionPack[]>([])
  const [loading, setLoading] = useState(true)
  const [generationModalOpen, setGenerationModalOpen] = useState(false)

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async () => {
    try {
      setLoading(true)
      const response = await inspectionPacks.getAll()
      setPacks(response.data)
    } catch (error) {
      console.error('Failed to fetch inspection packs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePackGenerated = () => {
    setGenerationModalOpen(false)
    fetchPacks()
  }

  const handleDownload = async (packId: string) => {
    try {
      const response = await inspectionPacks.getDownloadUrls(packId)
      const { manifestUrl, zipUrl } = response.data

      // Download the zip file
      if (zipUrl) {
        window.open(zipUrl, '_blank')
      }
    } catch (error) {
      console.error('Failed to download pack:', error)
      alert('다운로드에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">검사 팩</h1>
          <p className="mt-1 text-sm text-gray-500">
            외부 감사관에게 제공할 불변의 증빙 패키지를 생성하고 관리합니다
          </p>
        </div>
        <button
          onClick={() => setGenerationModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          새 검사 팩 생성
        </button>
      </div>

      {packs.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <ArchiveBoxIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">아직 생성된 검사 팩이 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            감사 준비를 위해 증빙 자료를 모아 검사 팩을 생성하세요
          </p>
          <div className="mt-6">
            <button
              onClick={() => setGenerationModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              첫 검사 팩 생성하기
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="divide-y divide-gray-200">
            {packs.map((pack) => (
              <div key={pack.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0 mr-4">
                    <div className="flex-shrink-0 relative">
                      <ArchiveBoxIcon className="h-10 w-10 text-gray-400" />
                      {pack.finalized && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                          <LockClosedIcon className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-base font-medium text-gray-900 truncate">
                          {pack.name}
                        </h3>
                        <StatusPill
                          status={pack.status}
                          label={getStatusLabel(pack.status)}
                        />
                      </div>
                      {pack.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                          {pack.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <ArchiveBoxIcon className="w-4 h-4 mr-1" />
                          {pack.artifactCount}개 증빙
                        </span>
                        {pack.signatureVerified && (
                          <span className="flex items-center text-green-600">
                            <CheckBadgeIcon className="w-4 h-4 mr-1" />
                            서명 검증됨
                          </span>
                        )}
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {new Date(pack.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {pack.finalized && pack.downloadUrl && (
                      <button
                        onClick={() => handleDownload(pack.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                        다운로드
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PackGenerationModal
        open={generationModalOpen}
        onClose={() => setGenerationModalOpen(false)}
        onSuccess={handlePackGenerated}
      />
    </div>
  )
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return '초안'
    case 'GENERATING':
      return '생성 중'
    case 'READY':
      return '준비됨'
    case 'FINALIZED':
      return '최종 확정'
    case 'FAILED':
      return '실패'
    default:
      return status
  }
}
