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
}

export const risks = {
  getAll: () => api.get('/risks'),
  create: (data: any) => api.post('/risks', data),
  update: (id: string, data: any) => api.put(`/risks/${id}`, data),
}

export const readiness = {
  getScore: () => api.get('/readiness/score'),
  getGaps: () => api.get('/readiness/gaps'),
}

export const onboarding = {
  completeOnboarding: (data: any) => api.post('/onboarding/complete', data),
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
