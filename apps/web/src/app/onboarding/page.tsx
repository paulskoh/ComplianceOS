'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, ChevronLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { onboarding } from '@/lib/api'

interface Question {
  id: string
  type: 'text' | 'select' | 'radio' | 'checkbox'
  label: string
  required: boolean
  placeholder?: string
  helpText?: string
  options?: Array<{ value: any; label: string }>
  dependsOn?: { field: string; value: any }
}

interface Step {
  step: number
  title: string
  description: string
  questions: Question[]
}

interface OnboardingQuestions {
  steps: Step[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [questions, setQuestions] = useState<OnboardingQuestions | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch onboarding questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await onboarding.getQuestions()
        setQuestions(response.data)
      } catch (error) {
        console.error('Failed to fetch questions:', error)
      }
    }
    fetchQuestions()
  }, [])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const toggleCheckbox = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field] || []
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current, value],
      }
    })
  }

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {}

    for (const question of step.questions) {
      // Check if question is conditionally shown
      if (question.dependsOn) {
        const dependentValue = formData[question.dependsOn.field]
        if (dependentValue !== question.dependsOn.value) {
          continue // Skip validation for hidden questions
        }
      }

      if (question.required) {
        const value = formData[question.id]
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = '이 항목은 필수입니다'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!questions) return

    const currentStepData = questions.steps.find(s => s.step === currentStep)
    if (!currentStepData) return

    if (validateStep(currentStepData)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  // Map form data to DTO format
  const mapFormDataToDto = (data: Record<string, any>) => {
    // Convert employee count string to number
    const employeeCountMap: Record<string, number> = {
      '1-9': 5,
      '10-29': 20,
      '30-99': 50,
      '100-299': 150,
      '300+': 400,
    }

    return {
      companyName: data.company_name || '',
      industry: data.industry || 'OTHER',
      employeeCount: employeeCountMap[data.employee_count] || 10,
      hasRemoteWork: data.has_remote_work === true,
      hasOvertimeWork: data.has_overtime_work === true,
      hasContractors: data.has_contractors === true,
      hasVendors: data.has_vendors === true,
      dataTypes: data.data_types || [],
      hasInternationalTransfer: data.has_international_transfer === true,
    }
  }

  const handleSubmit = async () => {
    if (!questions) return

    const currentStepData = questions.steps.find(s => s.step === currentStep)
    if (!currentStepData || !validateStep(currentStepData)) return

    setLoading(true)

    try {
      // Map form data to DTO format
      const profileDto = mapFormDataToDto(formData)

      // First, complete the onboarding profile
      await onboarding.completeOnboarding(profileDto)

      // Then apply the PIPA content pack
      await onboarding.applyPIPAContentPack()

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Onboarding failed:', error)
      alert(error.response?.data?.message || '온보딩 처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const renderQuestion = (question: Question) => {
    // Check if question should be shown
    if (question.dependsOn) {
      const dependentValue = formData[question.dependsOn.field]
      if (dependentValue !== question.dependsOn.value) {
        return null
      }
    }

    const hasError = !!errors[question.id]
    const errorClass = hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'

    switch (question.type) {
      case 'text':
        return (
          <div key={question.id}>
            <label htmlFor={question.id} className="block text-sm font-medium text-gray-700">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              id={question.id}
              value={formData[question.id] || ''}
              onChange={(e) => updateField(question.id, e.target.value)}
              placeholder={question.placeholder}
              className={`mt-1 block w-full rounded-md shadow-sm ${errorClass}`}
            />
            {hasError && <p className="mt-1 text-sm text-red-600">{errors[question.id]}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={question.id}>
            <label htmlFor={question.id} className="block text-sm font-medium text-gray-700">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={question.id}
              value={formData[question.id] || ''}
              onChange={(e) => updateField(question.id, e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm ${errorClass}`}
            >
              <option value="">선택하세요...</option>
              {question.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {hasError && <p className="mt-1 text-sm text-red-600">{errors[question.id]}</p>}
          </div>
        )

      case 'radio':
        return (
          <div key={question.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.helpText && (
              <p className="text-sm text-gray-500 mb-2">{question.helpText}</p>
            )}
            <div className="space-y-2">
              {question.options?.map(opt => (
                <div key={opt.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`${question.id}-${opt.value}`}
                    name={question.id}
                    value={opt.value}
                    checked={formData[question.id] === opt.value}
                    onChange={(e) => updateField(question.id, opt.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor={`${question.id}-${opt.value}`} className="ml-2 block text-sm text-gray-700">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
            {hasError && <p className="mt-1 text-sm text-red-600">{errors[question.id]}</p>}
          </div>
        )

      case 'checkbox':
        return (
          <div key={question.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.label}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.helpText && (
              <p className="text-sm text-gray-500 mb-2">{question.helpText}</p>
            )}
            <div className="space-y-2">
              {question.options?.map(opt => (
                <div key={opt.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${question.id}-${opt.value}`}
                    checked={(formData[question.id] || []).includes(opt.value)}
                    onChange={() => toggleCheckbox(question.id, opt.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`${question.id}-${opt.value}`} className="ml-2 block text-sm text-gray-700">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
            {hasError && <p className="mt-1 text-sm text-red-600">{errors[question.id]}</p>}
          </div>
        )

      default:
        return null
    }
  }

  if (!questions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">질문지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const currentStepData = questions.steps.find(s => s.step === currentStep)
  const totalSteps = questions.steps.length
  const isLastStep = currentStep === totalSteps

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ComplianceOS 시작하기</h1>
          <p className="mt-2 text-sm text-gray-600">
            귀사의 개인정보 보호법 준수를 위한 맞춤 설정을 진행합니다
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              단계 {currentStep} / {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}% 완료
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        {currentStepData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{currentStepData.description}</p>
            </div>

            <div className="space-y-6">
              {currentStepData.questions.map(question => renderQuestion(question))}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                이전
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      설정 중...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      설정 완료
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  다음
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
