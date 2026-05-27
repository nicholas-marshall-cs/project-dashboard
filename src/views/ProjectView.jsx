import { useState } from 'react'
import { useSaveState } from '../hooks/useSaveState.js'
import { MILESTONES, TASK_STATUSES, BLOCKER_TYPES, formatDate, formatTs, statusMeta, milestoneStatus, avatarColor } from '../lib/constants.js'
import { Tabs, Badge, Avatar, EmptyState, Modal, Field, FormGrid, ModalFooter, SectionHeader } from '../components/UI.jsx'

// ── Milestones tab ─────────────────────────────────────────────────────────────
function MilestoneCard({ label, dateStr, completed, onToggle, onDateChange, isCustom, onRemove }) {
  const meta  = statusMeta(dateStr, completed)
  const s     = milestoneStatus(dateStr, completed)
  const [editing, setEditing] = useState(false)

  const borderColor = completed ? 'var(--green)' : s === 'overdue' ? 'var(--red-bg)' : s === 'soon' ? 'var(--amber-bg)' : 'var(--border)'

  return (
    <div style={{
      background: completed ? 'var(--green-bg)' : 'var(--bg-3)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius)', padding: '12px 14px',
      opacity: completed ? 0.85 : 1,
      transition: 'all 0.15s',
    }}>
      {/* Top row: label + remove (custom only) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: completed ? 'var(--green)' : 'var(--text-3)', lineHeight: 1.3, flex: 1, textDecoration: completed ? 'line-through' : 'none' }}>
          {label}
          {isCustom && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>custom</span>}
        </div>
        {isCustom && (
          <button className="ghost" onClick={onRemove} style={{ padding: '0 4px', fontSize: 11, color: 'var(--text-3)', opacity: 0.5, marginLeft: 4 }}>✕</button>
        )}
      </div>

      {/* Date — click to edit */}
      {editing ? (
        <input
          type="date"
          defaultValue={dateStr || ''}
          autoFocus
          onBlur={e => { onDateChange(e.target.value); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onDateChange(e.target.value); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          style={{ marginBottom: 8, fontSize: 12 }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ fontSize: 13, fontWeight: 500, color: completed ? 'var(--green)' : 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-mono)', cursor: 'pointer', borderBottom: '1px dashed var(--border-2)', paddingBottom: 4 }}
          title="Click to edit date"
        >
          {formatDate(dateStr)}
        </div>
      )}

      {/* Bottom row: status badge + complete toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.color} />
        <button
          onClick={onToggle}
          style={{
            padding: '3px 10px', fontSize: 11,
            background: completed ? 'var(--green-bg)' : 'transparent',
            color: completed ? 'var(--green)' : 'var(--text-3)',
            border: `1px solid ${completed ? 'var(--green)' : 'var(--border-2)'}`,
            borderRadius: 20, gap: 4,
          }}
          title={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed ? '✓ Done' : '○ Done'}
        </button>
      </div>
    </div>
  )
}

function SaveIndicator({ status }) {
  if (status === 'idle') return null
  const cfg = {
    saving: { text: 'Saving…',  color: 'var(--text-3)' },
    saved:  { text: '✓ Saved',  color: 'var(--green)'  },
    error:  { text: '✗ Error',  color: 'var(--red)'    },
  }
  const c = cfg[status]
  if (!c) return null
  return (
    <span style={{ fontSize: 11, color: c.color, fontFamily: 'var(--font-mono)', transition: 'opacity 0.3s', marginLeft: 6 }}>
      {c.text}
    </span>
  )
}

function MilestonesTab({ customer, onToggleGlobal, onGlobalDateChange, onAddCustom, onCustomDateChange, onToggleCustom, onRemoveCustom, saveStatus }) {
  const [newLabel, setNewLabel] = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [adding,   setAdding]   = useState(false)

  const globalMs = MILESTONES.filter(m => m.types.includes(customer.type))
  const customMs = customer.customMilestones || []

  const handleAddCustom = async () => {
    if (!newLabel.trim()) return
    setAdding(true)
    await onAddCustom(newLabel.trim())
    setNewLabel(''); setShowAdd(false); setAdding(false)
  }

  const globalDone = globalMs.filter(m => customer.completions?.[`${m.key}_done`]).length
  const customDone = customMs.filter(m => m.completed).length
  const doneCount  = globalDone + customDone
  const totalCount = globalMs.length + customMs.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Overall progress</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{doneCount} / {totalCount} complete</span>
              <SaveIndicator status={saveStatus} />
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`, background: 'var(--green)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Standard milestones</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
        {globalMs.map(m => {
          const doneKey   = `${m.key}_done`
          const completed = !!(customer.completions?.[doneKey])
          return (
            <MilestoneCard
              key={m.key}
              label={m.label}
              dateStr={customer.dates[m.key]}
              completed={completed}
              onToggle={() => onToggleGlobal(doneKey)}
              onDateChange={val => onGlobalDateChange(m.key, val)}
              isCustom={false}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>Custom milestones ({customMs.length})</div>
        <button onClick={() => setShowAdd(s => !s)} style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}>+ Add milestone</button>
      </div>

      {showAdd && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Security review sign-off" onKeyDown={e => e.key === 'Enter' && handleAddCustom()} autoFocus />
          <button className="primary" onClick={handleAddCustom} disabled={adding || !newLabel.trim()} style={{ whiteSpace: 'nowrap' }}>Add</button>
          <button onClick={() => { setShowAdd(false); setNewLabel('') }}>Cancel</button>
        </div>
      )}

      {customMs.length === 0 && !showAdd && (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0', fontStyle: 'italic' }}>No custom milestones for this customer yet.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {customMs.map(m => (
          <MilestoneCard key={m.key} label={m.label} dateStr={m.date || ''} completed={!!m.completed}
            onToggle={() => onToggleCustom(m.key)} onDateChange={val => onCustomDateChange(m.key, val)}
            isCustom={true} onRemove={() => onRemoveCustom(m.key)} />
        ))}
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
        <button className="primary" disabled={saving || !form.title.trim()} onClick={() => onSave(form)}>{saving ? 'Saving…' : 'Add task'}</button>
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
    await onAdd({ customerId, text: text.trim(), author: currentUser?.name || 'You' })
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {myUpdates.map(u => {
          const isSystem = u.isSystem === 'true' || u.isSystem === true
          return (
            <div key={u.id} style={{
              display: 'flex', gap: 12,
              background: isSystem ? 'transparent' : 'var(--bg-3)',
              border: `1px solid ${isSystem ? 'var(--border)' : 'var(--border)'}`,
              borderLeft: isSystem ? '2px solid var(--border-2)' : '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: isSystem ? '8px 12px' : '12px 14px',
              opacity: isSystem ? 0.7 : 1,
            }}>
              {!isSystem && <Avatar name={u.author || 'You'} size={30} />}
              {isSystem && <span style={{ fontSize: 14, flexShrink: 0 }}>⚙</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isSystem ? 2 : 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isSystem ? 11 : 12, fontWeight: 500, color: isSystem ? 'var(--text-3)' : 'var(--text)' }}>{u.author || 'You'}</span>
                  {isSystem && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3 }}>system</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatTs(u.createdAt)}</span>
                </div>
                <p style={{ fontSize: isSystem ? 12 : 13, color: isSystem ? 'var(--text-3)' : 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.text}</p>
              </div>
              {!isSystem && <button className="ghost" onClick={() => onDelete(u.id)} style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-3)', alignSelf: 'flex-start', opacity: 0.4 }}>✕</button>}
            </div>
          )
        })}
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
      <Field label="Type"><select value={form.type} onChange={e => set('type', e.target.value)}>{BLOCKER_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Detail"><textarea value={form.detail} onChange={e => set('detail', e.target.value)} placeholder="More context…" style={{ minHeight: 70 }} /></Field>
      <ModalFooter>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={saving || !form.title.trim()} onClick={() => onSave({ ...form, customerId })}>{saving ? 'Saving…' : 'Add blocker'}</button>
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
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Raised {formatTs(b.raisedAt)}{b.resolvedAt ? ` · Resolved ${formatTs(b.resolvedAt)}` : ''}</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: closed.length ? 20 : 0 }}>{open.map(b => <BlockerRow key={b.id} b={b} />)}</div>
      {closed.length > 0 && <>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Resolved ({closed.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{closed.map(b => <BlockerRow key={b.id} b={b} />)}</div>
      </>}
      {showModal && <BlockerModal customerId={customerId} onSave={async f => { await onAdd(f); setShowModal(false) }} onClose={() => setShowModal(false)} saving={saving} />}
    </div>
  )
}

// ── Main project view ──────────────────────────────────────────────────────────
export default function ProjectView({ customer, tasks, updates, blockers, currentUser, onBack, onEdit, onDelete, onArchive, data }) {
  const [tab, setTab] = useState('milestones')
  const { status: saveStatus, wrap } = useSaveState()

  const handleGlobalDateChange = async (msKey, val) => {
    await wrap(data.updateMilestoneDate)(customer.id, msKey, val)
  }

  const myTasks      = tasks.filter(t => t.customerId === customer.id)
  const myUpdates    = updates.filter(u => u.customerId === customer.id)
  const myBlockers   = blockers.filter(b => b.customerId === customer.id)
  const openBlockers = myBlockers.filter(b => !b.resolvedAt).length

  const tabs = [
    { key: 'milestones', label: 'Milestones' },
    { key: 'tasks',      label: 'Tasks',    count: myTasks.length },
    { key: 'updates',    label: 'Updates',  count: myUpdates.length },
    { key: 'blockers',   label: 'Blockers', count: openBlockers || undefined },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button className="ghost" onClick={onBack} style={{ fontSize: 13, color: 'var(--text-3)', padding: '6px 10px' }}>← Back</button>
        <Avatar name={customer.name} size={38} />
        <div style={{ flex: 1, minWidth: 120 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>{customer.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            {customer.owner && <span>👤 {customer.owner}</span>}
            <span>{customer.type === 'poc' ? '🔬 Model office / POC' : '📄 Termed agreement'}</span>
            {openBlockers > 0 && <span style={{ color: 'var(--red)' }}>⚠ {openBlockers} open blocker{openBlockers > 1 ? 's' : ''}</span>}
            {customer.archived && <span style={{ color: 'var(--text-3)' }}>📦 Archived</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ fontSize: 12, padding: '6px 12px' }}>✎ Edit</button>
          <button onClick={() => onArchive(customer.id, !customer.archived)} style={{ fontSize: 12, padding: '6px 12px', color: 'var(--text-3)' }}>
            {customer.archived ? '♻️ Restore' : '📦 Archive'}
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'milestones' && (
        <MilestonesTab
          customer={customer}
          saveStatus={saveStatus}
          onToggleGlobal={key       => wrap(data.toggleMilestone)(customer.id, key)}
          onGlobalDateChange={handleGlobalDateChange}
          onAddCustom={label        => wrap(data.addCustomMilestone)(customer.id, label)}
          onCustomDateChange={(k,v) => wrap(data.updateCustomMilestoneDate)(customer.id, k, v)}
          onToggleCustom={key       => wrap(data.toggleCustomMilestone)(customer.id, key)}
          onRemoveCustom={key       => wrap(data.removeCustomMilestone)(customer.id, key)}
        />
      )}
      {tab === 'tasks'    && <TasksTab tasks={tasks} customerId={customer.id} onAdd={wrap(data.addTask)} onStatusChange={wrap(data.editTask)} onDelete={wrap(data.removeTask)} saving={saveStatus === 'saving'} />}
      {tab === 'updates'  && <UpdatesTab updates={updates} customerId={customer.id} onAdd={wrap(data.addUpdate)} onDelete={wrap(data.removeUpdate)} saving={saveStatus === 'saving'} currentUser={currentUser} />}
      {tab === 'blockers' && <BlockersTab blockers={blockers} customerId={customer.id} onAdd={wrap(data.addBlocker)} onResolve={wrap(data.resolveBlocker)} onDelete={wrap(data.removeBlocker)} saving={saveStatus === 'saving'} />}
    </div>
  )
}
