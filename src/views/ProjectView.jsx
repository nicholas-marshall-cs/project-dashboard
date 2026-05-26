import { useState } from 'react'
import { MILESTONES, TASK_STATUSES, BLOCKER_TYPES, formatDate, formatTs, statusMeta, milestoneStatus, avatarColor } from '../lib/constants.js'
import { Tabs, Badge, Avatar, EmptyState, Modal, Field, FormGrid, ModalFooter, SectionHeader } from '../components/UI.jsx'

// ── Milestones tab ─────────────────────────────────────────────────────────────
function MilestonesTab({ customer, onEdit }) {
  const ms = MILESTONES.filter(m => m.types.includes(customer.type))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
      {ms.map(m => {
        const meta = statusMeta(customer.dates[m.key])
        const s    = milestoneStatus(customer.dates[m.key])
        return (
          <div key={m.key} style={{
            background: 'var(--bg-3)', border: `1px solid ${s === 'overdue' ? 'var(--red-bg)' : s === 'soon' ? 'var(--amber-bg)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.3 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{formatDate(customer.dates[m.key])}</div>
            <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.color} />
          </div>
        )
      })}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onEdit} style={{ borderStyle: 'dashed', color: 'var(--text-3)', fontSize: 12 }}>✎ Edit milestones</button>
      </div>
    </div>
  )
}

// ── Tasks tab ──────────────────────────────────────────────────────────────────
function TaskModal({ onSave, onClose, saving }) {
  const [form, setForm] = useState({ title: '', owner: '', status: 'To Do' })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <Modal title="Add task" onClose={onClose} width={440}>
      <Field label="Task title *"><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What are we building?" /></Field>
      <FormGrid>
        <Field label="Owner"><input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Team member" /></Field>
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </FormGrid>
      <ModalFooter>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={saving || !form.title.trim()} onClick={() => onSave(form)}>
          {saving ? 'Saving…' : 'Add task'}
        </button>
      </ModalFooter>
    </Modal>
  )
}

const STATUS_COLORS = { 'To Do': ['var(--text-3)','var(--bg-3)'], 'In Progress': ['var(--amber)','var(--amber-bg)'], 'Done': ['var(--green)','var(--green-bg)'] }

function TasksTab({ tasks, customerId, onAdd, onStatusChange, onDelete, saving }) {
  const [showModal, setShowModal] = useState(false)
  const myTasks = tasks.filter(t => t.customerId === customerId)

  return (
    <div>
      <SectionHeader title={`Tasks (${myTasks.length})`} action={<button className="primary" onClick={() => setShowModal(true)} style={{ fontSize: 12, padding: '5px 11px' }}>+ Add task</button>} />
      {myTasks.length === 0 && <EmptyState icon="✅" message="No tasks yet — add what the team is building." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {myTasks.map(t => {
          const [color, bg] = STATUS_COLORS[t.status] || STATUS_COLORS['To Do']
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 14px' }}>
              <select value={t.status} onChange={e => onStatusChange({ ...t, status: e.target.value })}
                style={{ width: 'auto', padding: '3px 8px', fontSize: 11, background: bg, color, border: `1px solid ${color}44`, borderRadius: 20, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: t.status === 'Done' ? 'var(--text-3)' : 'var(--text)', textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>{t.title}</div>
                {t.owner && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t.owner}</div>}
              </div>
              <button className="ghost danger" onClick={() => onDelete(t.id)} style={{ padding: '3px 7px', fontSize: 12, opacity: 0.5 }}>✕</button>
            </div>
          )
        })}
      </div>
      {showModal && <TaskModal onSave={async f => { await onAdd({ ...f, customerId }); setShowModal(false) }} onClose={() => setShowModal(false)} saving={saving} />}
    </div>
  )
}

// ── Updates tab ────────────────────────────────────────────────────────────────
function UpdatesTab({ updates, customerId, onAdd, onDelete, saving, currentUser }) {
  const [text, setText] = useState('')
  const myUpdates = [...updates.filter(u => u.customerId === customerId)].sort((a,b) => b.createdAt.localeCompare(a.createdAt))

  const submit = async () => {
    if (!text.trim()) return
    await onAdd({ customerId, text: text.trim(), author: currentUser || 'You' })
    setText('')
  }

  return (
    <div>
      <SectionHeader title={`Updates (${myUpdates.length})`} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Post an update, note, or decision…" style={{ minHeight: 70, flex: 1 }} />
        <button className="primary" onClick={submit} disabled={saving || !text.trim()} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>Post update</button>
      </div>
      {myUpdates.length === 0 && <EmptyState icon="📝" message="No updates yet." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {myUpdates.map(u => (
          <div key={u.id} style={{ display: 'flex', gap: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <Avatar name={u.author || 'You'} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{u.author || 'You'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatTs(u.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.text}</p>
            </div>
            <button className="ghost" onClick={() => onDelete(u.id)} style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-3)', alignSelf: 'flex-start', opacity: 0.5 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Blockers tab ───────────────────────────────────────────────────────────────
function BlockerModal({ customerId, onSave, onClose, saving }) {
  const [form, setForm] = useState({ title: '', type: 'Internal', detail: '' })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <Modal title="Add blocker / open item" onClose={onClose} width={480}>
      <Field label="Title *"><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What's blocked?" /></Field>
      <Field label="Type">
        <select value={form.type} onChange={e => set('type', e.target.value)}>
          {BLOCKER_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Detail"><textarea value={form.detail} onChange={e => set('detail', e.target.value)} placeholder="More context…" style={{ minHeight: 70 }} /></Field>
      <ModalFooter>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={saving || !form.title.trim()} onClick={() => onSave({ ...form, customerId })}>
          {saving ? 'Saving…' : 'Add blocker'}
        </button>
      </ModalFooter>
    </Modal>
  )
}

function BlockersTab({ blockers, customerId, onAdd, onResolve, onDelete, saving }) {
  const [showModal, setShowModal] = useState(false)
  const myBlockers = [...blockers.filter(b => b.customerId === customerId)].sort((a,b) => a.resolvedAt.localeCompare(b.resolvedAt) || b.raisedAt.localeCompare(a.raisedAt))
  const open   = myBlockers.filter(b => !b.resolvedAt)
  const closed = myBlockers.filter(b => b.resolvedAt)

  const TypeBadge = ({ type }) => type === 'Waiting on Customer'
    ? <Badge label="Waiting on customer" color="var(--amber)" bg="var(--amber-bg)" border="var(--amber)" />
    : <Badge label="Internal" color="var(--red)" bg="var(--red-bg)" border="var(--red)" />

  const BlockerRow = ({ b }) => (
    <div style={{ background: 'var(--bg-3)', border: `1px solid ${b.resolvedAt ? 'var(--border)' : 'var(--border-2)'}`, borderRadius: 'var(--radius)', padding: '12px 14px', opacity: b.resolvedAt ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: b.resolvedAt ? 'var(--text-3)' : 'var(--text)', textDecoration: b.resolvedAt ? 'line-through' : 'none' }}>{b.title}</span>
            <TypeBadge type={b.type} />
            {b.resolvedAt && <Badge label="Resolved" color="var(--green)" bg="var(--green-bg)" border="var(--green)" />}
          </div>
          {b.detail && <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, lineHeight: 1.5 }}>{b.detail}</p>}
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Raised {formatTs(b.raisedAt)}{b.resolvedAt ? ` · Resolved ${formatTs(b.resolvedAt)}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!b.resolvedAt && <button onClick={() => onResolve(b.id)} style={{ fontSize: 11, padding: '4px 10px', color: 'var(--green)', borderColor: 'var(--green-bg)' }}>✓ Resolve</button>}
          <button className="ghost" onClick={() => onDelete(b.id)} style={{ padding: '4px 7px', fontSize: 12, color: 'var(--text-3)', opacity: 0.5 }}>✕</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <SectionHeader title={`Open items (${open.length})`} action={<button className="primary" onClick={() => setShowModal(true)} style={{ fontSize: 12, padding: '5px 11px' }}>+ Add blocker</button>} />
      {open.length === 0 && <EmptyState icon="🚀" message="No open blockers — all clear." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: closed.length ? 20 : 0 }}>
        {open.map(b => <BlockerRow key={b.id} b={b} />)}
      </div>
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Resolved ({closed.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {closed.map(b => <BlockerRow key={b.id} b={b} />)}
          </div>
        </>
      )}
      {showModal && <BlockerModal customerId={customerId} onSave={async f => { await onAdd(f); setShowModal(false) }} onClose={() => setShowModal(false)} saving={saving} />}
    </div>
  )
}

// ── Main project view ──────────────────────────────────────────────────────────
export default function ProjectView({ customer, tasks, updates, blockers, onBack, onEdit, onAdd, data }) {
  const [tab, setTab] = useState('milestones')
  const [saving, setSaving] = useState(false)

  const wrap = fn => async (...args) => { setSaving(true); try { await fn(...args) } finally { setSaving(false) } }

  const myTasks    = tasks.filter(t => t.customerId === customer.id)
  const myUpdates  = updates.filter(u => u.customerId === customer.id)
  const myBlockers = blockers.filter(b => b.customerId === customer.id)
  const openBlockers = myBlockers.filter(b => !b.resolvedAt).length

  const tabs = [
    { key: 'milestones', label: 'Milestones' },
    { key: 'tasks',      label: 'Tasks',   count: myTasks.length },
    { key: 'updates',    label: 'Updates', count: myUpdates.length },
    { key: 'blockers',   label: 'Blockers', count: openBlockers || undefined },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="ghost" onClick={onBack} style={{ fontSize: 13, color: 'var(--text-3)', padding: '6px 10px' }}>← Back</button>
        <Avatar name={customer.name} size={40} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>{customer.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12, marginTop: 2 }}>
            {customer.owner && <span>👤 {customer.owner}</span>}
            <span>{customer.type === 'poc' ? '🔬 Model office / POC' : '📄 Termed agreement'}</span>
            {openBlockers > 0 && <span style={{ color: 'var(--red)' }}>⚠ {openBlockers} open blocker{openBlockers > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <button onClick={onEdit} style={{ fontSize: 12, padding: '6px 12px' }}>✎ Edit</button>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'milestones' && <MilestonesTab customer={customer} onEdit={onEdit} />}
      {tab === 'tasks'      && <TasksTab tasks={tasks} customerId={customer.id} onAdd={wrap(data.addTask)} onStatusChange={wrap(data.editTask)} onDelete={wrap(data.removeTask)} saving={saving} />}
      {tab === 'updates'    && <UpdatesTab updates={updates} customerId={customer.id} onAdd={wrap(data.addUpdate)} onDelete={wrap(data.removeUpdate)} saving={saving} />}
      {tab === 'blockers'   && <BlockersTab blockers={blockers} customerId={customer.id} onAdd={wrap(data.addBlocker)} onResolve={wrap(data.resolveBlocker)} onDelete={wrap(data.removeBlocker)} saving={saving} />}
    </div>
  )
}
