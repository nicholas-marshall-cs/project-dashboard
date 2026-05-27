import { useState, useEffect } from 'react'
import { MILESTONES } from '../lib/constants.js'
import { Modal, Field, FormGrid, Label, ModalFooter } from './UI.jsx'

const EMPTY = { name: '', owner: '', type: 'poc', notes: '', dates: {} }

export default function CustomerModal({ customer, onSave, onClose, saving }) {
  const [form, setForm] = useState(EMPTY)
  const isEdit = !!customer

  useEffect(() => { setForm(customer ? { ...customer, dates: { ...customer.dates } } : EMPTY) }, [customer])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const setDate = (k, v) => setForm(p => ({ ...p, dates: { ...p.dates, [k]: v } }))
  const ms = MILESTONES.filter(m => m.types.includes(form.type))

  const submit = e => { e.preventDefault(); if (form.name.trim()) onSave(form) }

  return (
    <Modal title={isEdit ? 'Edit customer' : 'Add customer'} onClose={onClose} width={600}>
      <form onSubmit={submit}>
        <FormGrid>
          <Field label="Customer name *">
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
          </Field>
          <Field label="Account owner">
            <input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Your name" />
          </Field>
        </FormGrid>
        <Field label="Deployment type">
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="poc">Model office / POC</option>
            <option value="termed">Termed agreement</option>
          </select>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Context for the team — background, key contacts, important details…" style={{ minHeight: 80 }} />
        </Field>

        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', margin: '18px 0 12px' }}>Milestone dates</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ms.map(m => (
            <div key={m.key}>
              <Label>{m.label}</Label>
              <input type="date" value={form.dates[m.key] || ''} onChange={e => setDate(m.key, e.target.value)} />
            </div>
          ))}
        </div>

        <ModalFooter>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}