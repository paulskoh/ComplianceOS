'use client'

import { useEffect, useState } from 'react'
import { FunnelIcon, ArrowsUpDownIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { readiness } from '@/lib/api'

const tabs = [
  { name: 'Gap Analysis', current: true },
  { name: 'Risk Register', current: false },
  { name: 'Control Coverage', current: false },
]

export default function ReadinessPage() {
  const [gapData, setGapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchGaps() {
      try {
        const response = await readiness.getGaps()
        setGapData(response.data)
      } catch (error) {
        console.error('Failed to fetch gaps:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGaps()
  }, [])

  const gaps = gapData?.gaps || []
  const filteredGaps = filter === 'all'
    ? gaps
    : gaps.filter((gap: any) => gap.severity === filter)

  const gapStats = {
    critical: gaps.filter((g: any) => g.severity === 'CRITICAL').length,
    high: gaps.filter((g: any) => g.severity === 'HIGH').length,
    medium: gaps.filter((g: any) => g.severity === 'MEDIUM').length,
    low: gaps.filter((g: any) => g.severity === 'LOW').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Readiness & Risk</h2>
          <p className="mt-1 text-sm text-gray-500">Compliance gaps and action items.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Export Report
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
            Generate Evidence Pack
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard label="Critical" count={gapStats.critical} color="red" />
        <StatCard label="High" count={gapStats.high} color="orange" />
        <StatCard label="Medium" count={gapStats.medium} color="yellow" />
        <StatCard label="Low" count={gapStats.low} color="gray" />
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-t-lg border border-b-0 border-gray-200 flex items-center justify-between">
        <div className="relative rounded-md shadow-sm max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
            placeholder="Search gaps..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Gaps Table */}
      <div className="bg-white shadow-subtle border border-gray-200 rounded-b-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : filteredGaps.length === 0 ? (
          <div className="p-12 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No gaps found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all'
                ? 'All compliance requirements are met!'
                : 'No gaps found for this severity level.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obligation</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGaps.map((gap: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <GapTypeBadge type={gap.type} />
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <SeverityBadge severity={gap.severity} />
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {gap.description}
                      {gap.daysSinceEvidence && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Last evidence: {gap.daysSinceEvidence} days ago
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {gap.obligationTitle}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      <button className="text-primary-600 hover:text-primary-900 font-medium">
                        Fix →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${colorClasses[color]} px-4 py-5 sm:p-6`}>
      <dt className="truncate text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight">{count}</dd>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  let classes = "bg-gray-100 text-gray-800";
  if (severity === 'CRITICAL') classes = "bg-status-errorBg text-status-error border border-status-error/20";
  if (severity === 'HIGH') classes = "bg-orange-50 text-orange-700 border border-orange-200";
  if (severity === 'MEDIUM') classes = "bg-yellow-50 text-yellow-700 border border-yellow-200";
  if (severity === 'LOW') classes = "bg-gray-100 text-gray-600 border border-gray-200";

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}`}>
      {severity}
    </span>
  )
}

function GapTypeBadge({ type }: { type: string }) {
  const typeLabels: Record<string, string> = {
    MISSING_EVIDENCE: 'Missing Evidence',
    OUTDATED_EVIDENCE: 'Outdated Evidence',
    NO_CONTROL: 'No Control',
    UNAPPROVED_EXCEPTION: 'Unapproved Exception',
  }

  return (
    <span className="text-xs font-mono text-gray-600">
      {typeLabels[type] || type}
    </span>
  )
}
