'use client'

import { ArrowRightIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function Home() {
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
                <span className="text-6xl font-bold text-gray-900 tracking-tighter">84</span>
                <span className="text-2xl text-gray-400 font-light">/ 100</span>
              </div>
              <div className="flex items-center justify-center space-x-2 mt-4 bg-status-successBg px-3 py-1 rounded-full border border-status-success/10">
                <CheckCircleIcon className="w-4 h-4 text-status-success" />
                <span className="text-sm font-medium text-status-success">Audit Ready</span>
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
              <DomainRow name="Information Security" score={92} status="good" />
              <DomainRow name="Personal Data Protection" score={78} status="warning" />
              <DomainRow name="Third Party Risk" score={65} status="attention" />
              <DomainRow name="Business Continuity" score={88} status="good" />
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
