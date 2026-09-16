import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ShieldCheck, Home, Receipt } from 'lucide-react'
import { paymentRequests } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, KeyValue, Loader, PinInput } from '../components/ui'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

/** Règlement d'une demande de paiement reçue (débit de mon compte). */
export default function SettleRequest() {
  const { accountNumber, transactionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { account, refresh } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    const fetcher = done ? paymentRequests.settlementCompleted : paymentRequests.settlementConfirmation
    fetcher(accountNumber, transactionId)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [accountNumber, transactionId, done])

  const tx = data?.transaction
  const amount = Number(tx?.amount || 0)
  const balance = Number(account?.account_balance || 0)
  const insufficient = amount > balance

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await paymentRequests.settle(accountNumber, transactionId, pin)
      await refresh()
      toast.success(res?.detail || 'Règlement effectué')
      setDone(true)
      setLoading(true)
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement de la demande…" />

  if (done) {
    return (
      <div className="card card-pad stack" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div className="success-ring">
          <Check size={40} strokeWidth={3} />
        </div>
        <div>
          <h2>Demande réglée</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {money(tx?.amount)} versés au compte {data?.account?.account_number}.
          </p>
        </div>
        <div style={{ textAlign: 'left', marginTop: 8 }}>
          <KeyValue k="Référence" v={<span className="mono">{tx?.transaction_id}</span>} />
          <KeyValue k="Statut" v={<span className={statusClass(tx?.status)}>{statusLabel(tx?.status)}</span>} />
          <KeyValue k="Date" v={dateLong(tx?.date)} />
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-primary grow" onClick={() => navigate('/')}>
            <Home size={16} /> Tableau de bord
          </button>
          <button className="btn btn-ghost grow" onClick={() => navigate('/requests')}>
            <Receipt size={16} /> Mes demandes
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/requests')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Retour aux demandes
          </button>
          <h1>Régler la demande</h1>
          <p>Le montant sera débité de votre compte au profit du demandeur.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="center stack" style={{ gap: 4, marginBottom: 18 }}>
            <span className="mute-xs">Montant à régler</span>
            <span className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {money(amount)}
            </span>
            <span className={statusClass(tx?.status)}>{statusLabel(tx?.status)}</span>
          </div>

          <KeyValue k="Demandeur" v={tx?.sender_username || data?.account?.account_number} />
          <KeyValue k="Compte à créditer" v={data?.account?.account_number} />
          <KeyValue k="Motif" v={tx?.description || '—'} />
          <KeyValue k="Référence" v={<span className="mono">{tx?.transaction_id}</span>} />
          <KeyValue k="Date de la demande" v={dateLong(tx?.date)} />
          <KeyValue k="Votre solde" v={money(balance)} />
          <KeyValue k="Solde après règlement" v={money(Math.max(balance - amount, 0))} />
        </div>

        <form className="card card-pad stack" onSubmit={submit}>
          <div className="row" style={{ gap: 12 }}>
            <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <ShieldCheck size={21} />
            </span>
            <div>
              <strong style={{ fontSize: '.96rem' }}>Confirmez avec votre PIN</strong>
              <p className="mute-xs">Le débit est immédiat une fois le PIN validé.</p>
            </div>
          </div>

          <ErrorBanner>{error || (insufficient ? `Solde insuffisant : ${money(balance)} disponibles.` : '')}</ErrorBanner>

          <div style={{ padding: '10px 0' }}>
            <PinInput value={pin} onChange={setPin} />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || pin.length !== 4 || insufficient}>
            {busy ? <span className="spinner" /> : <Check size={17} />}
            {busy ? 'Traitement…' : `Payer ${money(amount)}`}
          </button>

          <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/requests')} disabled={busy}>
            Annuler
          </button>
        </form>
      </div>
    </>
  )
}
