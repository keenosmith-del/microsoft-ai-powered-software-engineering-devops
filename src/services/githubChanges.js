const { createHash } = require('node:crypto');
const { boundedText } = require('./boundedText');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function policy(body, env = process.env) {
 if (env.GITHUB_WRITE_ENABLED !== 'true' || !env.GITHUB_WRITE_TOKEN) fail('GitHub writes disabled', 403);
 const repository = `${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}`;
 if (!(env.GITHUB_WRITE_REPOSITORIES || '').split(',').includes(repository)) fail('Repository not permitted for writes', 403);
 if (body.baseBranch !== env.GITHUB_WRITE_BASE_BRANCH || !/^[\w./-]{1,100}$/.test(body.baseBranch || '') || body.baseBranch.includes('..')) fail('Base branch not permitted', 403);
 const prefixes = (env.GITHUB_WRITE_PATH_PREFIXES || '').split(',').filter(v => v && !v.startsWith('/') && !v.includes('..') && v.endsWith('/'));
 if (!Array.isArray(body.changes) || !body.changes.length || body.changes.length > 5) fail('Supply 1–5 explicitly reviewed file changes');
 let bytes = 0;
 for (const change of body.changes) {
  if (Object.keys(change).some(k => !['path', 'content'].includes(k)) || typeof change.path !== 'string' || !/^[\w./-]{1,200}$/.test(change.path) || change.path.split('/').some(p => !p || p === '.' || p === '..') || !prefixes.some(p => change.path.startsWith(p))) fail('File path outside policy', 403);
  if (/(authorization|authentication|security[-_.]?policy)/i.test(change.path)) fail('Security policy changes excluded', 403);
  if (/(^|\/)(\.env[^/]*|\.github|\.aws|\.azure|security[^/]*|credentials?[^/]*|secrets?[^/]*|[^/]+\.(pem|key|pfx|tf|bicep))($|\/)/i.test(change.path) || /(deploy|infrastructure|terraform)/i.test(change.path)) fail('Sensitive file changes excluded', 403);
  if (typeof change.content !== 'string' || change.content.includes('\0')) fail('Only explicit UTF-8 text changes are permitted');
  if (require('./redaction').redact(change.content, env) !== change.content) fail('Change contains potential credentials', 403);
  bytes += Buffer.byteLength(change.content);
 }
 if (new Set(body.changes.map(c => c.path)).size !== body.changes.length || bytes > 32768) fail('Duplicate paths or change payload too large');
 return repository;
}
function createGitHubChanges({ env = process.env, fetcher = fetch } = {}) {
 async function request(path, body) {
  const r = await fetcher(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPOSITORY)}${path}`, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${env.GITHUB_WRITE_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) fail('GitHub change request failed; inspect intent and retry safely', 502);
  const text = await boundedText(r, { bytes: 262144, env: {} }); if (text.truncated) fail('GitHub response exceeded bound', 502); return JSON.parse(text.content);
 }
 async function preview(body) {
  const repository = policy(body, env);
  const ref = await request(`/git/ref/heads/${encodeURIComponent(body.baseBranch)}`);
  const baseSha = ref.object.sha; const changes = []; let diff = '';
  for (const c of body.changes) {
   const file = await request(`/contents/${c.path.split('/').map(encodeURIComponent).join('/')}?ref=${baseSha}`);
   if (file.type !== 'file' || file.encoding !== 'base64' || file.size > 32768 || !file.content) fail('Only existing bounded text files can be changed', 422);
   const original = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
   if (original.includes('\0') || require('./redaction').redact(original, env) !== original) fail('Sensitive/binary source cannot be previewed', 403);
   // Exact full-file removal/addition diff; deliberately avoids claiming minimal AI patching.
   diff += `--- a/${c.path}\n+++ b/${c.path}\n@@ -1,${original.split('\n').length} +1,${c.content.split('\n').length} @@\n${original.split('\n').map(l => '-' + l).join('\n')}\n${c.content.split('\n').map(l => '+' + l).join('\n')}\n`;
   changes.push({ path: c.path, content: c.content, originalSha: file.sha });
  }
  return { repository, baseSha, changes, diff, hash: createHash('sha256').update(JSON.stringify({ repository, baseSha, changes })).digest('hex') };
 }
 return { request, preview };
}
module.exports = { policy, createGitHubChanges };
