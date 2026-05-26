import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets'

export function useGoogleAuth() {
  const [token, setToken]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  // Load the GIS script once
  useEffect(() => {
    if (document.getElementById('gis-script')) { setLoading(false); return }
    const s = document.createElement('script')
    s.id  = 'gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => setLoading(false)
    s.onerror = () => { setError('Failed to load Google auth'); setLoading(false) }
    document.head.appendChild(s)
  }, [])

  const signIn = useCallback(() => {
    if (!window.google) { setError('Google auth not ready'); return }
    setError(null)
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { setError(resp.error); return }
        setToken(resp.access_token)
        // Tokens expire in ~1hr — clear automatically
        setTimeout(() => setToken(null), (resp.expires_in - 60) * 1000)
      }
    })
    client.requestAccessToken()
  }, [])

  const signOut = useCallback(() => {
    if (token) window.google?.accounts.oauth2.revoke(token, () => {})
    setToken(null)
  }, [token])

  return { token, loading, error, signIn, signOut }
}
