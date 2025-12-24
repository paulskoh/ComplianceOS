'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { inspectionPacks, evidenceRequirements } from '@/lib/api'

interface PackGenerationModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PackGenerationModal({
  open,
  onClose,
  onSuccess,
}: PackGenerationModalProps) {
  const [step, setStep] = useState<'form' | 'generating' | 'success'>('form')
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedObligations, setSelectedObligations] = useState<string[]>([])
  const [obligations, setObligations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // Fetch obligations for selection
      fetchObligations()
      // Set default dates (last 3 months)
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 3)
      setEndDate(end.toISOString().split('T')[0])
      setStartDate(start.toISOString().split('T')[0])
    } else {
      // Reset on close
      setStep('form')
      setName('')
      setSelectedObligations([])
      setError('')
    }
  }, [open])

  const fetchObligations = async () => {
    try {
      const response = await evidenceRequirements.getOverview()
      setObligations(response.data.obligations || [])
      // Select all by default
      const allIds = response.data.obligations.map((o: any) => o.obligation.id)
      setSelectedObligations(allIds)
    } catch (err) {
      console.error('Failed to fetch obligations:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('검사 팩 이름을 입력하세요')
      return
    }

    if (!startDate || !endDate) {
      setError('기간을 선택하세요')
      return
    }

    setLoading(true)
    setError('')
    setStep('generating')

    try {
      // Convert dates to ISO datetime format
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const data = {
        name: name.trim(),
        domain: 'PRIVACY', // PIPA is privacy domain
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        obligationIds: selectedObligations.length > 0 ? selectedObligations : undefined,
      }

      await inspectionPacks.create(data)

      setStep('success')

      // Auto-close and refresh after 1.5s
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Failed to create inspection pack:', err)
      setError(err.response?.data?.message || '검사 팩 생성에 실패했습니다')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const toggleObligation = (id: string) => {
    if (selectedObligations.includes(id)) {
      setSelectedObligations(selectedObligations.filter((oid) => oid !== id))
    } else {
      setSelectedObligations([...selectedObligations, id])
    }
  }

  const toggleAll = () => {
    if (selectedObligations.length === obligations.length) {
      setSelectedObligations([])
    } else {
      setSelectedObligations(obligations.map((o) => o.obligation.id))
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                {step === 'form' && (
                  <>
                    <div className="absolute right-0 top-0 pr-4 pt-4">
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-gray-900"
                        >
                          새 검사 팩 생성
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            외부 감사관에게 제공할 증빙 패키지를 생성합니다. 선택한 기간의 증빙 자료가 포함됩니다.
                          </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                          {error && (
                            <div className="rounded-md bg-red-50 p-4">
                              <p className="text-sm text-red-800">{error}</p>
                            </div>
                          )}

                          <div>
                            <label
                              htmlFor="name"
                              className="block text-sm font-medium text-gray-700"
                            >
                              검사 팩 이름
                            </label>
                            <input
                              type="text"
                              id="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              placeholder="예: 2024 Q4 PIPA 준수 검사 팩"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="startDate"
                                className="block text-sm font-medium text-gray-700"
                              >
                                시작일
                              </label>
                              <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="endDate"
                                className="block text-sm font-medium text-gray-700"
                              >
                                종료일
                              </label>
                              <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                포함할 의무사항
                              </label>
                              <button
                                type="button"
                                onClick={toggleAll}
                                className="text-sm text-gray-600 hover:text-gray-900"
                              >
                                {selectedObligations.length === obligations.length
                                  ? '전체 해제'
                                  : '전체 선택'}
                              </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-200">
                              {obligations.map((item) => (
                                <label
                                  key={item.obligation.id}
                                  className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedObligations.includes(item.obligation.id)}
                                    onChange={() => toggleObligation(item.obligation.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                  />
                                  <div className="ml-3 flex-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.obligation.titleKo}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({item.evidenceRequirements.length}개 증빙)
                                    </span>
                                  </div>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                      item.obligation.severity === 'HIGH'
                                        ? 'bg-red-50 text-red-700'
                                        : item.obligation.severity === 'MEDIUM'
                                        ? 'bg-yellow-50 text-yellow-700'
                                        : 'bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    {item.obligation.severity === 'HIGH'
                                      ? '높음'
                                      : item.obligation.severity === 'MEDIUM'
                                      ? '중간'
                                      : '낮음'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                              type="submit"
                              disabled={loading}
                              className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 sm:ml-3 sm:w-auto"
                            >
                              {loading ? '생성 중...' : '검사 팩 생성'}
                            </button>
                            <button
                              type="button"
                              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                              onClick={onClose}
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </>
                )}

                {step === 'generating' && (
                  <div className="text-center py-12">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      검사 팩 생성 중...
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      선택한 증빙 자료를 수집하고 매니페스트를 생성하고 있습니다
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-12">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      검사 팩이 생성되었습니다
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      검사 팩 목록으로 이동합니다...
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
