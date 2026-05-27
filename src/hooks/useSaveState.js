import { useState, useCallback, useRef } from 'react'

// Returns { status, wrap, SaveIndicator }
// status: 'idle' | 'saving' | 'saved' | 'error'
// wrap(fn) returns an async function that sets status around fn
export function useSaveState() {
  const [status, setStatus] = useState('idle')
  const timerRef = useRef(null)

  const wrap = useCallback((fn) => async (...args) => {
    clearTimeout(timerRef.current)
    setStatus('saving')
    try {
      const result = await fn(...args)
      setStatus('saved')
      timerRef.current = setTimeout(() => setStatus('idle'), 1800)
      return result
    } catch (e) {
      setStatus('error')
      timerRef.current = setTimeout(() => setStatus('idle'), 3000)
      throw e
    }
  }, [])

  return { status, wrap }
}
