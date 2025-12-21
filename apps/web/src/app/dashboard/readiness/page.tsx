'use client'

import { useState } from 'react'
import { FunnelIcon, ArrowsUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const tabs = [
  { name: 'Overview', current: false },
  { name: 'Risk Register', current: true }, // Default for demo
  { name: 'Control Coverage', current: false },
  { name: 'Scenario Analysis', current: false },
]

const risks = [
  { id: 'RSK-001', domain: 'InfoSec', risk: 'Unauth Access to Customer Data', owner: 'J. Doe', impact: 'High', likelihood: 'Low', status: 'Mitigated' },
  { id: 'RSK-002', domain: 'Privacy', risk: 'GDPR Data Subject Request Failure', owner: 'Legal Team', impact: 'High', likelihood: 'Medium', status: 'Open' },
  { id: 'RSK-003', domain: 'TPRM', risk: 'Vendor Supply Chain Disruption', owner: 'Procurement', impact: 'Medium', likelihood: 'Medium', status: 'Accepted' },
  { id: 'RSK-004', domain: 'InfoSec', risk: 'Phishing Attack Success', owner: 'SecOps', impact: 'High', likelihood: 'High', status: 'mitigating' },
  { id: 'RSK-005', domain: 'Infra', risk: 'Cloud Misconfiguration', owner: 'DevOps', impact: 'Critical', likelihood: 'Low', status: 'Mitigated' },
  { id: 'RSK-006', domain: 'HR', risk: 'Key Person Dependency', owner: 'HR Director', impact: 'Medium', likelihood: 'Low', status: 'Accepted' },
  { id: 'RSK-007', domain: 'Legal', risk: 'License Compliance Violation', owner: 'Legal Team', impact: 'Low', likelihood: 'Low', status: 'Mitigated' },
  { id: 'RSK-008', domain: 'InfoSec', risk: 'Ransomware Infection', owner: 'CISO', impact: 'Critical', likelihood: 'Medium', status: 'Open' },
  { id: 'RSK-009', domain: 'Fin', risk: 'Payment Gateway Failure', owner: 'Eng Lead', impact: 'High', likelihood: 'Low', status: 'Mitigated' },
  { id: 'RSK-010', domain: 'Privacy', risk: 'Cookie Consent Violation', owner: 'Marketing', impact: 'Low', likelihood: 'Medium', status: 'Open' },
]

export default function ReadinessPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Readiness & Risk</h2>
          <p className="mt-1 text-sm text-gray-500">Central control room for risk identification and mitigation.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Export Report
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
            Add New Risk
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <a
              key={tab.name}
              href="#"
              className={`${tab.current
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              aria-current={tab.current ? 'page' : undefined}
            >
              {tab.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-t-lg border border-b-0 border-gray-200 flex items-center justify-between">
        <div className="relative rounded-md shadow-sm max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="search"
            id="search"
            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
            placeholder="Search risks, owners, or IDs..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2 text-gray-500" />
            Filters
          </button>
          <button className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">
            <ArrowsUpDownIcon className="h-4 w-4 mr-2 text-gray-500" />
            Sort
          </button>
        </div>
      </div>

      {/* Risk Register Table */}
      <div className="bg-white shadow-subtle border border-gray-200 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Risk Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-3 whitespace-nowrap text-xs font-mono text-gray-500 group-hover:text-gray-900">
                    {risk.id}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">
                    {risk.domain}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                    {risk.risk}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">
                    {risk.owner}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <ImpactBadge impact={risk.impact} />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <StatusChip status={risk.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="text-xs text-gray-500">
            Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of <span className="font-medium">42</span> results
          </div>
          <div className="flex-1 flex justify-end">
            <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </a>
            <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImpactBadge({ impact }: { impact: string }) {
  let classes = "bg-gray-100 text-gray-800";
  if (impact === 'Critical') classes = "bg-status-errorBg text-status-error border border-status-error/20";
  if (impact === 'High') classes = "bg-orange-50 text-orange-700 border border-orange-200";
  if (impact === 'Medium') classes = "bg-yellow-50 text-yellow-700 border border-yellow-200";
  if (impact === 'Low') classes = "bg-gray-100 text-gray-600 border border-gray-200";

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}`}>
      {impact}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  let classes = "bg-gray-100 text-gray-800";
  // Normalize status text
  const s = status.toLowerCase();

  if (s === 'mitigated') classes = "bg-status-successBg text-status-success ring-1 ring-inset ring-status-success/20";
  if (s === 'open') classes = "bg-white text-gray-700 ring-1 ring-inset ring-gray-300";
  if (s === 'accepted') classes = "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200";
  if (s === 'mitigating') classes = "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${classes}`}>
      {s === 'mitigated' && <span className="w-1.5 h-1.5 bg-status-success rounded-full mr-1.5"></span>}
      {s === 'open' && <span className="w-1.5 h-1.5 bg-status-error rounded-full mr-1.5"></span>}
      {status}
    </span>
  )
}
