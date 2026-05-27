import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { MILESTONES, milestoneStatus, statusMeta, formatDate } from '../lib/constants.js'
import { StatCard, Avatar, Badge } from '../components/UI.jsx'

const CHART_COLORS = ['#4f8ef7','#3ecf8e','#f5a623','#f25f5c','#a78bfa','#38bdf8']

// ── Helpers ────────────────────────────────────────────────────────────────────

// Returns all milestones for a customer — global + custom
function allMilestonesFor(customer) {
  const global = MILESTONES.filter(m => m.types.includes(customer.type))
  const custom = (customer.customMilestones || []).map(m => ({ ...m, isCustom: true }))
  return [...global, ...custom]
}

// Is a milestone completed? Handles both global (key_done) and custom (key) completion keys
function isCompleted(customer, key) {
  return !!(customer.completions?.[`${key}_done`] || customer.completions?.[key])
}

// Get the next actionable milestone — skipping completed ones, finding overdue or soon
function nextActionableMilestone(customer) {
  const ms = allMilestonesFor(customer)
  return ms.find(m => {
    if (isCompleted(customer, m.key)) return false
    const s = milestoneStatus(customer.dates[m.key], false)
    return s === 'soon' || s === 'overdue'
  })
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function DashboardView({ customers, tasks, blockers, onSelectCustomer }) {

  const stats = useMemo(() => {
    const activeBlockers = blockers.filter(b => !b.resolvedAt).length
    const waitingOnCust  = blockers.filter(b => !b.resolvedAt && b.type === 'Waiting on Customer').length
    const goingLiveSoon  = customers.filter(c => {
      if (isCompleted(c, 'go_live')) return false
      const s = milestoneStatus(c.dates.go_live, false)
      return s === 'soon' || s === 'overdue'
    }).length
    const totalTasks = tasks.length
    const doneTasks  = tasks.filter(t => t.status === 'Done').length

    // Overall milestone completion across all customers and all milestone types
    let totalMs = 0, doneMs = 0
    customers.forEach(c => {
      const ms = allMilestonesFor(c)
      totalMs += ms.length
      doneMs  += ms.filter(m => isCompleted(c, m.key)).length
    })

    return { activeBlockers, waitingOnCust, goingLiveSoon, totalTasks, doneTasks, totalMs, doneMs }
  }, [customers, tasks, blockers])

  // Milestone coverage chart — completed count vs total relevant customers per milestone
  // Includes custom milestones aggregated across all customers
  const milestoneData = useMemo(() => {
    // Global milestones
    const global = MILESTONES.map(m => {
      const relevant  = customers.filter(c => m.types.includes(c.type))
      const completed = relevant.filter(c => isCompleted(c, m.key)).length
      return {
        name:      m.label.replace('Model office / ', 'MO ').replace('Handover — ', '').slice(0, 22),
        completed,
        total:     relevant.length,
      }
    }).filter(d => d.total > 0)

    // Custom milestones — group by label across customers
    const customMap = {}
    customers.forEach(c => {
      (c.customMilestones || []).forEach(m => {
        if (!customMap[m.label]) customMap[m.label] = { total: 0, completed: 0 }
        customMap[m.label].total++
        if (isCompleted(c, m.key)) customMap[m.label].completed++
      })
    })
    const custom = Object.entries(customMap).map(([label, d]) => ({
      name:      label.slice(0, 22),
      completed: d.completed,
      total:     d.total,
    }))

    return [...global, ...custom]
  }, [customers])

  // Project stage — furthest completed milestone per customer
  const stageData = useMemo(() => {
    const stages = {}
    customers.forEach(c => {
      const ms = MILESTONES.filter(m => m.types.includes(c.type))
      let stage = 'Pre-demo'
      for (const m of [...ms].reverse()) {
        if (isCompleted(c, m.key) || c.dates[m.key]) { stage = m.label.slice(0, 20); break }
      }
      stages[stage] = (stages[stage] || 0) + 1
    })
    return Object.entries(stages).map(([name, value]) => ({ name, value }))
  }, [customers])

  const typeData = [
    { name: 'Model office / POC', value: customers.filter(c => c.type === 'poc').length },
    { name: 'Termed agreement',   value: customers.filter(c => c.type === 'termed').length },
  ].filter(d => d.value > 0)

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total projects"       value={customers.length}       accent="var(--accent)" />
        <StatCard
          label="Milestones complete"
          value={`${stats.doneMs}/${stats.totalMs}`}
          accent="var(--green)"
          sub={stats.totalMs ? `${Math.round(stats.doneMs / stats.totalMs * 100)}% across all projects` : ''}
        />
        <StatCard
          label="Active blockers"
          value={stats.activeBlockers}
          accent={stats.activeBlockers > 0 ? 'var(--red)' : 'var(--green)'}
          sub={stats.waitingOnCust > 0 ? `${stats.waitingOnCust} waiting on customer` : 'None waiting on customer'}
        />
        <StatCard
          label="Going live soon"
          value={stats.goingLiveSoon}
          accent={stats.goingLiveSoon > 0 ? 'var(--amber)' : 'var(--green)'}
        />
        <StatCard
          label="Tasks completed"
          value={`${stats.doneTasks}/${stats.totalTasks}`}
          accent="var(--purple)"
          sub={stats.totalTasks ? `${Math.round(stats.doneTasks / stats.totalTasks * 100)}% done` : ''}
        />
      </div>

      {/* Charts row */}
      {customers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Milestone completion</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={milestoneData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" name="Done"  fill="var(--green)"  radius={[3,3,0,0]} />
                <Bar dataKey="total"     name="Total" fill="var(--border-2)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>All projects</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{customers.length} total</span>
        </div>

        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <p>No customers yet — add your first one.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Customer','Owner','Type','Progress','Next outstanding','Go live','Blockers','Tasks'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 400, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const allMs      = allMilestonesFor(c)
                const doneMs     = allMs.filter(m => isCompleted(c, m.key)).length
                const pct        = allMs.length ? Math.round(doneMs / allMs.length * 100) : 0
                const nextMs     = nextActionableMilestone(c)
                const goLiveDone = isCompleted(c, 'go_live')
                const goLiveMeta = statusMeta(c.dates.go_live, goLiveDone)
                const cBlockers  = blockers.filter(b => b.customerId === c.id && !b.resolvedAt).length
                const cTasks     = tasks.filter(t => t.customerId === c.id)
                const doneTasks  = cTasks.filter(t => t.status === 'Done').length

                return (
                  <tr key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Customer */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} size={30} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                          {c.notes && <div style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>{c.owner || '—'}</td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <Badge
                        label={c.type === 'poc' ? 'POC' : 'Termed'}
                        color={c.type === 'poc' ? 'var(--green)' : 'var(--blue)'}
                        bg={c.type === 'poc' ? 'var(--green-bg)' : 'var(--blue-bg)'}
                        border={c.type === 'poc' ? 'var(--green)' : 'var(--blue)'}
                      />
                    </td>

                    {/* Progress bar */}
                    <td style={{ padding: '12px 16px', minWidth: 100 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{doneMs}/{allMs.length}</div>
                      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, width: 80, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </td>

                    {/* Next outstanding milestone — skips completed ones */}
                    <td style={{ padding: '12px 16px', fontSize: 12, maxWidth: 180 }}>
                      {nextMs ? (
                        <span style={{ color: milestoneStatus(c.dates[nextMs.key], false) === 'overdue' ? 'var(--red)' : 'var(--amber)' }}>
                          {nextMs.label.slice(0, 28)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ All clear</span>
                      )}
                    </td>

                    {/* Go live */}
                    <td style={{ padding: '12px 16px' }}>
                      {c.dates.go_live
                        ? <Badge label={goLiveDone ? `✓ ${formatDate(c.dates.go_live)}` : formatDate(c.dates.go_live)} color={goLiveMeta.color} bg={goLiveMeta.bg} border={goLiveMeta.color} />
                        : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                    </td>

                    {/* Blockers */}
                    <td style={{ padding: '12px 16px' }}>
                      {cBlockers > 0
                        ? <Badge label={`${cBlockers} open`} color="var(--red)" bg="var(--red-bg)" border="var(--red)" />
                        : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>None</span>}
                    </td>

                    {/* Tasks */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
                      {cTasks.length ? `${doneTasks}/${cTasks.length}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}