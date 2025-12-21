'use client'

import { ArchiveBoxIcon, CheckBadgeIcon, LockClosedIcon } from '@heroicons/react/24/solid'

export default function InspectionPacksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Inspection Packs</h2>
        <p className="mt-1 text-sm text-gray-500">Generate immutable evidence packages for external auditors.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-subtle p-8 text-center max-w-2xl mx-auto border-dashed border-2">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
          <ArchiveBoxIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Create new Inspection Pack</h3>
        <p className="mt-1 text-sm text-gray-500">Start a wizard to bundle evidence, policies, and logs for a specific audit scope.</p>
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Start Pack Builder
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Packs</h3>
        <div className="bg-white shadow-subtle overflow-hidden border border-gray-200 sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            <PackItem
              name="ISMS-P Preliminary Audit Pack"
              scope="Full Scope"
              date="Dec 15, 2024"
              status="Locked"
              auditor="KISA"
            />
            <PackItem
              name="ISO 27001 Surveillance"
              scope="Access Control & HR"
              date="Nov 02, 2024"
              status="Locked"
              auditor="BSI"
            />
          </ul>
        </div>
      </div>
    </div>
  )
}

function PackItem({ name, scope, date, status, auditor }: { name: string, scope: string, date: string, status: string, auditor: string }) {
  return (
    <li>
      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 relative">
              <ArchiveBoxIcon className="h-10 w-10 text-gray-400" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <LockClosedIcon className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-primary-700">{name}</p>
              <div className="flex space-x-2 text-xs text-gray-500 mt-0.5">
                <span>{scope}</span>
                <span>&bull;</span>
                <span>For: {auditor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex flex-col items-end mr-6">
              <p className="text-xs text-gray-500">Generated on {date}</p>
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <CheckBadgeIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-status-success" />
                <p>Verified Immutable</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 text-sm font-medium border border-gray-300 rounded px-3 py-1 bg-white shadow-sm">
              Download
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
