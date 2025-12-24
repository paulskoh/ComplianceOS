'use client'

import { useState } from 'react'
import {
  DocumentCheckIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import UploadModal from './UploadModal'

interface EvidenceRequirement {
  id: string
  name: string
  description: string
  freshnessWindowDays: number
  required: boolean
  acceptanceCriteria?: string[]
  control: {
    id: string
    name: string
    code?: string
  }
  artifacts?: Array<{
    id: string
    filename: string
    uploadedAt: string
    status: 'PENDING' | 'ANALYZED' | 'APPROVED' | 'REJECTED'
  }>
}

interface EvidenceRequirementsListProps {
  evidenceRequirements: EvidenceRequirement[]
  onUploadComplete?: () => void
}

export default function EvidenceRequirementsList({
  evidenceRequirements,
  onUploadComplete,
}: EvidenceRequirementsListProps) {
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set())

  const handleUploadClick = (requirementId: string) => {
    setSelectedRequirement(requirementId)
    setIsUploadModalOpen(true)
  }

  const toggleExpanded = (requirementId: string) => {
    const newExpanded = new Set(expandedRequirements)
    if (newExpanded.has(requirementId)) {
      newExpanded.delete(requirementId)
    } else {
      newExpanded.add(requirementId)
    }
    setExpandedRequirements(newExpanded)
  }

  const getStatusBadge = (requirement: EvidenceRequirement) => {
    const hasArtifacts = requirement.artifacts && requirement.artifacts.length > 0

    if (!hasArtifacts && requirement.required) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          필수 제출
        </span>
      )
    }

    if (!hasArtifacts) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <ClockIcon className="h-4 w-4 mr-1" />
          미제출
        </span>
      )
    }

    const latestArtifact = requirement.artifacts[0]
    if (latestArtifact.status === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          승인됨
        </span>
      )
    }

    if (latestArtifact.status === 'ANALYZED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <DocumentCheckIcon className="h-4 w-4 mr-1" />
          분석 완료
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <ClockIcon className="h-4 w-4 mr-1" />
        검토 중
      </span>
    )
  }

  const groupedRequirements = evidenceRequirements.reduce((acc, req) => {
    const controlName = req.control.name
    if (!acc[controlName]) {
      acc[controlName] = []
    }
    acc[controlName].push(req)
    return acc
  }, {} as Record<string, EvidenceRequirement[]>)

  if (evidenceRequirements.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">증빙 요건이 없습니다</h3>
        <p className="mt-1 text-sm text-gray-500">
          온보딩을 완료하면 증빙 요건이 생성됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedRequirements).map(([controlName, requirements]) => (
          <div key={controlName} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{controlName}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {requirements.length}개의 증빙 요건
              </p>
            </div>

            <ul className="divide-y divide-gray-200">
              {requirements.map((requirement) => {
                const isExpanded = expandedRequirements.has(requirement.id)

                return (
                  <li key={requirement.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggleExpanded(requirement.id)}
                          className="text-left w-full"
                        >
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900 hover:text-blue-600">
                              {requirement.name}
                            </h4>
                            {getStatusBadge(requirement)}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{requirement.description}</p>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                            {requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  인정 기준:
                                </p>
                                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                  {requirement.acceptanceCriteria.map((criteria, idx) => (
                                    <li key={idx}>{criteria}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="text-xs text-gray-500">
                              유효 기간: {requirement.freshnessWindowDays}일
                            </div>

                            {/* Uploaded Artifacts */}
                            {requirement.artifacts && requirement.artifacts.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  제출된 증빙:
                                </p>
                                <ul className="space-y-2">
                                  {requirement.artifacts.map((artifact) => (
                                    <li
                                      key={artifact.id}
                                      className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                                    >
                                      <span className="font-medium text-gray-900">
                                        {artifact.filename}
                                      </span>
                                      <span className="text-gray-500">
                                        {new Date(artifact.uploadedAt).toLocaleDateString('ko-KR')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={() => handleUploadClick(requirement.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                          업로드
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setSelectedRequirement(null)
        }}
        evidenceRequirementId={selectedRequirement || undefined}
        onUploadComplete={() => {
          if (onUploadComplete) {
            onUploadComplete()
          }
        }}
      />
    </>
  )
}
