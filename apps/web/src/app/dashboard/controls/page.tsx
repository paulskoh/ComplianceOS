'use client'

import { useEffect, useState } from 'react'
import { controls as controlsApi } from '@/lib/api'
import { CheckCircleIcon, CogIcon } from '@heroicons/react/24/solid'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

interface Control {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function ControlsPage() {
  const [controls, setControls] = useState<Control[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchControls()
  }, [])

  const fetchControls = async () => {
    try {
      setLoading(true)
      const response = await controlsApi.getAll()
      setControls(response.data)
    } catch (error) {
      console.error('Failed to fetch controls:', error)
    } finally {
      setLoading(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">통제 항목</h2>
          <p className="mt-1 text-sm text-gray-500">
            PIPA 준수를 위한 통제 항목 목록
          </p>
        </div>
      </div>

      {controls.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">통제 항목이 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            온보딩을 완료하면 PIPA 통제 항목이 자동으로 생성됩니다
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-subtle ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6">
                  통제 ID
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  통제 명
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {controls.map((control) => (
                <tr key={control.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-gray-500 sm:pl-6">
                    {control.id.substring(0, 8)}
                  </td>
                  <td className="px-3 py-4 text-sm font-medium text-gray-900">
                    {control.name}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 max-w-md truncate">
                    {control.description || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(control.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button className="text-gray-400 hover:text-gray-900">
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
