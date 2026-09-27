import { useEffect, useState } from 'react'

import {
  getIncidents,
  type Incident,
} from '../../services/api'

import './Incidents.css'

type IncidentsProps = {
  onNewInvestigation: () => void
  onSelectIncident: (incidentId: string) => void
}

function Incidents({
  onNewInvestigation,
  onSelectIncident,
}: IncidentsProps) {

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadIncidents() {
      try {
        const data = await getIncidents()
        setIncidents(data)
      } catch (error) {
        console.error('Failed to load incidents:', error)

        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load incidents',
        )
      } finally {
        setLoading(false)
      }
    }

    loadIncidents()
  }, [])

  const activeCount = incidents.filter(
    (incident) => incident.status === 'Investigating',
  ).length

  const awaitingReviewCount = incidents.filter(
    (incident) => incident.status === 'Awaiting review',
  ).length

  const resolvedCount = incidents.filter(
    (incident) => incident.status === 'Resolved',
  ).length

  return (
    <main className="incidents-page">

      <section className="incidents-header">

        <div>
          <span className="eyebrow">
            INCIDENT MANAGEMENT
          </span>

          <h1>Incidents</h1>

          <p>
            Investigate engineering incidents using repository,
            infrastructure, and AI agent evidence.
          </p>
        </div>

        <button
          type="button"
          className="new-investigation-button"
          onClick={onNewInvestigation}
        >
          New Investigation
        </button>

      </section>

      <section className="incident-summary">

        <article className="incident-summary-card">
          <span>ACTIVE</span>
          <strong>{activeCount}</strong>
          <small>
            Incident currently being investigated
          </small>
        </article>

        <article className="incident-summary-card">
          <span>AWAITING REVIEW</span>
          <strong>{awaitingReviewCount}</strong>
          <small>
            Investigations requiring engineering review
          </small>
        </article>

        <article className="incident-summary-card">
          <span>RESOLVED</span>
          <strong>{resolvedCount}</strong>
          <small>
            Incidents resolved
          </small>
        </article>

        <article className="incident-summary-card">
          <span>TOTAL</span>
          <strong>{incidents.length}</strong>
          <small>
            Recorded engineering incidents
          </small>
        </article>

      </section>

      <section className="incidents-panel">

        <div className="incidents-panel-header">

          <div>
            <span className="eyebrow">
              INCIDENT HISTORY
            </span>

            <h2>
              Recent incidents
            </h2>
          </div>

          <span className="incident-count">
            {incidents.length} incidents
          </span>

        </div>

        <div className="incident-table">

          <div className="incident-table-header">
            <span>INCIDENT</span>
            <span>SERVICE</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
            <span>DETECTED</span>
          </div>

          {loading && (
            <div className="incident-row">
              Loading incidents...
            </div>
          )}

          {error && (
            <div className="incident-row">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            incidents.map((incident) => (
              <button
                key={incident._id}
                type="button"
                className="incident-row"
                onClick={() => onSelectIncident(incident._id)}
              >

                <div className="incident-title">

                  <span className="incident-id">
                    {incident._id}
                  </span>

                  <strong>
                    {incident.title}
                  </strong>

                  <small>
                    {incident.rootCause}
                  </small>

                </div>

                <div className="incident-service">
                  {incident.service}
                </div>

                <div>

                  <span
                    className={`severity severity-${incident.severity
                      .toLowerCase()
                      .replace(' ', '-')}`}
                  >
                    {incident.severity}
                  </span>

                </div>

                <div>

                  <span
                    className={`incident-status status-${incident.status
                      .toLowerCase()
                      .replace(' ', '-')}`}
                  >
                    <span className="status-indicator" />

                    {incident.status}
                  </span>

                </div>

                <div className="incident-detected">
                  {new Date(incident.createdAt).toLocaleString()}
                </div>

              </button>
            ))}

        </div>

      </section>

      <section className="incident-evidence">

        <div>
          <span className="eyebrow">
            INVESTIGATION MODEL
          </span>

          <h2>
            Evidence before conclusions.
          </h2>
        </div>

        <p>
          Each investigation evaluates available application,
          repository, infrastructure, and engineering context
          before producing a conclusion or recommended action.
        </p>

      </section>

    </main>
  )
}

export default Incidents