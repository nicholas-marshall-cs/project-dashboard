import { useState, useEffect, useCallback } from 'react'
import { ensureSheets, fetchCustomers, fetchTasks, fetchUpdates, fetchBlockers,
         appendCustomer, updateCustomer, deleteCustomer,
         appendTask, updateTask, deleteTask,
         appendUpdate, deleteUpdate,
         appendBlocker, updateBlocker, deleteBlocker } from '../lib/sheets.js'

export function useData(token) {
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

  // ── Customers ──────────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c) => {
    const nc = { ...c, id: Date.now().toString() }
    await appendCustomer(token, nc); setCustomers(p => [...p, nc]); return nc
  }, [token])

  const editCustomer = useCallback(async (c) => {
    const idx = customers.findIndex(x => x.id === c.id)
    await updateCustomer(token, c, idx); setCustomers(p => p.map(x => x.id === c.id ? c : x))
  }, [token, customers])

  const removeCustomer = useCallback(async (id) => {
    const idx = customers.findIndex(x => x.id === id)
    await deleteCustomer(token, idx); setCustomers(p => p.filter(x => x.id !== id))
    // Cascade remove related rows (local only — orphaned rows in sheet are benign)
    setTasks(p => p.filter(x => x.customerId !== id))
    setUpdates(p => p.filter(x => x.customerId !== id))
    setBlockers(p => p.filter(x => x.customerId !== id))
  }, [token, customers])

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
    const nu = { ...u, id: Date.now().toString(), createdAt: new Date().toISOString() }
    await appendUpdate(token, nu); setUpdates(p => [...p, nu]); return nu
  }, [token])

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
    await updateBlocker(token, updated, blockers); setBlockers(p => p.map(x => x.id === id ? updated : x))
  }, [token, blockers])

  const removeBlocker = useCallback(async (id) => {
    await deleteBlocker(token, id, blockers); setBlockers(p => p.filter(x => x.id !== id))
  }, [token, blockers])

  return {
    customers, tasks, updates, blockers,
    loading, error, reload: load,
    addCustomer, editCustomer, removeCustomer,
    addTask, editTask, removeTask,
    addUpdate, removeUpdate,
    addBlocker, resolveBlocker, removeBlocker,
  }
}
