'use client'

import { useState, useRef, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'
import { artifacts } from '@/lib/api'
import axios from 'axios'

interface UploadModalProps {
  isOpen?: boolean
  open?: boolean
  onClose: () => void
  evidenceRequirementId?: string
  onUploadComplete?: (artifact: any) => void
  onSuccess?: () => void
}

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error'

export default function UploadModal({
  isOpen,
  open,
  onClose,
  evidenceRequirementId,
  onUploadComplete,
  onSuccess,
}: UploadModalProps) {
  const modalOpen = open ?? isOpen ?? false
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadState('idle')
      setErrorMessage('')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      setUploadState('idle')
      setErrorMessage('')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const pollForAnalysis = async () => {
    if (!evidenceRequirementId) return

    const maxAttempts = 10 // 20 seconds with 2s intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        // Add cache-busting timestamp to prevent 304 responses
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/evidence-requirements/${evidenceRequirementId}/poll-status?_t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        )
        const data = await response.json()

        // Success if status is UPLOADED or VERIFIED (file successfully uploaded)
        if (data.status === 'UPLOADED' || data.status === 'VERIFIED' || data.analysisReady) {
          setUploadState('success')
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error('Polling error:', error)
        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }
    }

    // Timeout - show success anyway since upload completed
    setUploadState('success')
  }

  const handleUpload = async () => {
    if (!file) return

    setUploadState('uploading')
    setUploadProgress(0)
    setErrorMessage('')

    try {
      // Phase 1: Request upload intent and get presigned URL
      const intentResponse = await artifacts.createUploadIntent({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        evidenceRequirementId,
      })

      const { artifactId, version, upload } = intentResponse.data

      // Phase 2: Upload file to S3 using presigned URL
      const s3Response = await axios.put(upload.url, file, {
        headers: {
          'Content-Type': file.type,
          ...upload.headers,
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          setUploadProgress(progress)
        },
      })

      // Extract ETag from S3 response
      const etag = s3Response.headers.etag || s3Response.headers.ETag || ''

      // Phase 3: Finalize upload and trigger analysis
      const finalizeResponse = await artifacts.finalizeUpload(artifactId, version, etag)

      setUploadProgress(100)

      // If evidenceRequirementId is provided, poll for analysis completion
      if (evidenceRequirementId) {
        setUploadState('analyzing')
        await pollForAnalysis()
      } else {
        setUploadState('success')
      }

      // Call callbacks
      if (onUploadComplete) {
        onUploadComplete(finalizeResponse.data)
      }
      if (onSuccess) {
        onSuccess()
      }

      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error: any) {
      console.error('Upload failed:', error)
      setUploadState('error')
      setErrorMessage(
        error.response?.data?.message || error.message || '파일 업로드에 실패했습니다'
      )
    }
  }

  const handleClose = () => {
    setFile(null)
    setUploadState('idle')
    setUploadProgress(0)
    setErrorMessage('')
    onClose()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️'
    } else if (mimeType === 'application/pdf') {
      return '📄'
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝'
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return '📊'
    } else {
      return '📎'
    }
  }

  return (
    <Transition appear show={modalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    증빙 자료 업로드
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4">
                  {/* Upload State: Idle or Error */}
                  {(uploadState === 'idle' || uploadState === 'error') && (
                    <>
                      {/* Drag & Drop Area */}
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          파일을 드래그하거나 클릭하여 선택
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          PDF, Word, Excel, 이미지 (최대 50MB)
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          className="hidden"
                        />
                      </div>

                      {/* Selected File Info */}
                      {file && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getFileIcon(file.type)}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setFile(null)
                              }}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {uploadState === 'error' && errorMessage && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800">{errorMessage}</p>
                        </div>
                      )}

                      {/* Upload Button */}
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={handleUpload}
                          disabled={!file}
                          className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                          업로드
                        </button>
                      </div>
                    </>
                  )}

                  {/* Upload State: Uploading */}
                  {uploadState === 'uploading' && (
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">업로드 중...</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{uploadProgress}% 완료</p>
                    </div>
                  )}

                  {/* Upload State: Analyzing */}
                  {uploadState === 'analyzing' && (
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">AI 분석 중...</p>
                      <p className="text-xs text-gray-500">
                        문서를 분석하고 있습니다. 잠시만 기다려주세요.
                      </p>
                    </div>
                  )}

                  {/* Upload State: Success */}
                  {uploadState === 'success' && (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <p className="text-sm font-medium text-gray-900">업로드 성공!</p>
                      <p className="text-xs text-gray-500 mt-2">
                        문서 분석이 시작되었습니다. 잠시 후 결과를 확인할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
