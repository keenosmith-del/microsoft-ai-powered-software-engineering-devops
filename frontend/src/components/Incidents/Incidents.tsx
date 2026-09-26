import './Incidents.css'

type IncidentStatus =
  | 'Investigating'
  | 'Resolved'
  | 'Awaiting review'

type IncidentSeverity =
  | 'Critical'
  | 'High'
  | 'Medium'

type Incident = {
  id: string
  title: string
  service: string
  severity: IncidentSeverity
  status: IncidentStatus
  detected: string
  rootCause: string
}

type IncidentsProps = {
  onNewInvestigation: () => void
  onSelectIncident: (incidentDescription: string) => void
}

const incidents: Incident[] = [
  {
    id: 'INC-0042',
    title: 'API request failures after deployment',
    service: 'Engineering Operations API',
    severity: 'High',
    status: 'Investigating',
    detected: '12 min ago',
    rootCause: 'Pending investigation',
  },
  {
    id: 'INC-0041',
    title: 'Elevated response latency',
    service: 'Application Gateway',
    severity: 'Medium',
    status: 'Awaiting review',
    detected: '2 hours ago',
    rootCause: 'Configuration change',
  },
  {
    id: 'INC-0040',
    title: 'Agent runtime unavailable',
    service: 'AI Agent Runtime',
    severity: 'Critical',
    status: 'Resolved',
    detected: 'Yesterday',
    rootCause: 'Runtime process failure',
  },
  {
    id: 'INC-0039',
    title: 'Repository analysis timeout',
    service: 'Software Engineering Agent',
    severity: 'Medium',
    status: 'Resolved',
    detected: 'Yesterday',
    rootCause: 'Repository request timeout',
  },
]

function Incidents({
  onNewInvestigation,
  onSelectIncident,
}: IncidentsProps) {
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
          <strong>1</strong>
          <small>
            Incident currently being investigated
          </small>
        </article>

        <article className="incident-summary-card">
          <span>AWAITING REVIEW</span>
          <strong>1</strong>
          <small>
            Investigations requiring engineering review
          </small>
        </article>

        <article className="incident-summary-card">
          <span>RESOLVED</span>
          <strong>2</strong>
          <small>
            Incidents resolved
          </small>
        </article>

        <article className="incident-summary-card">
          <span>TOTAL</span>
          <strong>4</strong>
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

          {incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              className="incident-row"
              onClick={() =>
                onSelectIncident(
                  `${incident.title}. Service: ${incident.service}. Severity: ${incident.severity}. Status: ${incident.status}. Root cause: ${incident.rootCause}.`,
                )
              }
            >

              <div className="incident-title">

                <span className="incident-id">
                  {incident.id}
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
                {incident.detected}
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