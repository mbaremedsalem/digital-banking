import { useEffect, useRef, useState } from 'react'
import { X, Inbox, AlertCircle } from 'lucide-react'

/* ----------------------------------------------------------------- Loader */
export function Loader({ full = false, label }) {
  if (full) {
    return (
      <div className="loader-full">
        <div className="stack" style={{ alignItems: 'center', gap: 12 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
          {label && <span className="muted">{label}</span>}
        </div>
      </div>
    )
  }
  return <span className="spinner" />
}

/* --------------------------------------------------------------- Skeleton */
export function Skeleton({ h = 16, w = '100%', style }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />
}

/* ------------------------------------------------------------- EmptyState */
export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------- ErrorBanner */
export function ErrorBanner({ children }) {
  if (!children) return null
  return (
    <div className="form-error">
      <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ Field */
export function Field({ label, error, children, hint }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="mute-xs">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ Modal */
export function Modal({ open, onClose, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={width ? { maxWidth: width } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- KeyValue */
export function KeyValue({ k, v }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{v}</span>
    </div>
  )
}

/* -------------------------------------------------------------- Dropdown */
export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="dropdown" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="menu" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- PinInput */
export function PinInput({ length = 4, value, onChange, autoFocus = true }) {
  const refs = useRef([])
  const chars = String(value || '').padEnd(length, ' ').slice(0, length).split('')

  const setChar = (index, char) => {
    const next = chars.map((c, i) => (i === index ? char : c)).join('').replace(/ /g, '')
    onChange(next)
  }

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const arr = String(value || '').split('')
    arr[index] = digit || ''
    onChange(arr.join('').slice(0, length))
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  const handleKey = (index, e) => {
    if (e.key === 'Backspace' && !chars[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus()
      setChar(index - 1, '')
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (text) {
      e.preventDefault()
      onChange(text)
      refs.current[Math.min(text.length, length - 1)]?.focus()
    }
  }

  return (
    <div className="pin-wrap" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="pin-box"
          inputMode="numeric"
          type="password"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={String(value || '')[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          aria-label={`Chiffre ${i + 1} du code PIN`}
        />
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- Stepper */
export function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'contents' }}>
          <div className={`step ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
            <span className="step-num">{i < current ? '✓' : i + 1}</span>
            <span className="step-text">{label}</span>
          </div>
          {i < steps.length - 1 && <span className={`step-line ${i < current ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}
