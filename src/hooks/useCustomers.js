import { useState, useEffect, useCallback } from 'react'
import { ensureSheet, fetchCustomers, appendCustomer, updateCustomer, deleteCustomerRow } from '../lib/sheets.js'

export function useCustomers(token) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      await ensureSheet(token)
      const data = await fetchCustomers(token)
      setCustomers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const addCustomer = useCallback(async (customer) => {
    const newCustomer = { ...customer, id: Date.now().toString() }
    await appendCustomer(token, newCustomer)
    setCustomers(prev => [...prev, newCustomer])
    return newCustomer
  }, [token])

  const editCustomer = useCallback(async (customer) => {
    const idx = customers.findIndex(c => c.id === customer.id)
    if (idx === -1) throw new Error('Customer not found')
    await updateCustomer(token, customer, idx + 1)
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c))
  }, [token, customers])

  const removeCustomer = useCallback(async (id) => {
    const idx = customers.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Customer not found')
    await deleteCustomerRow(token, idx + 1)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }, [token, customers])

  return { customers, loading, error, reload: load, addCustomer, editCustomer, removeCustomer }
}
