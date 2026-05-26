import { useState } from 'react'
import { useGoogleAuth } from './hooks/useGoogleAuth.js'
import { useData } from './hooks/useData.js'
import DashboardView from './views/DashboardView.jsx'
import ProjectView from './views/ProjectView.jsx'
import CustomerModal from './components/CustomerModal.jsx'
import './App.css'

export default function App() {
  const { token, loading: authLoading, error: authError, signIn, signOut } = useGoogleAuth()
  const data = useData(token)
  const { customers, tasks, updates, blockers, loading, error, reload } = data

  const [view,    setView]   = useState('dashboard') // 'dashboard' | customer object
  const [modal,   setModal]  = useState(null)        // null | 'add' | customer object
  const [saving,  setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  const handleSave = async (form) => {
    setSaving(true); setSaveErr(null)
    try {
      if (modal && modal !== 'add') {
        const updated = { ...modal, ...form }
        await data.editCustomer(updated)
        if (view && view.id === modal.id) setView(updated)
      } else {
        await data.addCustomer(form)
      }
      setModal(null)
    } catch (e) { setSaveErr(e.message) }
    finally     { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this customer and all their data?')) return
    await data.removeCustomer(id)
    setView('dashboard')
  }

  const isDashboard = view === 'dashboard'

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
            <span className="logo-mark">◆</span> Project Dashboard
          </span>
          {token && !isDashboard && typeof view === 'object' && (
            <span className="breadcrumb">/ {view.name}</span>
          )}
        </div>
        <div className="topbar-right">
          {token && (
            <>
              <button className="ghost" onClick={reload} disabled={loading} style={{ fontSize: 12, padding: '5px 10px' }}>↻</button>
              <button className="primary" onClick={() => setModal('add')}>+ Add customer</button>
              <button className="ghost" onClick={signOut} style={{ fontSize: 12 }}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="main">
        {/* Sign in */}
        {!token && !authLoading && (
          <div className="signin-wrap">
            <div className="signin-card">
              <div className="signin-logo">◆</div>
              <h1>Project Dashboard</h1>
              <p>Track milestones, tasks, updates and blockers across all your customer deployments.</p>
              {authError && <div className="error-inline">{authError}</div>}
              <button className="primary signin-btn" onClick={signIn}>Sign in with Google</button>
            </div>
          </div>
        )}

        {authLoading && <div className="center-msg">Loading…</div>}

        {token && (
          <>
            {error && (
              <div className="error-banner">⚠ {error} <button onClick={reload} style={{ marginLeft: 8 }}>Retry</button></div>
            )}
            {loading && <div className="center-msg">Loading data…</div>}
            {!loading && isDashboard && (
              <DashboardView
                customers={customers}
                tasks={tasks}
                blockers={blockers}
                onSelectCustomer={c => setView(c)}
              />
            )}
            {!loading && !isDashboard && typeof view === 'object' && (
              <ProjectView
                customer={customers.find(c => c.id === view.id) || view}
                tasks={tasks}
                updates={updates}
                blockers={blockers}
                onBack={() => setView('dashboard')}
                onEdit={() => setModal(customers.find(c => c.id === view.id) || view)}
                onDelete={handleDelete}
                data={data}
              />
            )}
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

      {saveErr && <div className="toast-error">⚠ {saveErr}</div>}
    </div>
  )
}
