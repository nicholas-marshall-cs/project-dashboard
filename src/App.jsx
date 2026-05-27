import { useState } from 'react'
import { useGoogleAuth } from './hooks/useGoogleAuth.js'
import { useData } from './hooks/useData.js'
import { useTheme } from './hooks/useTheme.js'
import DashboardView from './views/DashboardView.jsx'
import ProjectView from './views/ProjectView.jsx'
import CustomerModal from './components/CustomerModal.jsx'
import './App.css'

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { token, user, loading: authLoading, error: authError, signIn, signOut, updateDisplayName } = useGoogleAuth()
  const data = useData(token, user)
  const { customers, tasks, updates, blockers, loading, error, reload } = data

  const [view,         setView]        = useState('dashboard')
  const [modal,        setModal]       = useState(null)
  const [saving,       setSaving]      = useState(false)
  const [saveErr,      setSaveErr]     = useState(null)
  const [editingName,  setEditingName] = useState(false)
  const [nameInput,    setNameInput]   = useState('')

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
    if (!window.confirm('Permanently delete this customer and all their data?')) return
    await data.removeCustomer(id)
    setView('dashboard')
  }

  const handleNameSave = () => {
    if (nameInput.trim()) updateDisplayName(nameInput.trim())
    setEditingName(false)
  }

  const isDashboard = view === 'dashboard'

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo" onClick={() => setView('dashboard')}>
            <span className="logo-mark">◆</span>
            <span className="logo-text">Project Dashboard</span>
          </span>
          {token && !isDashboard && typeof view === 'object' && (
            <span className="breadcrumb">/ {view.name}</span>
          )}
        </div>
        <div className="topbar-right">
          {token && (
            <>
              {/* Display name — click to edit */}
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                    autoFocus
                    style={{ width: 130, padding: '5px 8px', fontSize: 12 }}
                    placeholder="Your name"
                  />
                  <button className="primary" onClick={handleNameSave} style={{ padding: '5px 10px', fontSize: 12 }}>Save</button>
                </div>
              ) : (
                <button className="ghost" onClick={() => { setNameInput(user?.name || ''); setEditingName(true) }}
                  style={{ fontSize: 12, color: 'var(--text-3)' }} title="Change your display name">
                  👤 {user?.name || 'Set name'}
                </button>
              )}
              <button className="ghost" onClick={toggleTheme} style={{ fontSize: 14, padding: '5px 9px' }} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? '☀️' : '🌙'}</button>
              <button className="ghost" onClick={reload} disabled={loading} style={{ fontSize: 12, padding: '5px 10px' }} title="Refresh data">↻</button>
              <button className="primary" onClick={() => setModal('add')}>+ Add customer</button>
              <button className="ghost" onClick={signOut} style={{ fontSize: 12 }}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="main">
        {!token && !authLoading && (
          <div className="signin-wrap">
            <div className="signin-card">
              <div className="signin-logo">◆</div>
              <h1>Project Dashboard</h1>
              <p>Track milestones, tasks, updates and blockers across all your customer deployments.</p>
              {authError && <div className="error-inline">{authError}</div>}
              <button className="primary signin-btn" onClick={signIn}>Sign in with Google</button>
              <button className="ghost" onClick={toggleTheme} style={{ marginTop: 12, fontSize: 13, color: 'var(--text-3)', width: '100%', justifyContent: 'center' }}>
                {theme === 'dark' ? '☀️ Switch to light mode' : '🌙 Switch to dark mode'}
              </button>
            </div>
          </div>
        )}

        {authLoading && <div className="center-msg">Loading…</div>}

        {token && (
          <>
            {error && <div className="error-banner">⚠ {error} <button onClick={reload} style={{ marginLeft: 8 }}>Retry</button></div>}
            {loading && <div className="center-msg">Loading data…</div>}
            {!loading && isDashboard && (
              <DashboardView
                customers={customers}
                tasks={tasks}
                blockers={blockers}
                onSelectCustomer={c => setView(c)}
                onAddCustomer={() => setModal('add')}
              />
            )}
            {!loading && !isDashboard && typeof view === 'object' && (
              <ProjectView
                customer={customers.find(c => c.id === view.id) || view}
                tasks={tasks}
                updates={updates}
                blockers={blockers}
                currentUser={user}
                onBack={() => setView('dashboard')}
                onEdit={() => setModal(customers.find(c => c.id === view.id) || view)}
                onDelete={handleDelete}
                onArchive={(id, archived) => { data.archiveCustomer(id, archived); setView('dashboard') }}
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