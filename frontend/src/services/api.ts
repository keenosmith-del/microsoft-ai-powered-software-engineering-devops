const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

let operationsToken = ''
let csrfToken = ''
export function setOperationsToken(token: string) { operationsToken = token }

async function request<T>(path: string, init?: RequestInit, fallback = 'Request failed'): Promise<T> {
  const timeout = AbortSignal.timeout(path === '/api/analyse' || path.endsWith('/retry') ? 310_000 : 30_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  const sentCsrf = csrfToken
  const headers = new Headers(init?.headers)
  if (/^Bearer\s*$/.test(headers.get('Authorization') || '')) headers.delete('Authorization')
  if (operationsToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${operationsToken}`)
  if (csrfToken && !['GET', 'HEAD'].includes(init?.method || 'GET')) headers.set('X-CSRF-Token', csrfToken)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal, credentials: 'include' })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && csrfToken === sentCsrf) { csrfToken = ''; operationsToken = ''; window.dispatchEvent(new Event('ops-session-expired')) }
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
  status: 'Investigating' | 'Open' | 'Awaiting review' | 'Remediation planned' | 'In remediation' | 'Verifying' | 'Resolved'
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
  page?: number
  hasNext?: boolean
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

export async function getRepository(branch = '', page = 1, signal?: AbortSignal): Promise<RepositoryData> {
  return request<RepositoryData>(`/api/repository?${new URLSearchParams({ ...(branch ? { branch } : {}), page: String(page) })}`, { signal }, 'Failed to fetch repository data')
}

export type ServiceHealth = {
  id: string
  status: 'operational' | 'degraded' | 'unavailable' | 'unknown' | 'not_configured'
  checkedAt: string
  responseTimeMs?: number
  detail?: string
}
export type EngineeringOverview = {
  checkedAt: string
  cached: boolean
  cacheTtlMs: number
  services: ServiceHealth[]
  metrics: { activeIncidents: number | null; totalIncidents: number | null; highPrioritySignals: number | null; completedInvestigations: number | null; failedInvestigations: number | null }
  activity: Pick<Incident, '_id' | 'title' | 'status' | 'severity' | 'updatedAt'>[]
  signals: Pick<Incident, '_id' | 'title' | 'status' | 'severity' | 'updatedAt'>[]
  dataError: string | null
}
export async function getEngineeringOverview(signal?: AbortSignal): Promise<EngineeringOverview> {
  return request<EngineeringOverview>('/api/engineering/overview', { signal }, 'Engineering overview unavailable')
}

export type RepositoryRun = { id: number; name: string; head_branch: string; head_sha: string; status: string; conclusion: string | null; html_url: string; created_at: string; run_attempt: number }
export type RepositoryActivity = {
  checkedAt: string
  page: number
  runs: { status: string; error?: string; hasNext?: boolean; items: RepositoryRun[] | null }
  workflows: { status: string; error?: string; items: { id: number; name: string; state: string; html_url: string }[] | null }
  pulls: { status: string; error?: string; items: { number: number; title: string; state: string; html_url: string; updated_at: string }[] | null }
  deployments: { status: string; error?: string; items: { id: number; sha: string; ref: string; environment: string; created_at: string }[] | null }
}
export type RepositoryJobs = { items: { id: number; name: string; status: string; conclusion: string | null; html_url: string; steps: { number: number; name: string; conclusion: string | null; status: string }[] }[]; page: number; hasNext: boolean }
export function getRepositoryActivity(branch: string, page: number, signal?: AbortSignal) {
  return request<RepositoryActivity>(`/api/repository/activity?${new URLSearchParams({ ...(branch ? { branch } : {}), page: String(page) })}`, { signal })
}
export function getRepositoryJobs(id: number, signal?: AbortSignal) {
  return request<RepositoryJobs>(`/api/repository/runs/${id}/jobs`, { signal })
}
export type AzureInventory = { checkedAt: string; truncated: boolean; items: { id: string; name: string; type: string; location: string; provisioningState: string | null; portalUrl: string }[] }
export type AzureActivity = { checkedAt: string; truncated: boolean; start: string; end: string; items: { id: string; timestamp: string; operation: string; status: string; resourceId: string; correlationId: string; level: string }[] }
export function getAzureInventory(group: string, signal?: AbortSignal) {
  return request<AzureInventory>(`/api/azure/inventory?${new URLSearchParams({ group })}`, { signal })
}
export function getAzureActivity(group: string, hours: number, signal?: AbortSignal) {
  return request<AzureActivity>(`/api/azure/activity?${new URLSearchParams({ group, hours: String(hours) })}`, { signal })
}
export type InvestigationRun = {
  runId: string; incidentId: string; status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentStage: string; attempts: number; deployment?: string; correlationId: string
  createdAt: string; startedAt?: string; completedAt?: string; elapsedMs?: number; error?: string
  result?: { analysis: string; investigation: string; actions: string }
  events: { id: number; status: string; stage: string; at: string; detail: string; elapsedMs?: number }[]
}
export function getInvestigationRuns(token: string, page: number, signal?: AbortSignal, incidentId?: string) {
  return request<{ items: InvestigationRun[]; page: number; hasNext: boolean }>(`/api/investigations?page=${page}${incidentId ? `&incidentId=${encodeURIComponent(incidentId)}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, signal })
}
export function submitInvestigation(token: string, incidentId: string, key: string) {
  return request<InvestigationRun>(`/api/incidents/${incidentId}/investigations`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ triggerSource: 'manual' }) })
}
export function cancelInvestigation(token: string, runId: string) {
  return request<InvestigationRun>(`/api/investigations/${runId}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
}
export type KnowledgeSource = { _id: string; title: string; sourceUrl?: string; indexedAt: string; method: string }
export type KnowledgeHit = { documentId: string; title: string; sourceUrl: string | null; indexedAt: string; section: string; ordinal: number; text: string; score: number; method: string }
export function listKnowledge(token: string) {
  return request<{ workspace: string; method: string; items: KnowledgeSource[]; hasNext: boolean }>('/api/knowledge', { headers: { Authorization: `Bearer ${token}` } })
}
export function ingestKnowledge(token: string, title: string, text: string, sourceUrl: string) {
  return request('/api/knowledge', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title, text, ...(sourceUrl ? { sourceUrl } : {}) }) })
}
export function searchKnowledge(token: string, query: string) {
  return request<{ method: string; truncated: boolean; results: KnowledgeHit[] }>(`/api/knowledge/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } })
}
export function deleteKnowledge(token: string, id: string) {
  return request(`/api/knowledge/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
}
export type RemediationProposal = {
  _id: string; incidentId: string; runId: string; title: string; action: string; rationale: string; validationPlan: string; target: string; risk: string; owner?: string; reviewId?: string; approvalStatus: 'pending' | 'approved' | 'rejected'; executionStatus: 'disabled'; version: number
  audit: { actor: string; at: string; action: string; version: number }[]
}
export function listProposals(token: string, page = 1, incidentId?: string) {
  return request<{ items: RemediationProposal[]; hasNext: boolean }>(`/api/remediation?page=${page}${incidentId ? `&incidentId=${incidentId}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
}
export function createProposal(token: string, body: { incidentId: string; runId: string; title: string; action: string; rationale: string; validationPlan: string; target: string; risk: string; owner?: string }, key = crypto.randomUUID()) {
  return request<RemediationProposal>('/api/remediation', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) })
}
export function reviewProposal(token: string, proposal: RemediationProposal, decision: 'approved' | 'rejected', comment: string) {
  return request<RemediationProposal>(`/api/remediation/${proposal._id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, version: proposal.version, comment }) })
}

export type IncidentWorkflow = {
 stage: string; version: number; currentReviewId?: string; lastRunId?: string
 reviews: { id: string; runId: string; decision: string; evidence?: { source: string; reference: string; observation: string }[] }[]
 changes: { id: string; proposalId: string; notes?: string; performedBy?: string; performedAt?: string; reference?: string }[]
 verifications: { id: string; result: string; criteria: string; evidence?: { source: string; reference: string; observation: string }[] }[]
 resolutions: { id: string; notes: string }[]
 reports?: { id: string; content: string; status: string }[]
 audit: { id: string; actor: string; at: string; action: string; notes: string }[]
}
export function getIncidentWorkflow(token: string, incidentId: string) {
 return request<IncidentWorkflow>(`/api/incidents/${incidentId}/workflow`, { headers: { Authorization: `Bearer ${token}` } })
}
export function updateIncidentWorkflow(token: string, incidentId: string, body: Record<string, unknown>) {
 return request<IncidentWorkflow>(`/api/incidents/${incidentId}/workflow`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

export function createManualIncident(description: string, severity: Incident['severity'], key: string) {
 return request<Incident>('/api/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ title: description.slice(0, 80), description, severity, investigate: true }) })
}
export function startDurableInvestigation(incidentId: string, key: string) {
 return request<InvestigationRun>(`/api/incidents/${incidentId}/investigations`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ triggerSource: 'manual' }) })
}

export function indexIncidentReport(token: string, incidentId: string) {
 return request<{ documentId: string; reportId: string; method: string }>(`/api/incidents/${incidentId}/workflow/report/index`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
}

export type OperationSession = { actor: string; role: string; csrf: string; expiresAt: string }
export async function restoreSession() {
 const value = await request<OperationSession>('/api/session'); csrfToken = value.csrf; return value
}
export async function loginSession(token: string) {
 operationsToken = ''
 const value = await request<OperationSession>('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
 csrfToken = value.csrf; window.dispatchEvent(new Event('ops-auth-changed')); return value
}
export async function logoutSession() { await request('/api/session', { method: 'DELETE' }); csrfToken = ''; operationsToken = ''; window.dispatchEvent(new Event('ops-auth-changed')) }
export function editProposal(proposal: RemediationProposal, fields: Record<string, string>) {
 return request<RemediationProposal>(`/api/remediation/${proposal._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: proposal.version, ...fields }) })
}
export async function watchRun(runId: string, signal: AbortSignal, onEvent: () => void) {
 let cursor = 0
 while (!signal.aborted) {
  try {
   const response = await fetch(`${API_BASE_URL}/api/investigations/${runId}/events?after=${cursor}`, { credentials: 'include', signal })
   if (!response.ok || !response.body) throw new Error('Live events unavailable; polling continues')
   const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
   try {
    while (!signal.aborted) {
     const { done, value } = await reader.read(); if (done) break
     buffer += decoder.decode(value, { stream: true }); let end
     while ((end = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2)
      const id = frame.match(/^id: (\d+)/m); const data = frame.match(/^data: (.+)$/m)
      if (id && data && Number(id[1]) > cursor) { cursor = Number(id[1]); onEvent(); const event = JSON.parse(data[1]); if (['completed', 'failed', 'cancelled'].includes(event.status) && ['completed', 'failed', 'cancelled'].includes(event.stage)) return }
     }
    }
   } finally { await reader.cancel().catch(() => {}) }
  } catch { if (signal.aborted) return }
  await new Promise<void>(resolve => { const timer = window.setTimeout(resolve, 1500); signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true }) })
 }
}
