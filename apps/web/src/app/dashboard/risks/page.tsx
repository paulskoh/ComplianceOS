'use client'

import { useQuery } from '@tanstack/react-query'
import { risks } from '@/lib/api'

export default function RisksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: async () => {
      const response = await risks.getAll()
      return response.data
    },
  })

  if (isLoading) {
    return <div className="text-gray-600">Loading...</div>
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Risk Register</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          Add Risk
        </button>
      </div>

      <div className="grid gap-4">
        {data?.map((risk: any) => (
          <div key={risk.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {risk.title}
              </h3>
              <div className="flex gap-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityColor(risk.severity)}`}>
                  {risk.severity}
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {risk.status}
                </span>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">{risk.description}</p>
            <div className="flex gap-4 text-sm text-gray-500">
              {risk.obligation && <span>Obligation: {risk.obligation.title}</span>}
              {risk.control && <span>Control: {risk.control.name}</span>}
              {risk.dueDate && <span>Due: {new Date(risk.dueDate).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
