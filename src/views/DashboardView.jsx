import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MILESTONES, milestoneStatus, statusMeta, formatDate, timeAgo } from '../lib/constants.js'
import { Avatar, Badge } from '../components/UI.jsx'

const CHART_COLORS = ['#4f8ef7','#3ecf8e','#f5a623','#f25f5c','#a78bfa','#38bdf8']

// ── Helpers ────────────────────────────────────────────────────────────────────
function allMilestonesFor(customer) {
  const global = MILESTONES.filter(m => m.types.includes(customer.type))
  const custom = (customer.customMilestones || []).map(m => ({ ...m, isCustom: true }))
  return [...global, ...custom]
}

function isCompleted(customer, key) {
  return !!(customer.completions?.[`${key}_done`] || customer.completions?.[key])
}

function nextActionableMilestone(customer) {
  const incomplete = allMilestonesFor(customer).filter(m => {
    if (isCompleted(customer, m.key)) return false
    const date = m.isCustom ? m.date : customer.dates[m.key]
    return ['soon','overdue'].includes(milestoneStatus(date, false))
  })
  incomplete.sort((a, b) => {
    const da = a.isCustom ? a.date : customer.dates[a.key]
    const db = b.isCustom ? b.date : customer.dates[b.key]
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1
    return da.localeCompare(db)
  })
  return incomplete[0] || null
}

function customerHealth(customer) {
  const ms         = allMilestonesFor(customer)
  const incomplete = ms.filter(m => !isCompleted(customer, m.key))
  const done       = ms.length - incomplete.length
  const dates      = incomplete.map(m => m.isCustom ? m.date : customer.dates[m.key])
  const overdue    = dates.filter(d => milestoneStatus(d, false) === 'overdue').length
  const soon       = dates.filter(d => milestoneStatus(d, false) === 'soon').length
  if (overdue > 0) return { status: 'red',      label: 'Overdue',  overdue, soon }
  if (soon    > 0) return { status: 'amber',     label: 'Due soon', overdue, soon }
  if (done === ms.length && ms.length > 0) return { status: 'complete', label: 'Complete', overdue: 0, soon: 0 }
  return { status: 'green', label: 'On track', overdue: 0, soon: 0 }
}

const HEALTH_COLOR = {
  red:      'var(--red)',
  amber:    'var(--amber)',
  green:    'var(--green)',
  complete: 'var(--text-3)',
}

// Mini ring component for task progress
function ProgressRing({ done, total, size = 28 }) {
  if (!total) return <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
  const pct    = done / total
  const r      = (size - 4) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color  = pct === 1 ? 'var(--green)' : pct > 0.5 ? 'var(--accent)' : 'var(--amber)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-2)" strokeWidth={2.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s' }} />
      </svg>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{done}/{total}</span>
    </div>
  )
}

