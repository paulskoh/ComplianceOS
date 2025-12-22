'use client'

import { useEffect, useState } from 'react'
import { ArrowRightIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { readiness } from '@/lib/api'

export default function Home() {
  const [scoreData, setScoreData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await readiness.getScore()
        setScoreData(response.data)
      } catch (error) {
        console.error('Failed to fetch readiness score:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchScore()
  }, [])

  const score = scoreData?.score?.overall || 0
  const level = scoreData?.score?.level || 'UNKNOWN'
  const domains = scoreData?.breakdown || []

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return { bg: 'bg-status-successBg', text: 'text-status-success', label: 'Audit Ready' }
      case 'GOOD':
        return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Good Standing' }
      case 'FAIR':
        return { bg: 'bg-status-warningBg', text: 'text-status-warning', label: 'Needs Attention' }
      case 'POOR':
        return { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Action Required' }
      case 'CRITICAL':
        return { bg: 'bg-status-errorBg', text: 'text-status-error', label: 'Critical Issues' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Loading...' }
    }
  }

  const badge = getLevelBadge(level)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Executive Overview</h2>
        <p className="mt-1 text-sm text-gray-500">System status and immediate attention items.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Readiness & Domains (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* Readiness Score Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-subtle flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200"></div>
            <div className="text-center space-y-2 z-10">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Readiness Score</span>
              <div className="flex items-baseline justify-center space-x-2">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-16 w-32 bg-gray-200 rounded"></div>
                  </div>
                ) : (
                  <>
                    <span className="text-6xl font-bold text-gray-900 tracking-tighter">{score}</span>
                    <span className="text-2xl text-gray-400 font-light">/ 100</span>
                  </>
                )}
              </div>
              <div className={`flex items-center justify-center space-x-2 mt-4 ${badge.bg} px-3 py-1 rounded-full border border-${badge.text.replace('text-', '')}/10`}>
                <CheckCircleIcon className={`w-4 h-4 ${badge.text}`} />
                <span className={`text-sm font-medium ${badge.text}`}>{badge.label}</span>
              </div>
            </div>

            {/* Subtle background flair */}
            <div className="absolute opacity-[0.03] scale-150 pointer-events-none">
              <ShieldCheckIcon className="w-96 h-96" />
            </div>
          </div>

          {/* Domain Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-subtle overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-medium text-gray-900">Domain Performance</h3>
            </div>
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ) : domains.length > 0 ? (
                domains.map((domain: any) => (
                  <DomainRow
                    key={domain.domain}
                    name={domain.domain}
                    score={domain.score}
                    status={domain.score >= 75 ? 'good' : domain.score >= 60 ? 'warning' : 'attention'}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No domain data available</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Immediate Attention (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-subtle h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-status-errorBg/30">
              <h3 className="text-base font-medium text-gray-900 flex items-center">
                <ExclamationCircleIcon className="w-5 h-5 text-status-error mr-2" />
                Immediate Attention
              </h3>
              <span className="bg-white text-xs font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-600">5 Items</span>
            </div>
            <div className="divide-y divide-gray-100">
              <AttentionItem
                title="Vendor Assessment Overdue"
                desc="AWS (Amazon Web Services)"
                time="2 days overdue"
              />
              <AttentionItem
                title="Missing Evidence"
                desc="Access Control Review Q4"
                time="Due today"
              />
              <AttentionItem
                title="Policy Update Required"
                desc="Data Privacy Policy v2.1"
                time="5 days remaining"
              />
              <AttentionItem
                title="New Risk Identified"
                desc="API Auth Vulnerability"
                time="Critical"
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button className="w-full text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center group transition-colors">
                View Impact Analysis
                <ArrowRightIcon className="w-4 h-4 ml-1 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DomainRow({ name, score, status }: { name: string, score: number, status: 'good' | 'warning' | 'attention' }) {
  let colorClass = 'bg-gray-200';
  if (status === 'good') colorClass = 'bg-status-success';
  if (status === 'warning') colorClass = 'bg-status-warning';
  if (status === 'attention') colorClass = 'bg-status-error';

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-sm font-mono text-gray-500">{score}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  )
}

function AttentionItem({ title, desc, time }: { title: string, desc: string, time: string }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center">
        <span className="text-[10px] uppercase font-bold tracking-wide text-status-error bg-status-errorBg px-1.5 py-0.5 rounded border border-status-error/10">
          {time}
        </span>
      </div>
    </div>
  )
}
