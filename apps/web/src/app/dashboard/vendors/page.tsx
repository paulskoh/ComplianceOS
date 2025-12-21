'use client'

import { BuildingOfficeIcon, GlobeAltIcon, ShieldExclamationIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

const vendors = [
    { id: 1, name: 'AWS', type: 'Cloud Provider', risk: 'Low', dataContext: 'Customer Data (PII)', spend: '$120k/yr', nextReview: 'Dec 2025' },
    { id: 2, name: 'Salesforce', type: 'CRM', risk: 'Medium', dataContext: 'Sales Data', spend: '$45k/yr', nextReview: 'Jan 2025' },
    { id: 3, name: 'Slack', type: 'Communication', risk: 'Low', dataContext: 'Internal Chat', spend: '$12k/yr', nextReview: 'Mar 2025' },
    { id: 4, name: 'Startup AI Co.', type: 'AI Processing', risk: 'High', dataContext: 'Codebase', spend: '$5k/yr', nextReview: 'Overdue' },
]

export default function VendorsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Vendors & Third Parties</h2>
                    <p className="mt-1 text-sm text-gray-500">Risk assessment and asset classification for external entities.</p>
                </div>
                <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 shadow-sm">
                    Onboard Vendor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white border border-gray-200 rounded-lg shadow-subtle p-5 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                                    <BuildingOfficeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">{vendor.name}</h3>
                                    <p className="text-xs text-gray-500">{vendor.type}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${vendor.risk === 'High' ? 'bg-status-errorBg text-status-error border-status-error/20' :
                                    vendor.risk === 'Medium' ? 'bg-status-warningBg text-status-warning border-status-warning/20' :
                                        'bg-status-successBg text-status-success border-status-success/20'
                                }`}>
                                {vendor.risk} Risk
                            </span>
                        </div>

                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 flex items-center">
                                    <GlobeAltIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Data Context
                                </span>
                                <span className="font-medium text-gray-700">{vendor.dataContext}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 flex items-center">
                                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Annual Spend
                                </span>
                                <span className="font-medium text-gray-700">{vendor.spend}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                Review: <span className={vendor.nextReview === 'Overdue' ? 'text-status-error font-bold' : ''}>{vendor.nextReview}</span>
                            </div>
                            <button className="text-xs font-medium text-primary-600 hover:text-primary-800">Details &rarr;</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
