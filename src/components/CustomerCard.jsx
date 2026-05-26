import { useState } from 'react'
import { MILESTONES, avatarColor, initials, formatDate, statusMeta, milestoneStatus } from '../lib/constants.js'

export default function CustomerCard({ customer, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const color = avatarColor(customer.name)
  const ms = MILESTONES.filter(m => m.types.includes(customer.type))

  const dots = ms.map(m => {
    const s = milestoneStatus(customer.dates[m.key])
    if (!s)            return 'empty'
    if (s === 'overdue') return 'red'
    if (s === 'soon')    return 'amber'
    return 'green'
  })

  const redCount   = dots.filter(d => d === 'red').length
  const amberCount = dots.filter(d => d === 'amber').length

  const typeLabel = customer.type === 'poc' ? 'Model office / POC' : 'Termed agreement'
  const typeBg    = customer.type === 'poc' ? 'var(--teal-bg)'  : 'var(--blue-bg)'
  const typeTx    = customer.type === 'poc' ? 'var(--teal-tx)'  : 'var(--blue-tx)'

  return (
    <div style={styles.card}>
      {/* Header row */}
      <div
        style={styles.header}
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
      >
        <div style={styles.headerLeft}>
          <div style={{ ...styles.avatar, background: color + '22', color }}>
            {initials(customer.name)}
          </div>
          <div>
            <div style={styles.name}>{customer.name}</div>
            <div style={styles.sub}>{customer.owner || 'No owner assigned'}</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <DotRow dots={dots} />
          {(redCount > 0 || amberCount > 0) && (
            <span style={styles.attentionBadge}>
              {redCount > 0 ? `${redCount} overdue` : `${amberCount} due soon`}
            </span>
          )}
          <span style={{ ...styles.typePill, background: typeBg, color: typeTx }}>
            {typeLabel}
          </span>
          <span style={{ ...styles.chevron, transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div>
          {customer.notes && (
            <div style={styles.notes}>{customer.notes}</div>
          )}
          <div style={styles.msGrid}>
            {ms.map(m => {
              const meta = statusMeta(customer.dates[m.key])
              return (
                <div key={m.key} style={styles.msCard}>
                  <div style={styles.msLabel}>{m.label}</div>
                  <div style={styles.msDate}>{formatDate(customer.dates[m.key])}</div>
                  <span style={{ ...styles.msBadge, background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={styles.actions}>
            <button onClick={() => onEdit(customer)}>✎ Edit</button>
            <button className="danger" onClick={() => onDelete(customer.id)}>✕ Remove</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DotRow({ dots }) {
  const order = ['red', 'amber', 'green', 'empty']
  const sorted = [...dots].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const colors = { red: '#E24B4A', amber: '#BA7517', green: '#639922', empty: 'var(--border-md)' }
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} aria-hidden="true">
      {sorted.map((d, i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: colors[d], flexShrink: 0 }} />
      ))}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 10,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 16px', cursor: 'pointer', userSelect: 'none',
    gap: 12,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: {
    width: 38, height: 38, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 500, flexShrink: 0,
  },
  name:  { fontSize: 15, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub:   { fontSize: 12, color: 'var(--text-3)', marginTop: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  attentionBadge: {
    fontSize: 11, padding: '3px 8px', borderRadius: 20,
    background: 'var(--red-bg)', color: 'var(--red-tx)', fontWeight: 500, whiteSpace: 'nowrap',
  },
  typePill: {
    fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap',
  },
  chevron: { fontSize: 16, color: 'var(--text-3)', transition: 'transform 0.2s', lineHeight: 1 },
  notes: {
    fontSize: 13, color: 'var(--text-2)',
    padding: '0 16px 10px', borderTop: '1px solid var(--border)',
    paddingTop: 10,
  },
  msGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 8, padding: '0 16px 12px',
  },
  msCard: {
    padding: '10px 12px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  msLabel: { fontSize: 11, color: 'var(--text-2)', marginBottom: 4, lineHeight: 1.3 },
  msDate:  { fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 },
  msBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  actions: { display: 'flex', gap: 8, padding: '0 16px 13px' },
}
