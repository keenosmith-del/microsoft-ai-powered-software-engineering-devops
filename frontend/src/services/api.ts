const API_BASE_URL = 'http://127.0.0.1:5050'

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
  const response = await fetch(`${API_BASE_URL}/api/analyse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problem,
      severity,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      'Investigation request failed',
    )
  }

  return data as InvestigationResponse
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
  rootCause: string
  createdAt: string
  updatedAt: string
}

export async function getIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/api/incidents`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      'Failed to fetch incidents',
    )
  }

  return data as Incident[]
}

export async function updateIncidentStatus(
  id: string,
  status: Incident['status'],
): Promise<Incident> {
  const response = await fetch(
    `${API_BASE_URL}/api/incidents/${id}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      'Failed to update incident status',
    )
  }

  return data as Incident
}

export async function getIncident(
  id: string,
): Promise<Incident> {
  const response = await fetch(
    `${API_BASE_URL}/api/incidents/${id}`,
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      'Failed to fetch incident',
    )
  }

  return data as Incident
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
  recent_commits: RepositoryCommit[]
}

export async function getRepository(): Promise<RepositoryData> {
  const response = await fetch(
    `${API_BASE_URL}/api/repository`,
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      'Failed to fetch repository data',
    )
  }

  return data as RepositoryData
}