import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Landmark,
  Search,
  ShieldCheck,
  Check,
  RefreshCw,
  Banknote,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
} from 'lucide-react'
import { withdrawals as api } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorBanner, Field, KeyValue, Loader, Modal } from '../components/ui'
import { money, dateLong } from '../utils/format'

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'completed', label: 'Retirés' },
  { key: 'cancelled', label: 'Annulés' },
]

/** Guichet : l'agent valide la remise d'espèces avec le mot de passe du client. */
export default function Teller() {
  const { user, account, refresh } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('pending')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const load = async (which = tab) => {
    setLoading(true)
    try {
      const data = await api.pending(which)
      setList(data.withdrawals || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.is_staff) load(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.is_staff])

  if (user && !user.is_staff) return <Navigate to="/" replace />

  const lookup = async (e) => {
    e.preventDefault()
    setLookupError('')
    const value = code.trim().toUpperCase()
    if (!value) return
    try {
      const data = await api.detail(value)
      openValidation(data)
    } catch (err) {
      setLookupError(err.status === 404 ? 'Aucune demande ne correspond à ce code.' : err.message)
    }
  }

  const openValidation = (withdrawal) => {
    setSelected(withdrawal)
    setPassword('')
    setError('')
  }

  const validate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api.validate(selected.code, password)
      setSelected(null)
      setCode('')
      setReceipt({ ...data.withdrawal, agent_balance: data.agent_balance })
      toast.success(data.detail)
      await Promise.all([load(), refresh()])
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guichet — retraits d’espèces</h1>
          <p>Saisissez le code du client, vérifiez le montant, puis faites confirmer par son mot de passe.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => load()}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 22 }}>
        <form className="card card-pad stack" onSubmit={lookup}>
          <div className="row" style={{ gap: 12 }}>
            <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <Landmark size={21} />
            </span>
            <div>
              <strong style={{ fontSize: '.96rem' }}>Code de retrait du client</strong>
              <p className="mute-xs">Format WDR suivi de 8 chiffres.</p>
            </div>
          </div>

          <ErrorBanner>{lookupError}</ErrorBanner>

          <div className="row wrap" style={{ gap: 10 }}>
            <div className="input-group grow" style={{ minWidth: 220 }}>
              <Search size={17} />
              <input
                className="input mono"
                style={{ letterSpacing: '.08em', fontWeight: 600 }}
                placeholder="WDR12345678"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!code.trim()}>
              Vérifier
            </button>
          </div>
        </form>

        <div className="card card-pad row" style={{ gap: 14 }}>
          <span className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <Banknote size={21} />
          </span>
          <div className="grow">
            <div className="stat-label">Caisse de l’agent ({user?.username})</div>
            <div className="stat-value mono">{money(account?.account_balance)}</div>
            <p className="mute-xs">Chaque retrait validé crédite ce compte du montant remis.</p>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 420, marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loader full label="Chargement des demandes…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState icon={Banknote} title="Aucune demande" text="Rien à traiter dans cette catégorie." />
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-2">
          {list.map((w) => (
            <article className="card card-pad stack" key={w.code}>
              <div className="row-between">
                <div className="row" style={{ gap: 12 }}>
                  <span className="avatar">
                    <UserIcon size={18} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{w.full_name || w.username}</div>
                    <div className="mute-xs">
                      {w.account_number} · {w.email}
                    </div>
                  </div>
                </div>
                <div className="tr">
                  <div className="mono" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {money(w.amount)}
                  </div>
                  <div className="mute-xs mono">{w.code}</div>
                </div>
              </div>

              <KeyValue k="Motif" v={w.description || '—'} />
              <KeyValue k="Demandé le" v={dateLong(w.date)} />
              <KeyValue k="Solde du client" v={money(w.account_balance)} />
              {w.status === 'completed' && <KeyValue k="Traité par" v={w.processed_by_username || '—'} />}

              {w.status === 'pending' && (
                <button className="btn btn-primary btn-block" onClick={() => openValidation(w)}>
                  <ShieldCheck size={16} /> Remettre l’argent
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Confirmation du client"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={busy}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={validate} disabled={busy || !password}>
              {busy ? <span className="spinner" /> : <Check size={16} />} Valider le retrait
            </button>
          </>
        }
      >
        <form className="stack" onSubmit={validate}>
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
            <KeyValue k="Client" v={selected?.full_name || selected?.username} />
            <KeyValue k="Compte" v={selected?.account_number} />
            <KeyValue k="Code" v={<span className="mono">{selected?.code}</span>} />
            <KeyValue k="Montant à remettre" v={<strong>{money(selected?.amount)}</strong>} />
            <KeyValue k="Solde du client" v={money(selected?.account_balance)} />
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <Field label="Mot de passe du client" hint="À saisir par le client lui-même.">
            <div className="input-group">
              <Lock size={17} />
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <button type="button" className="input-suffix" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Retrait effectué"
        footer={
          <button className="btn btn-primary" onClick={() => setReceipt(null)}>
            Terminer
          </button>
        }
      >
        <div className="stack" style={{ textAlign: 'center' }}>
          <div className="success-ring">
            <Check size={38} strokeWidth={3} />
          </div>
          <h3>Remettez {money(receipt?.amount)} au client</h3>
          <div style={{ textAlign: 'left' }}>
            <KeyValue k="Client" v={receipt?.full_name || receipt?.username} />
            <KeyValue k="Code" v={<span className="mono">{receipt?.code}</span>} />
            <KeyValue k="Transaction" v={<span className="mono">{receipt?.transaction_id}</span>} />
            <KeyValue k="Nouvelle caisse" v={money(receipt?.agent_balance)} />
          </div>
        </div>
      </Modal>
    </>
  )
}
