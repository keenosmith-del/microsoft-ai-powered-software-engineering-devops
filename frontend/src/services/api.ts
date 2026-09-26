const API_BASE_URL = 'http://127.0.0.1:5050'

export type InvestigationResponse = {
  success: boolean
  analysis: string
  investigation: string
  actions: string
}

export async function analyseIncident(
  problem: string,
): Promise<InvestigationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problem,
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