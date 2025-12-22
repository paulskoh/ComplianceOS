'use client'

import { useState, useEffect } from 'react'
import { exceptions } from '@/lib/api'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

type ExceptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

interface ExceptionRequest {
  id: string
  controlId: string
  reason: string
  compensatingControls?: string
  durationDays: number
  status: ExceptionStatus
  approvedBy?: string
  approvedAt?: string
  expiresAt?: string
  createdAt: string
  control: {
    id: string
    name: string
    obligations: Array<{
      obligation: {
        id: string
        title: string
        titleKo?: string
      }
    }>
  }
}

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  expired: number
  expiringSoon: number
}

export default function ExceptionsPage() {
  const [exceptionList, setExceptionList] = useState<ExceptionRequest[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<ExceptionStatus | 'ALL'>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const [exceptionsRes, statsRes] = await Promise.all([
        exceptions.getAll(selectedStatus === 'ALL' ? undefined : selectedStatus),
        exceptions.getStats(),
      ])
      setExceptionList(exceptionsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load exceptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this exception request?')) return

    try {
      await exceptions.approve(id)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve exception')
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      await exceptions.reject(id, reason)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject exception')
    }
  }

  const handleRevoke = async (id: string) => {
    const reason = prompt('Please provide a reason for revoking this exception:')
    if (!reason) return

    try {
      await exceptions.revoke(id, reason)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to revoke exception')
    }
  }

  const getStatusBadge = (status: ExceptionStatus) => {
    const styles: Record<ExceptionStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    )
  }

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exception Tracking</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage compliance exception requests and approvals
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          Request Exception
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          <StatsCard
            title="Total"
            value={stats.total}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color="gray"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon={<ClockIcon className="h-6 w-6" />}
            color="yellow"
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircleIcon className="h-6 w-6" />}
            color="red"
          />
          <StatsCard
            title="Expired"
            value={stats.expired}
            icon={<ClockIcon className="h-6 w-6" />}
            color="gray"
          />
          <StatsCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color="orange"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedStatus === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Exception List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Control
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exceptionList.map((exception) => {
              const daysRemaining = getDaysRemaining(exception.expiresAt)
              const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0

              return (
                <tr key={exception.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {exception.control.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {exception.control.obligations[0]?.obligation.titleKo ||
                       exception.control.obligations[0]?.obligation.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={exception.reason}>
                      {exception.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {exception.durationDays} days
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(exception.status)}
                  </td>
                  <td className="px-6 py-4">
                    {exception.expiresAt ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(exception.expiresAt).toLocaleDateString()}
                        </div>
                        {daysRemaining !== null && (
                          <div className={`text-xs ${isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {exception.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(exception.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(exception.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {exception.status === 'APPROVED' && (
                      <button
                        onClick={() => handleRevoke(exception.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {exceptionList.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No exception requests found
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateExceptionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function StatsCard({ title, value, icon, color }: any) {
  const colorStyles: Record<string, string> = {
    gray: 'text-gray-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorStyles[color]}`}>{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-semibold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateExceptionModal({ onClose, onSuccess }: any) {
  const [controls, setControls] = useState<any[]>([])
  const [formData, setFormData] = useState({
    controlId: '',
    reason: '',
    compensatingControls: '',
    durationDays: 30,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadControls()
  }, [])

  const loadControls = async () => {
    try {
      const res = await exceptions.getAll()
      // In a real app, fetch controls from the controls API
      // For now, use empty array
      setControls([])
    } catch (error) {
      console.error('Failed to load controls:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await exceptions.create({
        ...formData,
        durationDays: Number(formData.durationDays),
      })
      onSuccess()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create exception request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Request Exception</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Control ID</label>
            <input
              type="text"
              required
              value={formData.controlId}
              onChange={(e) => setFormData({ ...formData, controlId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="Enter control ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="Explain why this exception is needed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Compensating Controls (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.compensatingControls}
              onChange={(e) => setFormData({ ...formData, compensatingControls: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="Describe any compensating controls..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (Days)</label>
            <input
              type="number"
              required
              min="1"
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Exception Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
