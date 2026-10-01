import { useState } from 'react'
import { reindexKnowledge, listKnowledge, ingestKnowledge, searchKnowledge, deleteKnowledge, type KnowledgeSource, type KnowledgeHit } from '../../services/api'
import '../Engineering/Engineering.css'
export default function Knowledge() {
  const [token, setToken] = useState('')
  const [sources, setSources] = useState<KnowledgeSource[] | null>(null)
  const [workspace, setWorkspace] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null)
  const [retrievalInfo, setRetrievalInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const load = async () => { const data = await listKnowledge(token); setSources(data.items); setWorkspace(data.workspace); setTruncated(data.hasNext) }
  const action = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); setError('') } catch (failure) { setError(failure instanceof Error ? failure.message : 'Knowledge request failed') } finally { setBusy(false) } }
  return <section className="engineering-page phase2-workspace">
    <div className="engineering-header"><div><span className="eyebrow">ENGINEERING KNOWLEDGE</span><h1>Sources and retrieval</h1><p>Index real text or Markdown runbooks and inspect cited passages. A configured local embedding model enables semantic retrieval over MongoDB vectors. Unavailable embeddings use explicitly labeled lexical fallback.</p></div></div>
    <form onSubmit={event => { event.preventDefault(); void action(load) }}><label>Operations token <input type="password" value={token} onChange={event => { setToken(event.target.value); setSources(null); setHits(null) }} autoComplete="off" /></label><button disabled={busy}>Load indexed sources</button></form>
    {error && <p role="alert">{error}</p>}
    <div className="engineering-grid"><section className="engineering-panel"><h2>Ingest document</h2><form onSubmit={event => { event.preventDefault(); void action(async () => { await ingestKnowledge(token, title, text, sourceUrl); await load(); setText('') }) }}><label>Title <input value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} /></label><label>Source URL (optional) <input type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label><label>Text or Markdown <textarea value={text} onChange={event => setText(event.target.value)} required maxLength={100000} rows={12} /></label><button disabled={busy}>Index source</button></form><p>Identical content is deduplicated within the configured workspace. Uploading edited content creates a new version; delete an obsolete source explicitly.</p></section>
      <section className="engineering-panel"><h2>Indexed sources {workspace && `· ${workspace}`}</h2>{sources === null ? <p>Connect to inspect indexed sources.</p> : sources.length === 0 ? <p>No indexed sources.</p> : <div className="engineering-context-list">{sources.map(source => <div key={source._id}><span>{source.title} · {source.embeddingStatus || source.method} · {source.embeddingModel || 'No embedding model'} · {new Date(source.indexedAt).toLocaleString()}</span><button disabled={busy} onClick={() => void action(async () => { await reindexKnowledge(source._id); await load() })}>Reindex source</button><button disabled={busy} onClick={() => void action(async () => { await deleteKnowledge(token, source._id); await load(); setHits(null) })}>Delete source</button></div>)}</div>}{truncated && <p>First 20 sources shown. Additional pages are available through the API.</p>}</section></div>
    <section className="engineering-panel"><h2>Search with provenance</h2><form onSubmit={event => { event.preventDefault(); void action(async () => { const result = await searchKnowledge(token, query); setHits(result.results); setRetrievalInfo(`${result.method}${result.fallbackReason ? ` · ${result.fallbackReason}` : ''}${result.truncated ? ' · Latest 100 documents only' : ''}`) }) }}><label>Query <input value={query} onChange={event => setQuery(event.target.value)} required maxLength={500} /></label><button disabled={busy}>Search</button></form><p role="status">{retrievalInfo}</p>{hits?.length === 0 && <p>No matching passages returned.</p>}{hits?.map(hit => <article key={`${hit.documentId}:${hit.ordinal}`}><h3>{hit.title} · {hit.section}</h3><p>Document {hit.documentId} · chunk {hit.ordinal} · indexed {new Date(hit.indexedAt).toLocaleString()} · {hit.method} score {hit.score.toFixed(2)}</p>{hit.sourceUrl && <a href={hit.sourceUrl} target="_blank" rel="noreferrer">Source</a>}<pre style={{ whiteSpace: 'pre-wrap' }}>{hit.text}</pre></article>)}</section>
  </section>
}
