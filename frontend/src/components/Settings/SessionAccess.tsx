import { useEffect, useState } from 'react'
import { loginSession, restoreSession, logoutSession, type OperationSession } from '../../services/api'
export default function SessionAccess() {
 const [session, setSession] = useState<OperationSession | null>(null)
 const [token, setToken] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
 useEffect(() => { const expired = () => { setSession(null); setError('Session expired or authorization required. Sign in to reconnect.') }; window.addEventListener('ops-session-expired', expired); void restoreSession().then(setSession).catch(() => setSession(null)); return () => window.removeEventListener('ops-session-expired', expired) }, [])
 const connect = async () => { setBusy(true); try { setSession(await loginSession(token)); setToken(''); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed') } finally { setBusy(false) } }
 return <section className="phase2-workspace" style={{ padding: '16px 32px' }} aria-label="Operations session">
  {session ? <p>Signed in as {session.actor} · {session.role} <button onClick={async () => { try { await logoutSession(); setSession(null) } catch (e) { setError(String(e)) } }}>Sign out</button></p> : <form onSubmit={e => { e.preventDefault(); void connect() }}><label>Operations credential<input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} required /></label><button disabled={busy}>Sign in</button></form>}
  {error && <p role="alert">{error}</p>}
 </section>
}
