export const MILESTONES = [
  { key: 'demo',         label: 'Demonstration performed',              types: ['poc', 'termed'] },
  { key: 'agreement',    label: 'Agreement signed',                     types: ['termed'] },
  { key: 'handover',     label: 'Handover — sales to implementation',   types: ['poc', 'termed'] },
  { key: 'roadmap_disc', label: 'Model office / roadmap discussion',    types: ['poc', 'termed'] },
  { key: 'roadmap_doc',  label: 'Roadmap document completed & sent',    types: ['poc', 'termed'] },
  { key: 'go_live',      label: 'Expected go live',                     types: ['poc', 'termed'] },
  { key: 'api_workshop', label: 'API workshop',                         types: ['poc', 'termed'] },
  { key: 'training',     label: 'Training',                             types: ['poc', 'termed'] },
  { key: 'mo_conclusion',label: 'Model office conclusion',              types: ['poc'] },
]

export const AVATAR_COLORS = [
  '#1D9E75', '#378ADD', '#D85A30', '#D4537E',
  '#BA7517', '#534AB7', '#639922', '#888780',
]

export function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function milestoneStatus(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = (d - now) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff <= 14) return 'soon'
  return 'ok'
}

export function statusMeta(dateStr) {
  const s = milestoneStatus(dateStr)
  if (!s) return { label: 'Not set', color: 'var(--text-3)', bg: 'transparent' }
  if (s === 'overdue') return { label: 'Overdue', color: 'var(--red-tx)', bg: 'var(--red-bg)' }
  if (s === 'soon') {
    const diff = Math.round((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`
    return { label, color: 'var(--amber-tx)', bg: 'var(--amber-bg)' }
  }
  return { label: 'On track', color: 'var(--green-tx)', bg: 'var(--green-bg)' }
}

// Row layout in Google Sheets:
// Col A: id | B: name | C: owner | D: type | E: notes | F onwards: milestone keys in order
export const SHEET_COLUMNS = ['id', 'name', 'owner', 'type', 'notes', ...MILESTONES.map(m => m.key)]

export function rowToCustomer(row) {
  const obj = {}
  SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || '' })
  const { id, name, owner, type, notes, ...rest } = obj
  return { id, name, owner, type, notes, dates: rest }
}

export function customerToRow(c) {
  return SHEET_COLUMNS.map(col => {
    if (['id','name','owner','type','notes'].includes(col)) return c[col] || ''
    return c.dates?.[col] || ''
  })
}
