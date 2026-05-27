import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets'

export function useGoogleAuth() {
  const [token,    setToken]    = useState(null)
  const [user,     setUser]     = useState(null) // { name, email }
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // Restore persisted display name
  useEffect(() => {
    const saved = localStorage.getItem('pd_display_name')
    if (saved) setUser(u => u ? u : { name: saved, email: '' })
  }, [])

  useEffect(() => {
    if (document.getElementById('gis')) { setLoading(false); return }
    const s = document.createElement('script')
    s.id = 'gis'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true
    s.onload  = () => setLoading(false)
    s.onerror = () => { setError('Failed to load Google auth'); setLoading(false) }
    document.head.appendChild(s)
  }, [])

  const signIn = useCallback(() => {
    if (!window.google) { setError('Google auth not ready'); return }
    setError(null)
    window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { setError(resp.error); return }
        setToken(resp.access_token)
        setTimeout(() => setToken(null), (resp.expires_in - 60) * 1000)

        // Decode name/email from JWT id_token hint if available
        // Otherwise fall back to stored name or prompt once
        try {
          if (resp.id_token) {
            const payload = JSON.parse(atob(resp.id_token.split('.')[1]))
            const name = payload.name || payload.email || 'Team member'
            setUser({ name, email: payload.email || '' })
            localStorage.setItem('pd_display_name', name)
          } else {
            const stored = localStorage.getItem('pd_display_name')
            if (!stored) {
              const name = window.prompt('What\'s your name? (shown on updates you post)', '') || 'Team member'
              localStorage.setItem('pd_display_name', name)
              setUser({ name, email: '' })
            } else {
              setUser({ name: stored, email: '' })
            }
          }
        } catch {
          const stored = localStorage.getItem('pd_display_name') || 'Team member'
          setUser({ name: stored, email: '' })
        }
      }
    }).requestAccessToken()
  }, [])

  const signOut = useCallback(() => {
    if (token) window.google?.accounts.oauth2.revoke(token, () => {})
    setToken(null)
  }, [token])

  const updateDisplayName = useCallback((name) => {
    localStorage.setItem('pd_display_name', name)
    setUser(u => ({ ...u, name }))
  }, [])

  return { token, user, loading, error, signIn, signOut, updateDisplayName }
}
