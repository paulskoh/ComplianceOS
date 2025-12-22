'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { onboarding } from '@/lib/api'

const industryOptions = [
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'OTHER', label: 'Other' },
]

const dataTypeOptions = [
  { value: 'EMPLOYEE_DATA', label: 'Employee Data' },
  { value: 'CUSTOMER_DATA', label: 'Customer Data' },
  { value: 'RESIDENT_NUMBERS', label: 'Resident Numbers (주민등록번호)' },
  { value: 'HEALTH_DATA', label: 'Health Data' },
  { value: 'FINANCIAL_DATA', label: 'Financial Data' },
  { value: 'BIOMETRIC_DATA', label: 'Biometric Data' },
  { value: 'LOCATION_DATA', label: 'Location Data' },
]

const revenueOptions = [
  { value: 'UNDER_1B', label: 'Under 1 Billion KRW' },
  { value: 'ONE_B_TO_10B', label: '1-10 Billion KRW' },
  { value: 'TEN_B_TO_100B', label: '10-100 Billion KRW' },
  { value: 'OVER_100B', label: 'Over 100 Billion KRW' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    employeeCount: 0,
    hasRemoteWork: false,
    hasOvertimeWork: false,
    hasContractors: false,
    hasVendors: false,
    dataTypes: [] as string[],
    hasInternationalTransfer: false,
    annualRevenue: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onboarding.completeOnboarding({
        ...formData,
        employeeCount: Number(formData.employeeCount),
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Onboarding failed:', error)
      alert(error.response?.data?.message || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleDataType = (dataType: string) => {
    setFormData(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter(d => d !== dataType)
        : [...prev.dataTypes, dataType],
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          ComplianceOS Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tell us about your company so we can activate the right legal obligations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                required
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                Industry
              </label>
              <select
                id="industry"
                required
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select industry...</option>
                {industryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Employee Count */}
            <div>
              <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700">
                Number of Employees
              </label>
              <input
                type="number"
                id="employeeCount"
                required
                min="1"
                value={formData.employeeCount || ''}
                onChange={(e) => updateField('employeeCount', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* Annual Revenue */}
            <div>
              <label htmlFor="annualRevenue" className="block text-sm font-medium text-gray-700">
                Annual Revenue (Optional)
              </label>
              <select
                id="annualRevenue"
                value={formData.annualRevenue}
                onChange={(e) => updateField('annualRevenue', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select revenue range...</option>
                {revenueOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Boolean Questions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Work Practices</h3>

              <CheckboxField
                label="Do you have remote workers?"
                checked={formData.hasRemoteWork}
                onChange={(checked) => updateField('hasRemoteWork', checked)}
              />

              <CheckboxField
                label="Do employees work overtime?"
                checked={formData.hasOvertimeWork}
                onChange={(checked) => updateField('hasOvertimeWork', checked)}
              />

              <CheckboxField
                label="Do you use contractors or freelancers?"
                checked={formData.hasContractors}
                onChange={(checked) => updateField('hasContractors', checked)}
              />

              <CheckboxField
                label="Do you work with vendors who handle your data?"
                checked={formData.hasVendors}
                onChange={(checked) => updateField('hasVendors', checked)}
              />

              <CheckboxField
                label="Do you transfer personal data internationally?"
                checked={formData.hasInternationalTransfer}
                onChange={(checked) => updateField('hasInternationalTransfer', checked)}
              />
            </div>

            {/* Data Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What types of personal data do you handle?
              </label>
              <div className="space-y-2">
                {dataTypeOptions.map(opt => (
                  <CheckboxField
                    key={opt.value}
                    label={opt.label}
                    checked={formData.dataTypes.includes(opt.value)}
                    onChange={() => toggleDataType(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
      />
      <label className="ml-2 block text-sm text-gray-700">
        {label}
      </label>
    </div>
  )
}
