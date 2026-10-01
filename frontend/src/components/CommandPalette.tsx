import { useEffect, useRef, useState } from 'react'
import { getIncidents, getRepository } from '../services/api'
const pages = ['overview', 'incidents', 'engineering', 'actions', 'repository', 'agents', 'azure-foundry', 'knowledge', 'settings']
type Command = { label: string; run: () => void }
export default function CommandPalette({ onNavigate, onIncident }: { onNavigate: (view: string) => void; onIncident: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [entities, setEntities] = useState<Command[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const close = () => { dialog.current?.close(); previousFocus.current?.focus() }
  const open = async () => {
    if (dialog.current?.open) return
    previousFocus.current = document.activeElement as HTMLElement
    setQuery(''); setIndex(0); setEntities([]); setError(''); setLoading(true)
    dialog.current?.showModal(); input.current?.focus()
    const results = await Promise.allSettled([getIncidents(), getRepository()])
    const commands: Command[] = []
    if (results[0].status === 'fulfilled') results[0].value.forEach(incident => commands.push({ label: `${incident.title} · ${incident.status} · ${incident._id}`, run: () => onIncident(incident._id) }))
    if (results[1].status === 'fulfilled') commands.push({ label: `Repository ${results[1].value.repository.full_name}`, run: () => onNavigate('repository') })
    setEntities(commands); setLoading(false)
    setError(results.some(result => result.status === 'rejected') ? 'Some search sources are unavailable. Page navigation remains available.' : '')
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); void open() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
  const commands = [...pages.map(view => ({ label: `Go to ${view.replace('-', ' / ')}`, run: () => onNavigate(view) })), ...entities].filter(command => command.label.toLowerCase().includes(query.toLowerCase()))
  const selected = Math.min(index, Math.max(0, commands.length - 1))
  return <><button className="command-trigger" onClick={() => void open()}>Search commands <kbd>⌘ / Ctrl K</kbd></button><dialog ref={dialog} className="command-palette" aria-label="Command palette" onCancel={() => previousFocus.current?.focus()} onKeyDown={event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setIndex((selected + (event.key === 'ArrowDown' ? 1 : -1) + commands.length) % Math.max(1, commands.length)) }
    if (event.key === 'Enter' && event.target === input.current && commands[selected]) { event.preventDefault(); close(); commands[selected].run() }
  }}><div><input ref={input} aria-label="Search commands" placeholder="Pages, incidents, repositories…" value={query} onChange={event => { setQuery(event.target.value); setIndex(0) }} /><button aria-label="Close command palette" onClick={close}>Close</button></div>{loading && <p role="status">Loading engineering entities…</p>}{error && <p role="status">{error}</p>}<ul>{commands.map((command, i) => <li key={command.label}><button className={i === selected ? 'selected' : ''} onClick={() => { close(); command.run() }}>{command.label}</button></li>)}</ul>{commands.length === 0 && <p>No matching commands.</p>}</dialog></>
}
