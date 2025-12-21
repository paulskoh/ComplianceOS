'use client'

import { DocumentTextIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline'

const policies = [
    { id: 'POL-001', name: 'Information Security Policy', version: '3.0', lastUpdated: '2024-11-01', owner: 'CISO', status: 'Active', ackRate: 98 },
    { id: 'POL-002', name: 'Data Privacy Policy', version: '2.1', lastUpdated: '2024-10-15', owner: 'DPO', status: 'Reviewing', ackRate: 85 },
    { id: 'POL-003', name: 'Remote Work Security Guidelines', version: '1.2', lastUpdated: '2024-06-20', owner: 'HR / IT', status: 'Active', ackRate: 92 },
    { id: 'POL-004', name: 'Access Control Policy', version: '4.0', lastUpdated: '2024-12-01', owner: 'IAM Team', status: 'Draft', ackRate: 0 },
    { id: 'POL-005', name: 'Incident Response Plan', version: '2.0', lastUpdated: '2024-08-30', owner: 'SecOps', status: 'Active', ackRate: 100 },
]

export default function PoliciesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Policies & Training</h2>
                    <p className="mt-1 text-sm text-gray-500">Governance documents and employee acknowledgement tracking.</p>
                </div>
                <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm">
                    Draft New Policy
                </button>
            </div>

            <div className="bg-white shadow-subtle rounded-lg border border-gray-200 overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {policies.map((policy) => (
                        <li key={policy.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-primary-50 p-2 rounded">
                                    <DocumentTextIcon className="w-5 h-5 text-primary-600" />
                                </div>
                                <div className="ml-4">
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-900">{policy.name}</p>
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            v{policy.version}
                                        </span>
                                        {policy.status === 'Draft' && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center text-xs text-gray-500 space-x-4">
                                        <span className="flex items-center">
                                            <ClockIcon className="w-3.5 h-3.5 mr-1" />
                                            Updated {policy.lastUpdated}
                                        </span>
                                        <span>Owner: {policy.owner}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-6">
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center text-xs text-gray-500 mb-1">
                                        <UserGroupIcon className="w-3.5 h-3.5 mr-1" />
                                        Acknowledgement
                                    </div>
                                    <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-status-success h-1.5 rounded-full" style={{ width: `${policy.ackRate}%` }}></div>
                                    </div>
                                    <span className="text-xs font-medium mt-0.5">{policy.ackRate}%</span>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    Edit
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
