import { useEffect, useState } from 'react'
import { getAzureInventory, getAzureActivity, type AzureInventory, type AzureActivity } from '../../services/api'
export default function AzureDiagnostics() {
  const [group, setGroup] = useState('')
  const [hours, setHours] = useState(24)
  const [version, setVersion] = useState(0)
  const [inventory, setInventory] = useState<AzureInventory | null>(null)
  const [activity, setActivity] = useState<AzureActivity | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 15_000)
    void Promise.allSettled([getAzureInventory(group, controller.signal), getAzureActivity(group, hours, controller.signal)]).then(results => {
      if (controller.signal.aborted) return
      const [resources, events] = results
      setInventory(resources.status === 'fulfilled' ? resources.value : null)
      setActivity(events.status === 'fulfilled' ? events.value : null)
      setError(results.flatMap(result => result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : 'Diagnostics unavailable'] : []).join(' · '))
      setLoading(false)
      window.clearTimeout(timer)
    })
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [group, hours, version])
  return <section className="azure-inventory phase2-workspace">
    <div className="azure-section-header"><div><span className="eyebrow">SCOPED DIAGNOSTICS</span><h2>Resource inventory and activity</h2></div></div>
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setGroup(String(data.get('group') || '')); setLoading(true); setVersion(value => value + 1) }}>
      <label>Resource group <input name="group" placeholder="Configured scope or subscription" maxLength={90} /></label>
      <label>Activity window <select value={hours} onChange={event => { setHours(Number(event.target.value)); setLoading(true) }}><option value={1}>1 hour</option><option value={24}>24 hours</option><option value={168}>7 days</option></select></label>
      <button type="submit">Refresh diagnostics</button>
    </form>
    {loading && <p role="status">Loading diagnostics…</p>}{error && <p role="alert">{error}</p>}
    {inventory && <><p>Checked {new Date(inventory.checkedAt).toLocaleString()} · {inventory.truncated ? 'Bounded sample, more resources may exist' : `${inventory.items.length} resources returned`}</p><div className="azure-inventory-list">{inventory.items.map(resource => <article className="azure-inventory-row" key={resource.id}><div><a href={resource.portalUrl} target="_blank" rel="noreferrer">{resource.name}</a><p>{resource.type} · {resource.location} · {resource.provisioningState || 'State not reported'}</p></div><button onClick={() => setSelected(resource.id)}>Inspect activity</button></article>)}</div>{inventory.items.length === 0 && <p>No resources returned for this scope.</p>}</>}
    <h3>Azure Activity Log {selected && <button onClick={() => setSelected('')}>Show all resources</button>}</h3>
    {activity && <><p>{new Date(activity.start).toLocaleString()} – {new Date(activity.end).toLocaleString()}{activity.truncated ? ' · Bounded first page' : ''}</p><div className="azure-inventory-list">{activity.items.filter(item => !selected || item.resourceId?.toLowerCase() === selected.toLowerCase()).map(item => <article className="azure-inventory-row" key={item.id}><div><strong>{item.operation} · {item.status}</strong><p>{new Date(item.timestamp).toLocaleString()} · {item.resourceId}</p><small>Correlation: {item.correlationId || 'Not reported'}</small></div></article>)}</div>{activity.items.filter(item => !selected || item.resourceId?.toLowerCase() === selected.toLowerCase()).length === 0 && <p>No activity returned for this resource and time window.</p>}</>}
    <p>Application Insights, metric queries and diagnostic log queries are not implemented. Inventory and Activity Log require Reader and Monitoring Reader permissions; no resources are provisioned.</p>
  </section>
}
