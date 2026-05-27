import { useState, useEffect, useCallback } from 'react'
import { ensureSheets, fetchCustomers, fetchTasks, fetchUpdates, fetchBlockers,
         appendCustomer, updateCustomer, deleteCustomer,
         appendTask, updateTask, deleteTask,
         appendUpdate, deleteUpdate,
         appendBlocker, updateBlocker, deleteBlocker } from '../lib/sheets.js'
import { MILESTONES } from '../lib/constants.js'

export function useData(token, currentUser) {
  const [customers, setCustomers] = useState([])
  const [tasks,     setTasks]     = useState([])
  const [updates,   setUpdates]   = useState([])
  const [blockers,  setBlockers]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      await ensureSheets(token)
      const [c, t, u, b] = await Promise.all([
        fetchCustomers(token), fetchTasks(token),
        fetchUpdates(token),   fetchBlockers(token)
      ])
      setCustomers(c); setTasks(t); setUpdates(u); setBlockers(b)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const authorName = currentUser?.name || 'Team member'

  const persistCustomer = useCallback(async (updated, prevList) => {
    const idx = prevList.findIndex(x => x.id === updated.id)
    if (idx === -1) throw new Error('Customer not found')
    const withTs = { ...updated, lastUpdated: new Date().toISOString() }
    await updateCustomer(token, withTs, idx)
    setCustomers(p => p.map(x => x.id === updated.id ? withTs : x))
    return withTs
  }, [token])

  const logSystemUpdate = useCallback(async (customerId, text) => {
    const entry = {
      id: `sys_${Date.now()}`,
      customerId,
      text,
      author: authorName,
      createdAt: new Date().toISOString(),
      isSystem: 'true',
    }
    await appendUpdate(token, entry)
    setUpdates(p => [...p, entry])
  }, [token, authorName])

  // ── Customers ──────────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c) => {
    const nc = {
      ...c,
      id: Date.now().toString(),
      completions: {},
      customMilestones: [],
      archived: false,
      lastUpdated: new Date().toISOString(),
    }
    await appendCustomer(token, nc)
    setCustomers(p => [...p, nc])
    return nc
  }, [token])

  const editCustomer = useCallback(async (c) => {
    return persistCustomer(c, customers)
  }, [persistCustomer, customers])

  const archiveCustomer = useCallback(async (id, archived) => {
    const c = customers.find(x => x.id === id)
    if (!c) return
    const updated = { ...c, archived }
    await persistCustomer(updated, customers)
    await logSystemUpdate(id, archived ? '📦 Project archived.' : '♻️ Project restored to active.')
  }, [persistCustomer, logSystemUpdate, customers])

  const removeCustomer = useCallback(async (id) => {
    const idx = customers.findIndex(x => x.id === id)
    await deleteCustomer(token, idx)
    setCustomers(p => p.filter(x => x.id !== id))
    setTasks(p    => p.filter(x => x.customerId !== id))
    setUpdates(p  => p.filter(x => x.customerId !== id))
    setBlockers(p => p.filter(x => x.customerId !== id))
  }, [token, customers])

  // ── Global milestone toggle ────────────────────────────────────────────────
  const toggleMilestone = useCallback(async (customerId, doneKey) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const nowDone = !c.completions?.[doneKey]
    const updated = { ...c, completions: { ...c.completions, [doneKey]: nowDone } }
    await persistCustomer(updated, customers)
    // Auto-log
    const msKey   = doneKey.replace('_done', '')
    const msLabel = MILESTONES.find(m => m.key === msKey)?.label || msKey
    await logSystemUpdate(customerId, nowDone
      ? `✅ Milestone marked complete: ${msLabel}`
      : `↩️ Milestone reopened: ${msLabel}`)
  }, [persistCustomer, logSystemUpdate, customers])

  // ── Custom milestones ──────────────────────────────────────────────────────
  const addCustomMilestone = useCallback(async (customerId, label) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const newMs  = { key: `custom_${Date.now()}`, label, date: '', completed: false }
    const updated = { ...c, customMilestones: [...(c.customMilestones || []), newMs] }
    await persistCustomer(updated, customers)
  }, [persistCustomer, customers])

  const updateCustomMilestoneDate = useCallback(async (customerId, key, date) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const ms = c.customMilestones?.find(m => m.key === key)
    const updated = {
      ...c,
      customMilestones: (c.customMilestones || []).map(m => m.key === key ? { ...m, date } : m)
    }
    await persistCustomer(updated, customers)
    if (date && ms) await logSystemUpdate(customerId, `📅 Custom milestone date set: "${ms.label}" → ${date}`)
  }, [persistCustomer, logSystemUpdate, customers])

  const toggleCustomMilestone = useCallback(async (customerId, key) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const ms = c.customMilestones?.find(m => m.key === key)
    if (!ms) return
    const nowDone = !ms.completed
    const updated = {
      ...c,
      customMilestones: (c.customMilestones || []).map(m => m.key === key ? { ...m, completed: nowDone } : m)
    }
    await persistCustomer(updated, customers)
    await logSystemUpdate(customerId, nowDone
      ? `✅ Milestone marked complete: ${ms.label}`
      : `↩️ Milestone reopened: ${ms.label}`)
  }, [persistCustomer, logSystemUpdate, customers])

  const removeCustomMilestone = useCallback(async (customerId, key) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const ms = c.customMilestones?.find(m => m.key === key)
    const updated = { ...c, customMilestones: (c.customMilestones || []).filter(m => m.key !== key) }
    await persistCustomer(updated, customers)
    if (ms) await logSystemUpdate(customerId, `🗑️ Custom milestone removed: "${ms.label}"`)
  }, [persistCustomer, logSystemUpdate, customers])

  // ── Global milestone date change (inline) ──────────────────────────────────
  const updateMilestoneDate = useCallback(async (customerId, msKey, date) => {
    const c = customers.find(x => x.id === customerId)
    if (!c) return
    const updated = { ...c, dates: { ...c.dates, [msKey]: date } }
    await persistCustomer(updated, customers)
    const msLabel = MILESTONES.find(m => m.key === msKey)?.label || msKey
    if (date) await logSystemUpdate(customerId, `📅 Date updated: "${msLabel}" → ${date}`)
  }, [persistCustomer, logSystemUpdate, customers])

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (t) => {
    const nt = { ...t, id: Date.now().toString(), createdAt: new Date().toISOString() }
    await appendTask(token, nt); setTasks(p => [...p, nt]); return nt
  }, [token])

  const editTask = useCallback(async (t) => {
    await updateTask(token, t, tasks); setTasks(p => p.map(x => x.id === t.id ? t : x))
  }, [token, tasks])

  const removeTask = useCallback(async (id) => {
    await deleteTask(token, id, tasks); setTasks(p => p.filter(x => x.id !== id))
  }, [token, tasks])

  // ── Updates ────────────────────────────────────────────────────────────────
  const addUpdate = useCallback(async (u) => {
    const nu = { ...u, id: Date.now().toString(), createdAt: new Date().toISOString(), author: u.author || authorName }
    await appendUpdate(token, nu); setUpdates(p => [...p, nu]); return nu
  }, [token, authorName])

  const removeUpdate = useCallback(async (id) => {
    await deleteUpdate(token, id, updates); setUpdates(p => p.filter(x => x.id !== id))
  }, [token, updates])

  // ── Blockers ───────────────────────────────────────────────────────────────
  const addBlocker = useCallback(async (b) => {
    const nb = { ...b, id: Date.now().toString(), raisedAt: new Date().toISOString(), resolvedAt: '' }
    await appendBlocker(token, nb); setBlockers(p => [...p, nb]); return nb
  }, [token])

  const resolveBlocker = useCallback(async (id) => {
    const b = blockers.find(x => x.id === id)
    if (!b) return
    const updated = { ...b, resolvedAt: new Date().toISOString() }
    await updateBlocker(token, updated, blockers)
    setBlockers(p => p.map(x => x.id === id ? updated : x))
    await logSystemUpdate(b.customerId, `✅ Blocker resolved: "${b.title}"`)
  }, [token, blockers, logSystemUpdate])

  const removeBlocker = useCallback(async (id) => {
    await deleteBlocker(token, id, blockers); setBlockers(p => p.filter(x => x.id !== id))
  }, [token, blockers])

  return {
    customers, tasks, updates, blockers,
    loading, error, reload: load,
    addCustomer, editCustomer, removeCustomer, archiveCustomer,
    toggleMilestone, updateMilestoneDate,
    addCustomMilestone, updateCustomMilestoneDate, toggleCustomMilestone, removeCustomMilestone,
    addTask, editTask, removeTask,
    addUpdate, removeUpdate,
    addBlocker, resolveBlocker, removeBlocker,
  }
}
