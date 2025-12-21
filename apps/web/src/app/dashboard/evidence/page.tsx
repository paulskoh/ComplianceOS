'use client'

import { useState } from 'react'
import { InboxStackIcon, FolderIcon, DocumentIcon, PaperClipIcon, CalendarIcon } from '@heroicons/react/24/outline'

export default function EvidencePage() {
  const [activeTab, setActiveTab] = useState('inbox')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Evidence Management</h2>
          <p className="mt-1 text-sm text-gray-500">Collect, classify, and retain audit evidence.</p>
        </div>
        <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 shadow-sm">
          Upload Evidence
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`${activeTab === 'inbox' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <InboxStackIcon className="w-5 h-5 mr-2" />
            Inbox
            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">3</span>
          </button>
          <button
            onClick={() => setActiveTab('repository')}
            className={`${activeTab === 'repository' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FolderIcon className="w-5 h-5 mr-2" />
            Repository
          </button>
        </nav>
      </div>

      {activeTab === 'inbox' ? <EvidenceInbox /> : <EvidenceRepository />}
    </div>
  )
}

function EvidenceInbox() {
  const items = [
    { id: 1, name: 'AWS_Config_Snapshot_2024-12-21.json', source: 'AWS Integration', date: '10 mins ago', size: '2.4 MB' },
    { id: 2, name: 'Slack_Access_Logs_Q4.csv', source: 'Slack Integration', date: '2 hours ago', size: '14 KB' },
    { id: 3, name: 'Screen_Shot_2024-12-20.png', source: 'Manual Upload (J. Doe)', date: 'Yesterday', size: '4.1 MB' },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-subtle overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900">Unclassified Evidence</h3>
        <span className="text-xs text-gray-500">Items waiting for mapping</span>
      </div>
      <ul className="divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
            <div className="flex items-start space-x-4">
              <div className="bg-gray-100 p-2 rounded">
                <DocumentIcon className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{item.source}</span>
                  <span>&bull;</span>
                  <span>{item.size}</span>
                  <span>&bull;</span>
                  <span>{item.date}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50">View</button>
              <button className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 shadow-sm">Map to Control</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceRepository() {
  const files = [
    { id: 1, name: 'Q4_Access_Review_Signed.pdf', control: 'CTL-002', period: '2024-Q4', uploader: 'System' },
    { id: 2, name: 'Penetration_Test_Report_vFinal.pdf', control: 'CTL-003', period: '2024-H2', uploader: 'Ext. Auditor' },
    { id: 3, name: 'Security_Policy_v2.1.pdf', control: 'CTL-015', period: 'Effective', uploader: 'Policy Mgr' },
    { id: 4, name: 'Data_Backup_Logs_Dec.zip', control: 'CTL-009', period: '2024-12', uploader: 'Auto-Collector' },
  ]

  return (
    <div className="flex flex-col">
      {/* Filters */}
      <div className="flex space-x-3 mb-4">
        <select className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
          <option>All Controls</option>
          <option>CTL-002</option>
        </select>
        <select className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
          <option>All Periods</option>
          <option>2024-Q4</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-subtle overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Control</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group flex items-center">
                  <PaperClipIcon className="w-4 h-4 text-gray-400 mr-2" />
                  {file.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono bg-gray-50 rounded w-min">
                  {file.control}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-1.5" />
                  {file.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.uploader}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" className="text-primary-600 hover:text-primary-900">Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
