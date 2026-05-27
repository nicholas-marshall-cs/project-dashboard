export const MILESTONES = [
  { key: 'demo',          label: 'Demonstration performed',            types: ['poc','termed'] },
  { key: 'agreement',     label: 'Agreement signed',                   types: ['termed'] },
  { key: 'handover',      label: 'Handover — sales to implementation', types: ['poc','termed'] },
  { key: 'roadmap_disc',  label: 'Model office / roadmap discussion',  types: ['poc','termed'] },
  { key: 'roadmap_doc',   label: 'Roadmap document completed & sent',  types: ['poc','termed'] },
  { key: 'go_live',       label: 'Expected go live',                   types: ['poc','termed'] },
  { key: 'api_workshop',  label: 'API workshop',                       types: ['poc','termed'] },
  { key: 'training',      label: 'Training',                           types: ['poc','termed'] },
  { key: 'mo_conclusion', label: 'Model office conclusion',            types: ['poc'] },
]

export const TASK_STATUSES = ['To Do', 'In Progress', 'Done']
export const BLOCKER_TYPES = ['Internal', 'Waiting on Customer']
export const AVATAR_COLORS = ['#4f8ef7','#3ecf8e','#f5a623','#f25f5c','#a78bfa','#38bdf8','#fb923c','#34d399']

export function avatarColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTs(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(ts) {
  if (!ts) return 'Never'
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)   return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatTs(ts)
}

export function milestoneStatus(dateStr, completed) {
  if (completed) return 'done'
  if (!dateStr) return null
  const diff = (new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000
  if (diff < 0) return 'overdue'
  if (diff <= 14) return 'soon'
  return 'ok'
}

export function statusMeta(dateStr, completed) {
  const s = milestoneStatus(dateStr, completed)
  if (!s)              return { label: 'Not set',  color: 'var(--text-3)',  bg: 'transparent',      border: 'var(--border)' }
  if (s === 'done')    return { label: 'Complete', color: 'var(--green)',   bg: 'var(--green-bg)',   border: 'var(--green)' }
  if (s === 'overdue') return { label: 'Overdue',  color: 'var(--red)',     bg: 'var(--red-bg)',     border: 'var(--red)' }
  if (s === 'soon') {
    const diff = Math.round((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
    return { label: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff}d`, color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber)' }
  }
  return { label: 'On track', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green)' }
}

// ── Sheet column layouts ─────────────────────────────────────────────────────
export const MS_DATE_KEYS     = MILESTONES.map(m => m.key)
export const MS_COMPLETE_KEYS = MILESTONES.map(m => `${m.key}_done`)
export const CUST_COLS        = [
  'id','name','owner','type','notes',
  ...MS_DATE_KEYS, ...MS_COMPLETE_KEYS,
  'customMilestones',
  'archived',       // 'true' | ''
  'lastUpdated',    // ISO timestamp — set on any meaningful change
]
export const TASK_COLS    = ['id','customerId','title','owner','status','createdAt']
export const UPDATE_COLS  = ['id','customerId','text','author','createdAt','isSystem']
export const BLOCKER_COLS = ['id','customerId','title','type','detail','raisedAt','resolvedAt']

export function rowToObj(cols, row) {
  const obj = {}; cols.forEach((c, i) => { obj[c] = row[i] || '' }); return obj
}
export function objToRow(cols, obj) {
  return cols.map(c => obj[c] || '')
}

export function rowToCustomer(row) {
  const obj = rowToObj(CUST_COLS, row)
  const { id, name, owner, type, notes, customMilestones: cmRaw, archived, lastUpdated, ...rest } = obj
  const dates = {};       MS_DATE_KEYS.forEach(k     => { dates[k]       = rest[k] || '' })
  const completions = {}; MS_COMPLETE_KEYS.forEach(k => { completions[k] = rest[k] === 'true' })
  let customMilestones = []
  try { if (cmRaw) customMilestones = JSON.parse(cmRaw) } catch {}
  return { id, name, owner, type, notes, dates, completions, customMilestones, archived: archived === 'true', lastUpdated }
}

export function customerToRow(c) {
  return CUST_COLS.map(col => {
    if (['id','name','owner','type','notes'].includes(col)) return c[col] || ''
    if (col === 'customMilestones') return c.customMilestones?.length ? JSON.stringify(c.customMilestones) : ''
    if (col === 'archived')         return c.archived ? 'true' : ''
    if (col === 'lastUpdated')      return c.lastUpdated || ''
    if (col.endsWith('_done'))      return c.completions?.[col] ? 'true' : ''
    return c.dates?.[col] || ''
  })
}
