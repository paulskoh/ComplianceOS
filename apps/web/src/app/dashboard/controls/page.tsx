'use client'

import { CheckCircleIcon, ClockIcon, CogIcon } from '@heroicons/react/24/solid'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

const controls = [
  { id: 'CTL-001', name: 'Database Encryption', method: 'Automated', health: 'Healthy', lastAudit: '2 hours ago', evidence: 'Fresh' },
  { id: 'CTL-002', name: 'Developer Access Revocation', method: 'Manual', health: 'At Risk', lastAudit: '45 days ago', evidence: 'Stale' },
  { id: 'CTL-003', name: 'Weekly Vulnerability Scan', method: 'Automated', health: 'Healthy', lastAudit: '1 day ago', evidence: 'Fresh' },
  { id: 'CTL-004', name: 'New Vendor Risk Assessment', method: 'Semi-Auto', health: 'Healthy', lastAudit: '1 week ago', evidence: 'Fresh' },
  { id: 'CTL-005', name: 'Data Center Physical Access Review', method: 'Manual', health: 'Healthy', lastAudit: '2 months ago', evidence: 'Fresh' },
  { id: 'CTL-006', name: 'Production Change Approval', method: 'Automated', health: 'Healthy', lastAudit: '10 mins ago', evidence: 'Fresh' },
  { id: 'CTL-007', name: 'Firewall Rule Review', method: 'Semi-Auto', health: 'Warning', lastAudit: '1 month ago', evidence: 'Expiring' },
  { id: 'CTL-008', name: 'Employee Security Training', method: 'Automated', health: 'Healthy', lastAudit: '1 day ago', evidence: 'Fresh' },
]

export default function ControlsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Internal Controls</h2>
          <p className="mt-1 text-sm text-gray-500">Operational effectiveness and automation status.</p>
        </div>
      </div>

      <div className="bg-white shadow-subtle ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6">Control ID</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Control Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Audit</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {controls.map((control) => (
              <tr key={control.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-gray-500 sm:pl-6">{control.id}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{control.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <MethodBadge method={control.method} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <HealthIndicator status={control.health} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{control.lastAudit}</td>
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
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  let icon = <CogIcon className="w-3.5 h-3.5 mr-1" />
  let classes = "bg-gray-100 text-gray-600"

  if (method === 'Automated') {
    classes = "bg-primary-50 text-primary-700 border border-primary-100"
  } else if (method === 'Manual') {
    icon = <span className="mr-1">✍️</span>
    classes = "bg-orange-50 text-orange-700 border border-orange-100"
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {icon}
      {method}
    </span>
  )
}

function HealthIndicator({ status }: { status: string }) {
  if (status === 'Healthy') {
    return (
      <div className="flex items-center text-status-success">
        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
        <span>Operating</span>
      </div>
    )
  }
  if (status === 'At Risk') {
    return (
      <div className="flex items-center text-status-error">
        <ClockIcon className="w-4 h-4 mr-1.5" />
        <span>Failing</span>
      </div>
    )
  }
  if (status === 'Warning') {
    return (
      <div className="flex items-center text-status-warning">
        <ClockIcon className="w-4 h-4 mr-1.5" />
        <span>Check Needed</span>
      </div>
    )
  }
  return null
}
