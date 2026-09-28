const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5050').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit, fallback = 'Request failed'): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.detail || data?.error || fallback)
  }

  return data as T
}

export type ApiHealth = {
  status: string
  service: string
  environment?: string
  timestamp?: string
}

export type CloudPlatformStatus = {
  timestamp: string
  runtime: { status: string; service: string }
  azure: {
    status: 'connected' | 'not_configured' | 'unavailable'
    resource_count: number
    resources_truncated: boolean
    resources: {
      name: string
      type: string
      location: string | null
      resource_group: string | null
      provisioning_state: string | null
    }[]
    detail?: string
  }
  foundry: {
    status: 'ready' | 'configuration_incomplete' | 'not_configured' | 'unavailable'
    authentication: 'authenticated' | 'unavailable' | 'not_checked'
    endpoint_host: string | null
    deployment: string | null
    inference?: 'not_tested'
  }
}

export async function getCloudPlatform(): Promise<CloudPlatformStatus> {
  return request<CloudPlatformStatus>('/api/platform', undefined, 'Failed to fetch cloud platform status')
}

export async function getApiHealth(): Promise<ApiHealth> {
  return request<ApiHealth>('/health', undefined, 'Backend health check failed')
}

export type EngineeringActionStatus =
  | 'Recommended'
  | 'In progress'
  | 'Awaiting verification'
  | 'Verified'

export type EngineeringAction = {
  id: string
  incidentId: string
  incidentTitle: string
  service: string
  severity: Incident['severity']
  title: string
  description: string
  recommendation: string
  source: string
  status: EngineeringActionStatus
  incidentStatus: Incident['status']
  updatedAt: string
}

export async function getActions(): Promise<EngineeringAction[]> {
  return request<EngineeringAction[]>('/api/actions', undefined, 'Failed to fetch engineering actions')
}

export async function updateActionStatus(
  id: string,
  status: EngineeringActionStatus,
): Promise<EngineeringAction> {
  return request<EngineeringAction>(`/api/actions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }, 'Failed to update engineering action')
}

export type InvestigationResponse = {
  success: boolean
  analysis: string
  investigation: string
  actions: string
  incidentId?: string
}

export async function analyseIncident(
  problem: string,
  severity: Incident['severity'] = 'Medium',
): Promise<InvestigationResponse> {
  return request<InvestigationResponse>('/api/analyse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problem,
      severity,
    }),
  }, 'Investigation request failed')
}

export type Incident = {
  _id: string
  title: string
  description: string
  service: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Investigating' | 'Open' | 'Awaiting review' | 'Resolved'
  analysis: string
  investigation: string
  actions: string
  actionStatus?: EngineeringActionStatus
  investigationError?: string
  rootCause: string
  createdAt: string
  updatedAt: string
}

export async function getIncidents(): Promise<Incident[]> {
  return request<Incident[]>('/api/incidents', undefined, 'Failed to fetch incidents')
}

export async function updateIncidentStatus(
  id: string,
  status: 'Open' | 'Resolved',
): Promise<Incident> {
  return request<Incident>(`/api/incidents/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }, 'Failed to update incident status')
}

export async function retryIncidentInvestigation(id: string): Promise<Incident> {
  return request<Incident>(`/api/incidents/${id}/retry`, {
    method: 'POST',
  }, 'Failed to retry investigation')
}

export async function getIncident(
  id: string,
): Promise<Incident> {
  return request<Incident>(`/api/incidents/${id}`, undefined, 'Failed to fetch incident')
}

export type RepositoryCommit = {
  sha: string
  message: string
  author: string | null
  date: string | null
  url: string | null
}

export type RepositoryData = {
  success: boolean
  repository: {
    name: string
    full_name: string
    default_branch: string
    private: boolean
    language: string | null
    updated_at: string | null
    html_url: string | null
  }
  branch: {
    name: string
    sha: string
  }
  branches: {
    name: string
    sha: string | null
    protected: boolean
  }[]
  recent_commits: RepositoryCommit[]
  latest_commit_changes: {
    sha: string
    files_changed: number
    additions: number
    deletions: number
    files: { path: string | null; status: string | null }[]
  } | null
}

export async function getRepository(): Promise<RepositoryData> {
  return request<RepositoryData>('/api/repository', undefined, 'Failed to fetch repository data')
}
