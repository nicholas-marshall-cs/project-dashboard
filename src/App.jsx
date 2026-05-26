import { useState } from 'react'
import { useGoogleAuth } from './hooks/useGoogleAuth.js'
import { useCustomers } from './hooks/useCustomers.js'
import CustomerCard from './components/CustomerCard.jsx'
import CustomerModal from './components/CustomerModal.jsx'
import './App.css'

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'poc',       label: 'Model office / POC' },
  { key: 'termed',    label: 'Termed agreement' },
  { key: 'attention', label: 'Needs attention' },
]

export default function App() {
  const { token, loading: authLoading, error: authError, signIn, signOut } = useGoogleAuth()
  const { customers, loading, error, reload, addCustomer, editCustomer, removeCustomer } = useCustomers(token)

  const [filter, setFilter]   = useState('all')
  const [modal, setModal]     = useState(null) // null | 'add' | customer object
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  const filtered = customers.filter(c => {
    if (filter === 'poc')    return c.type === 'poc'
    if (filter === 'termed') return c.type === 'termed'
    if (filter === 'attention') {
      const { milestoneStatus } = require ? null : null
      return Object.values(c.dates).some(d => {
        if (!d) return false
        const diff = (new Date(d + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000
        return diff < 0 || diff <= 14
      })
    }
    return true
  })

  // Recalculate attention filter properly
  const filteredCustomers = filter === 'attention'
    ? customers.filter(c => Object.values(c.dates).some(d => {
        if (!d) return false
        const diff = (new Date(d + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000
        return diff < 0 || diff <= 14
      }))
    : filter === 'all' ? customers
    : customers.filter(c => c.type === filter)

  const handleSave = async (form) => {
    setSaving(true); setSaveErr(null)
    try {
      if (modal && modal !== 'add') {
        await editCustomer({ ...modal, ...form })
      } else {
        await addCustomer(form)
      }
      setModal(null)
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this customer from the tracker?')) return
    try { await removeCustomer(id) }
    catch (e) { alert('Failed to remove: ' + e.message) }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">Project tracker</span>
          {token && (
            <span className="badge">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="topbar-right">
          {token ? (
            <>
              <button onClick={reload} disabled={loading} title="Refresh data">↻ Refresh</button>
              <button onClick={() => setModal('add')} className="primary">+ Add customer</button>
              <button onClick={signOut} title="Sign out">Sign out</button>
            </>
          ) : null}
        </div>
      </header>

      <main className="main">
        {/* Not signed in */}
        {!token && !authLoading && (
          <div className="signin-screen">
            <div className="signin-card">
              <div className="signin-icon">📋</div>
              <h1 className="signin-title">Project tracker</h1>
              <p className="signin-sub">Track milestone dates across all your customer deployments.</p>
              {authError && <p className="error-msg">{authError}</p>}
              <button className="primary signin-btn" onClick={signIn}>
                Sign in with Google
              </button>
            </div>
          </div>
        )}

        {/* Loading auth */}
        {authLoading && <div className="center-msg">Loading…</div>}

        {/* Signed in */}
        {token && (
          <>
            <div className="filters">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={filter === f.key ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="error-banner">
                ⚠ {error} — <button onClick={reload}>Retry</button>
              </div>
            )}

            {loading && <div className="center-msg">Loading customers…</div>}

            {!loading && filteredCustomers.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🏢</div>
                <p>{customers.length === 0 ? 'No customers yet — add your first one.' : 'No customers match this filter.'}</p>
              </div>
            )}

            {!loading && filteredCustomers.map(c => (
              <CustomerCard
                key={c.id}
                customer={c}
                onEdit={(c) => setModal(c)}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </main>

      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => { setModal(null); setSaveErr(null) }}
          saving={saving}
        />
      )}

      {saveErr && (
        <div className="toast-error">⚠ {saveErr}</div>
      )}
    </div>
  )
}
