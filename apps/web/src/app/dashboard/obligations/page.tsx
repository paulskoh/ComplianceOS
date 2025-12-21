'use client'

import { useState } from 'react'
import { CheckCircleIcon, BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const obligations = [
  {
    id: 'OBL-001',
    title: 'Personal Information Encryption',
    domain: 'Data Protection',
    law: 'PIPA Art. 29',
    status: 'Compliant',
    description: 'Personal information processors must take necessary measures to ensure safety, such as encrypting personal information to prevent loss, theft, leakage, forgery, or alteration.',
    inspectorQueries: [
      'Is the encryption algorithm used standard and up-to-date (e.g., AES-256)?',
      'Are encryption keys managed separately from the data?',
      'Is data encrypted in transit and at rest?'
    ],
    evidenceRequired: [
      'Encryption Policy Document',
      'Key Management Log',
      'Screenshot of DB configuration'
    ]
  },
  {
    id: 'OBL-002',
    title: 'Access Control System',
    domain: 'Access Control',
    law: 'ISMS-P 2.5.1',
    status: 'Partial',
    description: 'Establish and operate a system to control access to the information processing system.',
    inspectorQueries: [
      'Is MFA enforced for all administrative access?',
      'Are user access rights reviewed periodically?',
      'Is there an automated process for revoking access upon termination?'
    ],
    evidenceRequired: [
      'Access Control Policy',
      'User Access Review Report (Q3)',
      'MFA Configuration Evidence'
    ]
  },
  {
    id: 'OBL-003',
    title: 'Disaster Recovery Plan',
    domain: 'BCP',
    law: 'E-Transaction Act',
    status: 'Compliant',
    description: 'Establish a disaster recovery plan to ensure continuity of electronic financial transactions.',
    inspectorQueries: [
      'When was the last DR drill conducted?',
      'Is the RTO/RPO defined and met?',
      'Are backup integrity checks performed?'
    ],
    evidenceRequired: [
      'BCP/DR Plan Document',
      '2024 DR Drill Result Report'
    ]
  },
]

export default function ObligationsPage() {
  const [selectedObligation, setSelectedObligation] = useState(obligations[0])

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
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requirement List ({obligations.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {obligations.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedObligation(item)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedObligation.id === item.id ? 'bg-primary-50 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono text-gray-500">{item.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.status === 'Compliant' ? 'bg-status-successBg text-status-success' : 'bg-status-warningBg text-status-warning'}`}>
                    {item.status}
                  </span>
                </div>
                <h4 className={`text-sm font-medium ${selectedObligation.id === item.id ? 'text-primary-900' : 'text-gray-900'}`}>
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">{item.law}</p>
              </div>
            ))}
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
                    <span>{selectedObligation.law}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedObligation.title}</h1>
                </div>

                {/* Section: What this means */}
                <section>
                  <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    <BookOpenIcon className="w-5 h-5 mr-2 text-gray-400" />
                    What this means
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm text-gray-700 leading-relaxed">
                    {selectedObligation.description}
                  </div>
                </section>

                {/* Section: Inspector Queries */}
                <section>
                  <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    What Inspectors Ask
                  </h3>
                  <ul className="space-y-3">
                    {selectedObligation.inspectorQueries.map((query, idx) => (
                      <li key={idx} className="flex items-start bg-white p-3 rounded border border-gray-100 shadow-sm">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs mr-3">Q</span>
                        <span className="text-sm text-gray-800">{query}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Section: Evidence */}
                <section>
                  <h3 className="flex items-center text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Required Evidence
                  </h3>
                  <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
                    {selectedObligation.evidenceRequired.map((evidence, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                          <span className="text-sm text-gray-700">{evidence}</span>
                        </div>
                        <span className="text-xs text-gray-400">Required</span>
                      </div>
                    ))}
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
