import { avatarColor, initials } from '../lib/constants.js'

export function Avatar({ name, size = 34 }) {
  const color = avatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '22', color, border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, fontFamily: 'var(--font-display)',
      letterSpacing: '-0.5px',
    }}>
      {initials(name)}
    </div>
  )
}

export function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 500, padding: '2px 8px',
      borderRadius: 20, background: bg, color, border: `1px solid ${border}33`,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      borderLeft: `3px solid ${accent || 'var(--border-2)'}`,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', color: accent || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>{title}</h3>
      {action}
    </div>
  )
}

export function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p>{message}</p>
    </div>
  )
}

export function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '2rem 1rem', zIndex: 100, overflowY: 'auto',
      backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: width,
        padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button className="ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: 16, color: 'var(--text-3)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.key} className="ghost" onClick={() => onChange(t.key)} style={{
          borderRadius: 0, borderBottom: active === t.key ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === t.key ? 'var(--text)' : 'var(--text-3)',
          paddingBottom: 10, fontSize: 13, fontWeight: active === t.key ? 500 : 400,
          gap: 6,
        }}>
          {t.label}
          {t.count !== undefined && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--surface)', color: 'var(--text-3)' }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Label({ children }) {
  return <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 5, fontFamily: 'var(--font-mono)', letterSpacing: '0.3px' }}>{children}</label>
}

export function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><Label>{label}</Label>{children}</div>
}

export function FormGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

export function ModalFooter({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}
