import { useEffect, useState } from 'react'

import {
  getIncidents,
  updateIncidentStatus,
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

  const [updatingIncidentId, setUpdatingIncidentId] =
    useState<string | null>(null)

  const [statusError, setStatusError] = useState('')

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

  const handleStatusChange = async (
    incidentId: string,
    status: Incident['status'],
  ) => {
    setUpdatingIncidentId(incidentId)
    setStatusError('')

    try {
      const updatedIncident = await updateIncidentStatus(
        incidentId,
        status,
      )

      setIncidents((currentIncidents) =>
        currentIncidents.map((incident) =>
          incident._id === incidentId
            ? updatedIncident
            : incident,
        ),
      )
    } catch (error) {
      console.error(
        'Failed to update incident status:',
        error,
      )

      setStatusError(
        error instanceof Error
          ? error.message
          : 'Failed to update incident status',
      )
    } finally {
      setUpdatingIncidentId(null)
    }
  }

  const activeCount = incidents.filter(
    (incident) =>
      incident.status === 'Investigating' ||
      incident.status === 'Open',
  ).length

  const awaitingReviewCount = incidents.filter(
    (incident) => incident.status === 'Awaiting review',
  ).length

  const resolvedCount = incidents.filter(
    (incident) => incident.status === 'Resolved',
  ).length

  const getIncidentContext = (incident: Incident) => {
    if (incident.status === 'Investigating') {
      return 'Active investigation'
    }

    if (incident.status === 'Open') {
      return incident.rootCause !== 'Pending investigation'
        ? incident.rootCause
        : 'Investigation complete'
    }

    if (incident.status === 'Awaiting review') {
      return incident.rootCause !== 'Pending investigation'
        ? incident.rootCause
        : 'Awaiting engineering review'
    }

    if (incident.status === 'Resolved') {
      return incident.rootCause !== 'Pending investigation'
        ? incident.rootCause
        : 'Investigation resolved'
    }

    return incident.rootCause
  }

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

        {statusError && (
          <div className="incident-status-error">
            {statusError}
          </div>
        )}

        <div className="incident-table">

          <div className="incident-table-header">
            <span>INCIDENT</span>
            <span>SERVICE</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
            <span>DETECTED</span>
            <span>ACTION</span>
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
              <div
                key={incident._id}
                className="incident-row"
              >

                <button
                  type="button"
                  className="incident-title"
                  onClick={() => onSelectIncident(incident._id)}
                >
                  <span className="incident-id">
                    {incident._id}
                  </span>

                  <strong>
                    {incident.title}
                  </strong>

                  <small>
                    {getIncidentContext(incident)}
                  </small>
                </button>

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

                <div className="incident-action">
                  {updatingIncidentId === incident._id ? (
                    <span>Updating...</span>
                  ) : incident.status === 'Investigating' ||
                    incident.status === 'Open' ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          incident._id,
                          'Awaiting review',
                        )
                      }
                    >
                      Mark Awaiting Review
                    </button>
                  ) : incident.status === 'Awaiting review' ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(
                            incident._id,
                            'Resolved',
                          )
                        }
                      >
                        Mark Resolved
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(
                            incident._id,
                            'Investigating',
                          )
                        }
                      >
                        Re-investigate
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          incident._id,
                          'Investigating',
                        )
                      }
                    >
                      Re-open Investigation
                    </button>
                  )}
                </div>

              </div>
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