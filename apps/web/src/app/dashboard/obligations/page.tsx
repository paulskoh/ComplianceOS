'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, BookOpenIcon, ChevronRightIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { obligations as obligationsApi } from '@/lib/api'

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<any[]>([])
  const [selectedObligation, setSelectedObligation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchObligations() {
      try {
        const response = await obligationsApi.getAll()
        const data = response.data || []
        setObligations(data)
        if (data.length > 0) {
          setSelectedObligation(data[0])
        }
      } catch (error) {
        console.error('Failed to fetch obligations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchObligations()
  }, [])

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading obligations...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex-none">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Obligations & Laws</h2>
        <p className="mt-1 text-sm text-gray-500">Legal requirements mapped to internal controls.</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* List Pane */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-lg shadow-subtle flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Requirements ({obligations.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {obligations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <p>No obligations activated yet.</p>
                <p className="mt-2 text-xs">Complete onboarding to activate obligations.</p>
              </div>
            ) : (
              obligations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedObligation(item)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedObligation?.id === item.id
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {item.domain}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.isActive
                          ? 'bg-status-successBg text-status-success'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h4
                    className={`text-sm font-medium ${
                      selectedObligation?.id === item.id ? 'text-primary-900' : 'text-gray-900'
                    }`}
                  >
                    {item.titleKo || item.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.evidenceFrequency}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Pane */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-subtle flex flex-col">
          {selectedObligation ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                {/* Header */}
                <div className="border-b border-gray-100 pb-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <span>{selectedObligation.domain}</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>{selectedObligation.evidenceFrequency}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedObligation.titleKo || selectedObligation.title}
                  </h1>
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedObligation.title}
                  </p>
                </div>

                {/* Section: What this means */}
                <section>
                  <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    <BookOpenIcon className="w-5 h-5 mr-2 text-gray-400" />
                    What this means
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm text-gray-700 leading-relaxed">
                    {selectedObligation.description || 'No description available.'}
                  </div>
                </section>

                {/* Section: Controls */}
                {selectedObligation.controls && selectedObligation.controls.length > 0 ? (
                  <section>
                    <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                      Controls ({selectedObligation.controls.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedObligation.controls.map((control: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-white p-4 rounded border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {control.control?.name || 'Unnamed Control'}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {control.control?.description}
                              </p>
                            </div>
                            {control.control?.isEffective ? (
                              <CheckCircleIcon className="w-5 h-5 text-status-success flex-shrink-0 ml-3" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-status-error flex-shrink-0 ml-3" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section>
                    <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                      Controls
                    </h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        No controls defined for this obligation yet. This represents a compliance gap.
                      </p>
                    </div>
                  </section>
                )}

                {/* Activation Details */}
                <section>
                  <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Activation Details
                  </h3>
                  <div className="bg-gray-50 rounded-md p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={selectedObligation.isActive ? 'text-status-success font-medium' : 'text-gray-500'}>
                        {selectedObligation.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Evidence Frequency:</span>
                      <span className="text-gray-900 font-medium">
                        {selectedObligation.evidenceFrequency}
                      </span>
                    </div>
                    {selectedObligation.activatedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Activated:</span>
                        <span className="text-gray-900">
                          {new Date(selectedObligation.activatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select an obligation to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
