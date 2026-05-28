import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { MILESTONES, milestoneStatus, statusMeta, formatDate, timeAgo } from '../lib/constants.js'
import { StatCard, Avatar, Badge } from '../components/UI.jsx'

const CHART_COLORS = ['#4f8ef7','#3ecf8e','#f5a623','#f25f5c','#a78bfa','#38bdf8']

function allMilestonesFor(customer) {
  const global = MILESTONES.filter(m => m.types.includes(customer.type))
  const custom = (customer.customMilestones || []).map(m => ({ ...m, isCustom: true }))
  return [...global, ...custom]
}

function isCompleted(customer, key) {
  return !!(customer.completions?.[`${key}_done`] || customer.completions?.[key])
}

function nextActionableMilestone(customer) {
  // Collect all incomplete milestones that are overdue or due soon
  const incomplete = allMilestonesFor(customer).filter(m => {
    if (isCompleted(customer, m.key)) return false
    const date = m.isCustom ? m.date : customer.dates[m.key]
    const s = milestoneStatus(date, false)
    return s === 'soon' || s === 'overdue'
  })
  // Sort by actual date ascending — nearest first, custom and global treated equally
  incomplete.sort((a, b) => {
    const da = a.isCustom ? a.date : customer.dates[a.key]
    const db = b.isCustom ? b.date : customer.dates[b.key]
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
  return incomplete[0] || null
}

function customerHealth(customer) {
  const ms    = allMilestonesFor(customer)
  const done  = ms.filter(m => isCompleted(customer, m.key)).length
  const dates = ms.map(m => m.isCustom ? m.date : customer.dates[m.key])
  if (dates.some(d => milestoneStatus(d, false) === 'overdue')) return 'red'
  if (dates.some(d => milestoneStatus(d, false) === 'soon'))    return 'amber'
  if (done === ms.length && ms.length > 0)                       return 'complete'
  return 'green'
}

const HEALTH_META = {
  red:      { color: 'var(--red)',    label: 'Overdue' },
  amber:    { color: 'var(--amber)',  label: 'Due soon' },
  green:    { color: 'var(--green)',  label: 'On track' },
  complete: { color: 'var(--text-3)', label: 'Complete' },
}

export default function DashboardView({ customers, tasks, blockers, onSelectCustomer, onAddCustomer }) {
  const [showArchived,  setShowArchived]  = useState(false)
  const [typeFilter,    setTypeFilter]    = useState('all')   // 'all' | 'poc' | 'termed'
  const [healthFilter,  setHealthFilter]  = useState('all')   // 'all' | 'red' | 'amber' | 'green' | 'complete'
  const [sortBy,        setSortBy]        = useState('name')  // 'name' | 'go_live' | 'progress' | 'updated'
  const [sortDir,       setSortDir]       = useState('asc')

  const activeCustomers   = customers.filter(c => !c.archived)
  const archivedCustomers = customers.filter(c => c.archived)
  const viewList          = showArchived ? archivedCustomers : activeCustomers

  const stats = useMemo(() => {
    const ac = activeCustomers
    const activeBlockers = blockers.filter(b => !b.resolvedAt && ac.some(c => c.id === b.customerId)).length
    const waitingOnCust  = blockers.filter(b => !b.resolvedAt && b.type === 'Waiting on Customer' && ac.some(c => c.id === b.customerId)).length
    const goingLiveSoon  = ac.filter(c => {
      if (isCompleted(c, 'go_live')) return false
      const s = milestoneStatus(c.dates.go_live, false)
      return s === 'soon' || s === 'overdue'
    }).length
    let totalMs = 0, doneMs = 0
    ac.forEach(c => {
      const ms = allMilestonesFor(c); totalMs += ms.length
      doneMs += ms.filter(m => isCompleted(c, m.key)).length
    })
    return { activeBlockers, waitingOnCust, goingLiveSoon, totalMs, doneMs }
  }, [customers, blockers])

  const milestoneData = useMemo(() => {
    const ac = activeCustomers
    const global = MILESTONES.map(m => {
      const relevant  = ac.filter(c => m.types.includes(c.type))
      const completed = relevant.filter(c => isCompleted(c, m.key)).length
      return { name: m.label.replace('Model office / ', 'MO ').replace('Handover — ', '').slice(0, 22), completed, total: relevant.length }
    }).filter(d => d.total > 0)
    const customMap = {}
    ac.forEach(c => (c.customMilestones || []).forEach(m => {
      if (!customMap[m.label]) customMap[m.label] = { total: 0, completed: 0 }
      customMap[m.label].total++
      if (m.completed) customMap[m.label].completed++
    }))
    const custom = Object.entries(customMap).map(([label, d]) => ({ name: label.slice(0, 22), completed: d.completed, total: d.total }))
    return [...global, ...custom]
  }, [customers])

  const typeData = [
    { name: 'Model office / POC', value: activeCustomers.filter(c => c.type === 'poc').length },
    { name: 'Termed agreement',   value: activeCustomers.filter(c => c.type === 'termed').length },
  ].filter(d => d.value > 0)

  // Filter + sort
  const filtered = useMemo(() => {
    let list = viewList
    if (typeFilter !== 'all')   list = list.filter(c => c.type === typeFilter)
    if (healthFilter !== 'all') list = list.filter(c => customerHealth(c) === healthFilter)
    return [...list].sort((a, b) => {
      let av, bv
      if (sortBy === 'name')     { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      if (sortBy === 'go_live')  { av = a.dates.go_live || 'zzz'; bv = b.dates.go_live || 'zzz' }
      if (sortBy === 'updated')  { av = a.lastUpdated || ''; bv = b.lastUpdated || '' }
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

  const SortIcon = ({ col }) => sortBy !== col ? <span style={{ opacity: 0.3 }}>↕</span> : sortDir === 'asc' ? <span>↑</span> : <span>↓</span>

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12 }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>)}
      </div>
    )
  }

  return (
    <div>
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active projects"       value={activeCustomers.length}   accent="var(--accent)" sub={archivedCustomers.length ? `${archivedCustomers.length} archived` : ''} />
        <StatCard label="Milestones complete"   value={`${stats.doneMs}/${stats.totalMs}`} accent="var(--green)" sub={stats.totalMs ? `${Math.round(stats.doneMs / stats.totalMs * 100)}% across all projects` : ''} />
        <StatCard label="Active blockers"       value={stats.activeBlockers}     accent={stats.activeBlockers > 0 ? 'var(--red)' : 'var(--green)'} sub={stats.waitingOnCust > 0 ? `${stats.waitingOnCust} waiting on customer` : 'None waiting on customer'} />
        <StatCard label="Going live soon"       value={stats.goingLiveSoon}      accent={stats.goingLiveSoon > 0 ? 'var(--amber)' : 'var(--green)'} />
      </div>

      {/* Charts */}
      {activeCustomers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Milestone completion</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={milestoneData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" name="Done"  fill="var(--green)"    radius={[3,3,0,0]} />
                <Bar dataKey="total"     name="Total" fill="var(--border-2)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Project types</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-2)' }} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Portfolio table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Table header + filters */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Archive toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', padding: 2, gap: 2 }}>
            {[{v:false,l:'Active'},{v:true,l:`Archived (${archivedCustomers.length})`}].map(({v,l}) => (
              <button key={String(v)} onClick={() => setShowArchived(v)} style={{
                padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 'var(--radius-sm)',
                background: showArchived === v ? 'var(--surface)' : 'transparent',
                color: showArchived === v ? 'var(--text)' : 'var(--text-3)',
                boxShadow: showArchived === v ? 'var(--shadow-sm)' : 'none',
              }}>{l}</button>
            ))}
          </div>

          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '5px 8px' }}>
            <option value="all">All types</option>
            <option value="poc">POC only</option>
            <option value="termed">Termed only</option>
          </select>

          {/* Health filter */}
          <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '5px 8px' }}>
            <option value="all">All statuses</option>
            <option value="red">Overdue</option>
            <option value="amber">Due soon</option>
            <option value="green">On track</option>
            <option value="complete">Complete</option>
          </select>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} of {viewList.length}</span>
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
                      { label: 'Customer',  col: 'name' },
                      { label: 'Type',      col: null },
                      { label: 'Health',    col: null },
                      { label: 'Progress',  col: 'progress' },
                      { label: 'Next outstanding', col: null },
                      { label: 'Go live',   col: 'go_live' },
                      { label: 'Blockers',  col: null },
                      { label: 'Last updated', col: 'updated' },
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
                    const allMs    = allMilestonesFor(c)
                    const doneMs   = allMs.filter(m => isCompleted(c, m.key)).length
                    const pct      = allMs.length ? Math.round(doneMs / allMs.length * 100) : 0
                    const nextMs   = nextActionableMilestone(c)
                    const goLiveDone = isCompleted(c, 'go_live')
                    const goLiveMeta = statusMeta(c.dates.go_live, goLiveDone)
                    const cBlockers  = blockers.filter(b => b.customerId === c.id && !b.resolvedAt).length
                    const health     = customerHealth(c)
                    const hm         = HEALTH_META[health]
                    return (
                      <tr key={c.id} onClick={() => onSelectCustomer(c)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: c.archived ? 0.6 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '11px 14px', maxWidth: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Avatar name={c.name} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                              {c.owner && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.owner}</div>}
                              {c.notes && (
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                  title={c.notes}>
                                  📌 {c.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <Badge label={c.type === 'poc' ? 'POC' : 'Termed'} color={c.type === 'poc' ? 'var(--green)' : 'var(--blue)'} bg={c.type === 'poc' ? 'var(--green-bg)' : 'var(--blue-bg)'} border={c.type === 'poc' ? 'var(--green)' : 'var(--blue)'} />
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 11, color: hm.color, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>● {hm.label}</span>
                        </td>
                        <td style={{ padding: '11px 14px', minWidth: 90 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{doneMs}/{allMs.length}</div>
                          <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, width: 70 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--text-3)' : 'var(--accent)', borderRadius: 2 }} />
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', maxWidth: 190 }}>
                          {nextMs ? (() => {
                            const msDate = nextMs.isCustom ? nextMs.date : c.dates[nextMs.key]
                            const isOverdue = milestoneStatus(msDate, false) === 'overdue'
                            return (
                              <div title={nextMs.label}>
                                <div style={{ fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--amber)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 175 }}>
                                  {nextMs.label}
                                </div>
                                {msDate && (
                                  <div style={{ fontSize: 10, color: isOverdue ? 'var(--red)' : 'var(--amber)', opacity: 0.7, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                    {isOverdue ? 'Overdue · ' : ''}{formatDate(msDate)}
                                  </div>
                                )}
                              </div>
                            )
                          })()
                            : <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ All clear</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {c.dates.go_live
                            ? <Badge label={goLiveDone ? `✓ ${formatDate(c.dates.go_live)}` : formatDate(c.dates.go_live)} color={goLiveMeta.color} bg={goLiveMeta.bg} border={goLiveMeta.color} />
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {cBlockers > 0
                            ? <Badge label={`${cBlockers} open`} color="var(--red)" bg="var(--red-bg)" border="var(--red)" />
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>None</span>}
                        </td>
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
                const allMs    = allMilestonesFor(c)
                const doneMs   = allMs.filter(m => isCompleted(c, m.key)).length
                const pct      = allMs.length ? Math.round(doneMs / allMs.length * 100) : 0
                const nextMs   = nextActionableMilestone(c)
                const cBlockers = blockers.filter(b => b.customerId === c.id && !b.resolvedAt).length
                const health    = customerHealth(c)
                const hm        = HEALTH_META[health]
                return (
                  <div key={c.id} onClick={() => onSelectCustomer(c)}
                    style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar name={c.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.owner || 'No owner'} · {c.type === 'poc' ? 'POC' : 'Termed'}</div>
                      </div>
                      <span style={{ fontSize: 11, color: hm.color, fontWeight: 500 }}>● {hm.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{doneMs}/{allMs.length} milestones</div>
                        <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--text-3)' : 'var(--accent)', borderRadius: 2 }} />
                        </div>
                      </div>
                      {nextMs && (() => {
                          const msDate = nextMs.isCustom ? nextMs.date : c.dates[nextMs.key]
                          const isOverdue = milestoneStatus(msDate, false) === 'overdue'
                          return (
                            <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--amber)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}
                              title={nextMs.label}>
                              ↑ {nextMs.label}
                            </span>
                          )
                        })()}
                      {cBlockers > 0 && <span style={{ fontSize: 11, color: 'var(--red)' }}>⚠ {cBlockers} blocker{cBlockers > 1 ? 's' : ''}</span>}
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