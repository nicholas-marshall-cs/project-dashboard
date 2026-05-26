import { useState, useEffect } from 'react'
import { MILESTONES } from '../lib/constants.js'

const EMPTY = { name: '', owner: '', type: 'poc', notes: '', dates: {} }

export default function CustomerModal({ customer, onSave, onClose, saving }) {
  const [form, setForm] = useState(EMPTY)
  const isEdit = !!customer

  useEffect(() => {
    setForm(customer ? { ...customer, dates: { ...customer.dates } } : EMPTY)
  }, [customer])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const setDate = (key, val) => setForm(f => ({ ...f, dates: { ...f.dates, [key]: val } }))

  const visibleMilestones = MILESTONES.filter(m => m.types.includes(form.type))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-h">
        <div style={styles.modalHeader}>
          <h2 id="modal-h" style={styles.modalTitle}>{isEdit ? 'Edit customer' : 'Add customer'}</h2>
          <button onClick={onClose} aria-label="Close" style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Customer name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Account owner</label>
              <input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Your name" />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Deployment type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="poc">Model office / POC</option>
              <option value="termed">Termed agreement</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notes (optional)</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any context for the team" />
          </div>

          <div style={styles.sectionLabel}>Milestone dates</div>
          <div style={styles.msGrid}>
            {visibleMilestones.map(m => (
              <div key={m.key} style={styles.msField}>
                <label style={styles.msLabel}>{m.label}</label>
                <input
                  type="date"
                  value={form.dates[m.key] || ''}
                  onChange={e => setDate(m.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '2rem 1rem', zIndex: 50, overflowY: 'auto',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    width: '100%', maxWidth: 580,
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  modalTitle: { fontSize: 17, fontWeight: 500, color: 'var(--text)' },
  closeBtn: {
    border: 'none', background: 'transparent', fontSize: 16,
    color: 'var(--text-3)', padding: '4px 6px', borderRadius: 'var(--radius-sm)',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 },
  sectionLabel: {
    fontSize: 11, fontWeight: 500, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.6px',
    margin: '16px 0 10px',
  },
  msGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 },
  msField: {},
  msLabel: { display: 'block', fontSize: 11, color: 'var(--text-2)', marginBottom: 4, lineHeight: 1.3 },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    marginTop: '1.25rem', paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
  },
}