// Clickable stat card
function StatCard({ label, value, sub, accent, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? accent + '18' : 'var(--surface)',
        border: `1px solid ${active ? accent : 'var(--border)'}`,
        borderLeft: `3px solid ${accent || 'var(--border-2)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
      title={onClick ? `Click to filter by this` : undefined}
    >
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-display)', color: accent || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function DashboardView({ customers, tasks, blockers, onSelectCustomer, onAddCustomer }) {
  const [showArchived,  setShowArchived]  = useState(false)
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [healthFilter,  setHealthFilter]  = useState('all')
  const [sortBy,        setSortBy]        = useState('name')
  const [sortDir,       setSortDir]       = useState('asc')

  const activeCustomers   = customers.filter(c => !c.archived)
  const archivedCustomers = customers.filter(c => c.archived)
  const viewList          = showArchived ? archivedCustomers : activeCustomers

  const stats = useMemo(() => {
    const ac = activeCustomers
    const activeBlockers  = blockers.filter(b => !b.resolvedAt && ac.some(c => c.id === b.customerId)).length
    const waitingOnCust   = blockers.filter(b => !b.resolvedAt && b.type === 'Waiting on Customer' && ac.some(c => c.id === b.customerId)).length
    const internalBlockers = blockers.filter(b => !b.resolvedAt && b.type === 'Internal' && ac.some(c => c.id === b.customerId)).length
    const goingLiveSoon   = ac.filter(c => {
      if (isCompleted(c, 'go_live')) return false
      return ['soon','overdue'].includes(milestoneStatus(c.dates.go_live, false))
    }).length
    let totalMs = 0, doneMs = 0
    ac.forEach(c => {
      const ms = allMilestonesFor(c); totalMs += ms.length
      doneMs += ms.filter(m => isCompleted(c, m.key)).length
    })
    const overdueCount = ac.filter(c => customerHealth(c).status === 'red').length
    return { activeBlockers, waitingOnCust, internalBlockers, goingLiveSoon, totalMs, doneMs, overdueCount }
  }, [customers, blockers])

  // Milestone completion — horizontal stacked bar (% complete per milestone)
  const milestoneData = useMemo(() => {
    const ac = activeCustomers
    const global = MILESTONES.map(m => {
      const relevant  = ac.filter(c => m.types.includes(c.type))
      const completed = relevant.filter(c => isCompleted(c, m.key)).length
      const pct       = relevant.length ? Math.round(completed / relevant.length * 100) : 0
      return { name: m.label.replace('Model office / roadmap ', 'MO ').replace('Handover — sales to implementation', 'Handover').replace('Roadmap document completed & sent', 'Roadmap doc').replace('Model office conclusion', 'MO conclusion').slice(0, 20), pct, completed, total: relevant.length }
    }).filter(d => d.total > 0)
    return global
  }, [customers])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = viewList
    if (typeFilter !== 'all')   list = list.filter(c => c.type === typeFilter)
    if (healthFilter !== 'all') list = list.filter(c => customerHealth(c).status === healthFilter)
    return [...list].sort((a, b) => {
      let av, bv
      if (sortBy === 'name')     { av = a.name.toLowerCase();        bv = b.name.toLowerCase() }
      if (sortBy === 'go_live')  { av = a.dates.go_live || 'zzz';   bv = b.dates.go_live || 'zzz' }
      if (sortBy === 'updated')  { av = a.lastUpdated || '';         bv = b.lastUpdated || '' }
      if (sortBy === 'health')   { av = customerHealth(a).status;    bv = customerHealth(b).status }
      if (sortBy === 'progress') {
        const pct = c => { const ms = allMilestonesFor(c); return ms.length ? ms.filter(m => isCompleted(c, m.key)).length / ms.length : 0 }
        av = pct(a); bv = pct(b)
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [viewList, typeFilter, healthFilter, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }
  const SortIcon = ({ col }) => sortBy !== col
    ? <span style={{ opacity: 0.25 }}>↕</span>
    : sortDir === 'asc' ? <span>↑</span> : <span>↓</span>

  const setHealthQuickFilter = (h) => {
    setHealthFilter(f => f === h ? 'all' : h)
    setShowArchived(false)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12 }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {p.value}{p.name === '% complete' ? '%' : ''}</p>)}
      </div>
    )
  }

  return (
    <div>
      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Active projects" value={activeCustomers.length}
          accent="var(--accent)"
          sub={archivedCustomers.length ? `${archivedCustomers.length} archived` : 'None archived'}
        />
        <StatCard
          label="Needs attention" value={stats.overdueCount}
          accent={stats.overdueCount > 0 ? 'var(--red)' : 'var(--green)'}
          sub={stats.overdueCount > 0 ? 'Click to filter' : 'All on track'}
          onClick={stats.overdueCount > 0 ? () => setHealthQuickFilter('red') : undefined}
          active={healthFilter === 'red'}
        />
        <StatCard
          label="Going live soon" value={stats.goingLiveSoon}
          accent={stats.goingLiveSoon > 0 ? 'var(--amber)' : 'var(--green)'}
          sub={stats.goingLiveSoon > 0 ? 'Within 14 days' : 'None imminent'}
        />
        <StatCard
          label="Open blockers" value={stats.activeBlockers}
          accent={stats.activeBlockers > 0 ? 'var(--red)' : 'var(--green)'}
          sub={stats.waitingOnCust > 0 ? `${stats.waitingOnCust} waiting on customer` : stats.internalBlockers > 0 ? `${stats.internalBlockers} internal` : 'None open'}
        />
        <StatCard
          label="Milestones done" value={`${stats.doneMs}/${stats.totalMs}`}
          accent="var(--green)"
          sub={stats.totalMs ? `${Math.round(stats.doneMs / stats.totalMs * 100)}% complete` : ''}
        />
      </div>

      {/* ── Chart ── */}
      {activeCustomers.length > 0 && milestoneData.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Milestone completion across all projects
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={milestoneData} layout="vertical" margin={{ top: 0, right: 40, left: 160, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 11 }} width={155} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pct" name="% complete" radius={[0,3,3,0]} maxBarSize={16}>
                {milestoneData.map((d, i) => (
                  <Cell key={i} fill={d.pct === 100 ? 'var(--green)' : d.pct > 50 ? 'var(--accent)' : d.pct > 0 ? 'var(--amber)' : 'var(--border-2)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Portfolio table ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Filters row */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Active / Archived toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: 2, gap: 2 }}>
            {[{v:false,l:'Active'},{v:true,l:`Archived (${archivedCustomers.length})`}].map(({v,l}) => (
              <button key={String(v)} onClick={() => setShowArchived(v)} style={{
                padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 'var(--radius-sm)',
                background: showArchived === v ? 'var(--surface)' : 'transparent',
                color: showArchived === v ? 'var(--text)' : 'var(--text-3)',
              }}>{l}</button>
            ))}
          </div>

          {/* Health quick-filter pills */}
          {[
            { key: 'red',      label: 'Overdue',  color: 'var(--red)' },
            { key: 'amber',    label: 'Due soon', color: 'var(--amber)' },
            { key: 'green',    label: 'On track', color: 'var(--green)' },
            { key: 'complete', label: 'Complete', color: 'var(--text-3)' },
          ].map(h => (
            <button key={h.key} onClick={() => setHealthQuickFilter(h.key)} style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 20,
              border: `1px solid ${healthFilter === h.key ? h.color : 'var(--border)'}`,
              background: healthFilter === h.key ? h.color + '18' : 'transparent',
              color: healthFilter === h.key ? h.color : 'var(--text-3)',
            }}>● {h.label}</button>
          ))}

          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '5px 8px', marginLeft: 'auto' }}>
            <option value="all">All types</option>
            <option value="poc">POC only</option>
            <option value="termed">Termed only</option>
          </select>

          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} shown</span>
          <button className="primary" onClick={onAddCustomer} style={{ fontSize: 12, padding: '5px 11px' }}>+ Add</button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{showArchived ? '📦' : '📋'}</div>
            <p>{showArchived ? 'No archived projects.' : customers.length === 0 ? 'No customers yet — add your first one.' : 'No projects match this filter.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="portfolio-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[
                      { label: 'Customer',         col: 'name' },
                      { label: 'Health',            col: 'health' },
                      { label: 'Progress',          col: 'progress' },
                      { label: 'Next outstanding',  col: null },
                      { label: 'Go live',           col: 'go_live' },
                      { label: 'Blockers',          col: null },
                      { label: 'Tasks',             col: null },
                      { label: 'Last updated',      col: 'updated' },
                    ].map(({ label, col }) => (
                      <th key={label} onClick={col ? () => toggleSort(col) : undefined}
                        style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 400, letterSpacing: '0.5px', whiteSpace: 'nowrap', cursor: col ? 'pointer' : 'default', userSelect: 'none' }}>
                        {label} {col && <SortIcon col={col} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const allMs      = allMilestonesFor(c)
                    const doneMs     = allMs.filter(m => isCompleted(c, m.key)).length
                    const pct        = allMs.length ? Math.round(doneMs / allMs.length * 100) : 0
                    const nextMs     = nextActionableMilestone(c)
                    const goLiveDone = isCompleted(c, 'go_live')
                    const goLiveMeta = statusMeta(c.dates.go_live, goLiveDone)
                    const health     = customerHealth(c)
                    const hColor     = HEALTH_COLOR[health.status]
                    const cBlockers  = blockers.filter(b => b.customerId === c.id && !b.resolvedAt)
                    const internalB  = cBlockers.filter(b => b.type === 'Internal').length
                    const waitingB   = cBlockers.filter(b => b.type === 'Waiting on Customer').length
                    const cTasks     = tasks.filter(t => t.customerId === c.id)
                    const doneTasks  = cTasks.filter(t => t.status === 'Done').length
                    return (
                      <tr key={c.id} onClick={() => onSelectCustomer(c)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: c.archived ? 0.6 : 1, borderLeft: `3px solid ${hColor}` }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        {/* Customer */}
                        <td style={{ padding: '11px 14px', maxWidth: 210 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Avatar name={c.name} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                {c.owner && <span>{c.owner} · </span>}
                                <span style={{ color: c.type === 'poc' ? 'var(--green)' : 'var(--blue)' }}>{c.type === 'poc' ? 'POC' : 'Termed'}</span>
                              </div>
                              {c.notes && (
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }} title={c.notes}>
                                  📌 {c.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Health — richer summary */}
                        <td style={{ padding: '11px 14px', minWidth: 110 }}>
                          <div style={{ fontSize: 12, color: hColor, fontWeight: 500, marginBottom: 2 }}>● {health.label}</div>
                          {(health.overdue > 0 || health.soon > 0) && (
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                              {health.overdue > 0 && <span style={{ color: 'var(--red)' }}>{health.overdue} overdue</span>}
                              {health.overdue > 0 && health.soon > 0 && <span> · </span>}
                              {health.soon > 0 && <span style={{ color: 'var(--amber)' }}>{health.soon} due soon</span>}
                            </div>
                          )}
                        </td>

                        {/* Progress */}
                        <td style={{ padding: '11px 14px', minWidth: 90 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{doneMs}/{allMs.length} milestones</div>
                          <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, width: 80, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : hColor, borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                        </td>

                        {/* Next outstanding */}
                        <td style={{ padding: '11px 14px', maxWidth: 190 }}>
                          {nextMs ? (() => {
                            const msDate   = nextMs.isCustom ? nextMs.date : c.dates[nextMs.key]
                            const isOverdue = milestoneStatus(msDate, false) === 'overdue'
                            return (
                              <div title={nextMs.label}>
                                <div style={{ fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--amber)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 175 }}>
                                  {nextMs.label}
                                </div>
                                {msDate && (
                                  <div style={{ fontSize: 10, color: isOverdue ? 'var(--red)' : 'var(--amber)', opacity: 0.75, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                    {isOverdue ? 'Overdue · ' : ''}{formatDate(msDate)}
                                  </div>
                                )}
                              </div>
                            )
                          })() : <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ All clear</span>}
                        </td>

                        {/* Go live */}
                        <td style={{ padding: '11px 14px' }}>
                          {c.dates.go_live
                            ? <Badge label={goLiveDone ? `✓ ${formatDate(c.dates.go_live)}` : formatDate(c.dates.go_live)} color={goLiveMeta.color} bg={goLiveMeta.bg} border={goLiveMeta.color} />
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                        </td>

                        {/* Blockers — split internal / waiting */}
                        <td style={{ padding: '11px 14px' }}>
                          {cBlockers.length === 0
                            ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>None</span>
                            : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {internalB > 0 && (
                                  <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>⚠ {internalB} internal</span>
                                )}
                                {waitingB > 0 && (
                                  <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>⏳ {waitingB} waiting</span>
                                )}
                              </div>
                          }
                        </td>

                        {/* Tasks — mini ring */}
                        <td style={{ padding: '11px 14px' }}>
                          <ProgressRing done={doneTasks} total={cTasks.length} />
                        </td>

                        {/* Last updated */}
                        <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {timeAgo(c.lastUpdated)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="portfolio-cards">
              {filtered.map(c => {
                const allMs     = allMilestonesFor(c)
                const doneMs    = allMs.filter(m => isCompleted(c, m.key)).length
                const pct       = allMs.length ? Math.round(doneMs / allMs.length * 100) : 0
                const nextMs    = nextActionableMilestone(c)
                const health    = customerHealth(c)
                const hColor    = HEALTH_COLOR[health.status]
                const cBlockers = blockers.filter(b => b.customerId === c.id && !b.resolvedAt).length
                const cTasks    = tasks.filter(t => t.customerId === c.id)
                const doneTasks = cTasks.filter(t => t.status === 'Done').length
                return (
                  <div key={c.id} onClick={() => onSelectCustomer(c)}
                    style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${hColor}`, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar name={c.name} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.owner || 'No owner'} · {c.type === 'poc' ? 'POC' : 'Termed'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: hColor, fontWeight: 500 }}>● {health.label}</div>
                        {(health.overdue > 0 || health.soon > 0) && (
                          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            {health.overdue > 0 && `${health.overdue} overdue`}
                            {health.overdue > 0 && health.soon > 0 && ' · '}
                            {health.soon > 0 && `${health.soon} due soon`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{doneMs}/{allMs.length} milestones</div>
                        <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: hColor, borderRadius: 2 }} />
                        </div>
                      </div>
                      {nextMs && (() => {
                        const msDate = nextMs.isCustom ? nextMs.date : c.dates[nextMs.key]
                        const isOverdue = milestoneStatus(msDate, false) === 'overdue'
                        return <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--amber)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={nextMs.label}>↑ {nextMs.label}</span>
                      })()}
                      {cBlockers > 0 && <span style={{ fontSize: 11, color: 'var(--red)' }}>⚠ {cBlockers}</span>}
                      <ProgressRing done={doneTasks} total={cTasks.length} size={22} />
                      <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>{timeAgo(c.lastUpdated)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}