import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, HandCoins } from 'lucide-react'
import { paymentRequests } from '../api/endpoints'
import { Field, ErrorBanner, Loader, Stepper, KeyValue } from '../components/ui'
import { REQUEST_STEPS } from './Request'
import { money } from '../utils/format'

export default function RequestAmount() {
  const { accountNumber } = useParams()
  const navigate = useNavigate()

  const [target, setTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    paymentRequests
      .getAccount(accountNumber)
      .then((d) => alive && setTarget(d.account))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [accountNumber])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await paymentRequests.create(accountNumber, amount, description)
      navigate(`/request/${accountNumber}/${data.transaction_id}/confirm`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement du compte…" />

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/request')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Changer de payeur
          </button>
          <h1>Montant demandé</h1>
          <p>Au compte {accountNumber}.</p>
        </div>
      </div>

      <Stepper steps={REQUEST_STEPS} current={1} />

      <div className="grid grid-2">
        <form className="card card-pad stack" onSubmit={submit}>
          <ErrorBanner>{error}</ErrorBanner>

          <Field label="Montant à demander">
            <input
              className="input mono"
              style={{ fontSize: '1.4rem', fontWeight: 700, padding: '16px 14px' }}
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Motif (optionnel)">
            <textarea
              className="textarea"
              placeholder="Remboursement, facture, participation…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </Field>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !amount || Number(amount) <= 0}>
            {busy ? <span className="spinner" /> : <ArrowRight size={17} />}
            {busy ? 'Création…' : 'Continuer'}
          </button>
        </form>

        <aside className="stack">
          <div className="card card-pad">
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <HandCoins size={21} />
              </span>
              <div>
                <div className="stat-label">Montant demandé</div>
                <div className="stat-value mono">{money(amount)}</div>
              </div>
            </div>

            <KeyValue k="Compte du payeur" v={target?.account_number || accountNumber} />
            <KeyValue k="ID du compte" v={target?.account_id || '—'} />
            <KeyValue k="Statut" v={target?.account_status || '—'} />
          </div>

          <p className="mute-xs">
            La demande sera envoyée après validation par votre code PIN. Le payeur pourra la régler depuis son espace
            « Demandes ».
          </p>
        </aside>
      </div>
    </>
  )
}
