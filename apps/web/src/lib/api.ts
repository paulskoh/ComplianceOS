import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
}

export const obligations = {
  getAll: () => api.get('/obligations'),
  getOne: (id: string) => api.get(`/obligations/${id}`),
  create: (data: any) => api.post('/obligations', data),
  update: (id: string, data: any) => api.put(`/obligations/${id}`, data),
}

export const controls = {
  getAll: () => api.get('/controls'),
  getOne: (id: string) => api.get(`/controls/${id}`),
  create: (data: any) => api.post('/controls', data),
  update: (id: string, data: any) => api.put(`/controls/${id}`, data),
}

export const artifacts = {
  getAll: () => api.get('/artifacts'),
  getOne: (id: string) => api.get(`/artifacts/${id}`),
  upload: (file: File, data: any) => {
    const formData = new FormData()
    formData.append('file', file)
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })
    return api.post('/artifacts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  createUploadIntent: (data: {
    filename: string
    contentType: string
    sizeBytes: number
    evidenceRequirementId?: string
  }) => api.post('/artifacts/upload-intent', data),
  finalizeUpload: (artifactId: string, version: number, etag: string) =>
    api.post('/artifacts/finalize-upload', { artifactId, version, etag }),
  linkToEvidenceRequirement: (artifactId: string, evidenceRequirementId: string) =>
    api.post(`/artifacts/${artifactId}/link-evidence-requirement`, { evidenceRequirementId }),
  getAnalysis: (id: string) => api.get(`/artifacts/${id}/analysis`),
  approve: (id: string) => api.post(`/artifacts/${id}/approve`),
  retryAnalysis: (id: string) => api.post(`/artifacts/${id}/retry-analysis`),
  getAnalysisStatus: (id: string) => api.get(`/artifacts/${id}/analysis-status`),
}

export const evidenceRequirements = {
  getOverview: () => api.get('/evidence-requirements/overview'),
  getOne: (id: string) => api.get(`/evidence-requirements/${id}`),
  pollStatus: (id: string) => api.get(`/evidence-requirements/${id}/poll-status`),
}

export const risks = {
  getAll: () => api.get('/risks'),
  create: (data: any) => api.post('/risks', data),
  update: (id: string, data: any) => api.put(`/risks/${id}`, data),
}

export const readiness = {
  getScore: () => api.get('/readiness/score'),
  getScoreV2: () => api.get('/readiness/score-v2'),
  getGaps: () => api.get('/readiness/gaps'),
  getSimulationPresets: () => api.get('/readiness/simulate/presets'),
  simulate: (data: { preset: string; startDate: string; endDate: string }) =>
    api.post('/readiness/simulate', data),
  generateDraftPack: (data: any) => api.post('/readiness/simulate/draft-pack', data),
}

export const onboarding = {
  getQuestions: () => api.get('/onboarding/questions'),
  completeOnboarding: (data: any) => api.post('/onboarding/complete', data),
  applyPIPAContentPack: () => api.post('/onboarding/apply-pipa'),
  getProfile: () => api.get('/onboarding/profile'),
}

export const workflows = {
  getAll: () => api.get('/workflows'),
  start: (workflowId: string, context: any) => api.post(`/workflows/${workflowId}/start`, { context }),
  getExecutions: () => api.get('/workflows/executions'),
  processApproval: (executionId: string, data: any) => api.post(`/workflows/executions/${executionId}/approve`, data),
}

export const integrations = {
  getAll: () => api.get('/integrations'),
  connect: (data: any) => api.post('/integrations', data),
  sync: (id: string) => api.post(`/integrations/${id}/sync`),
  getSyncStatus: (id: string) => api.get(`/integrations/${id}/sync-status`),
}

export const inspectionPacks = {
  getAll: () => api.get('/inspection-packs'),
  getOne: (id: string) => api.get(`/inspection-packs/${id}`),
  create: (data: any) => api.post('/inspection-packs', data),
  getDownloadUrls: (id: string) => api.get(`/inspection-packs/${id}/download-urls`),
}

export const exceptions = {
  getAll: (status?: string) => api.get('/exceptions', { params: { status } }),
  getOne: (id: string) => api.get(`/exceptions/${id}`),
  create: (data: any) => api.post('/exceptions', data),
  approve: (id: string, comments?: string) => api.patch(`/exceptions/${id}/approve`, { comments }),
  reject: (id: string, reason: string) => api.patch(`/exceptions/${id}/reject`, { reason }),
  revoke: (id: string, reason: string) => api.patch(`/exceptions/${id}/revoke`, { reason }),
  getStats: () => api.get('/exceptions/stats'),
  getPending: () => api.get('/exceptions/pending'),
  getActive: () => api.get('/exceptions/active'),
}

export const plans = {
  getUsage: () => api.get('/plans/usage'),
}

// SOFT-LAUNCH: Framework transparency - users can view what they're evaluated against
export const frameworks = {
  getAll: () => api.get('/frameworks'),
  getOne: (code: string) => api.get(`/frameworks/${code}`),
  getDomain: (code: string, domain: string) => api.get(`/frameworks/${code}/domains/${domain}`),
  getControlsForObligation: (obligationCode: string) => api.get(`/frameworks/obligations/${obligationCode}/controls`),
  getEvidenceRequirements: (controlCode: string) => api.get(`/frameworks/controls/${controlCode}/evidence-requirements`),
  search: (query: string) => api.get('/frameworks/search', { params: { q: query } }),
}

export const inspection = {
  getPackByToken: (token: string) => api.get(`/inspection/pack/${token}`),
  createShareLink: (packId: string, expiresInDays: number) =>
    api.post(`/inspection/pack/${packId}/share-link`, { expiresInDays }),
}

// Document Generation API
export const documentGen = {
  getTemplates: () => api.get('/v2/documents/templates'),
  getTypes: () => api.get('/v2/documents/types'),
  generate: (templateType: string, customVariables?: Record<string, any>, evidenceRequirementId?: string) =>
    api.post('/v2/documents/generate', { templateType, customVariables, evidenceRequirementId }),
  getGenerated: (status?: string, limit?: number) =>
    api.get('/v2/documents/generated', { params: { status, limit } }),
  getGeneratedOne: (id: string) => api.get(`/v2/documents/generated/${id}`),
  approve: (id: string) => api.post(`/v2/documents/generated/${id}/approve`),
}

// System Health API (for demo mode status panel)
export const health = {
  getStatus: () => api.get('/health'),
  getAIHealth: () => api.get('/health/ai'),
  getAIMetrics: () => api.get('/health/ai/metrics'),
  getAIStats: () => api.get('/health/ai/stats'),
}

// Contradictions API (CEO Demo: Cross-document inconsistency detection)
export const contradictions = {
  getAll: () => api.get('/v2/contradictions'),
  detect: (artifactIds: string[]) => api.post('/v2/contradictions/detect', { artifactIds }),
  getForRequirement: (requirementId: string) => api.get(`/v2/contradictions/requirement/${requirementId}`),
  getTypes: () => api.get('/v2/contradictions/types'),
}
