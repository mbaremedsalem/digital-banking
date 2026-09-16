import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Wallet } from 'lucide-react'
import { transfers } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { Field, ErrorBanner, Loader, Stepper, KeyValue } from '../components/ui'
import { TRANSFER_STEPS } from './Transfer'
import { money } from '../utils/format'

const SUGGESTIONS = [500, 1000, 2500, 5000]

export default function TransferAmount() {
  const { accountNumber } = useParams()
  const navigate = useNavigate()
  const { account: myAccount } = useAuth()

  const [target, setTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    transfers
      .getAccount(accountNumber)
      .then((data) => alive && setTarget(data.account))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [accountNumber])

  const balance = Number(myAccount?.account_balance || 0)
  const value = Number(amount || 0)
  const insufficient = value > balance

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await transfers.create(accountNumber, amount, description)
      navigate(`/transfer/${accountNumber}/${data.transaction_id}/confirm`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement du compte bénéficiaire…" />

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transfer')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Changer de bénéficiaire
          </button>
          <h1>Montant à envoyer</h1>
          <p>Vers le compte {accountNumber}.</p>
        </div>
      </div>

      <Stepper steps={TRANSFER_STEPS} current={1} />

      <div className="grid grid-2">
        <form className="card card-pad stack" onSubmit={submit}>
          <ErrorBanner>{error}</ErrorBanner>

          <Field
            label="Montant"
            error={insufficient ? `Solde insuffisant (disponible : ${money(balance)})` : ''}
          >
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

          <div className="row wrap" style={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="btn btn-sm btn-ghost" onClick={() => setAmount(String(s))}>
                {money(s)}
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAmount(String(balance))}>
              Tout
            </button>
          </div>

          <Field label="Description (optionnel)">
            <textarea
              className="textarea"
              placeholder="Motif du virement, référence…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </Field>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !amount || value <= 0 || insufficient}>
            {busy ? <span className="spinner" /> : <ArrowRight size={17} />}
            {busy ? 'Création…' : 'Continuer'}
          </button>
        </form>

        <aside className="stack">
          <div className="card card-pad">
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                <Wallet size={21} />
              </span>
              <div>
                <div className="stat-label">Votre solde</div>
                <div className="stat-value mono">{money(balance)}</div>
              </div>
            </div>

            <KeyValue k="Compte bénéficiaire" v={target?.account_number || accountNumber} />
            <KeyValue k="ID du compte" v={target?.account_id || '—'} />
            <KeyValue k="Statut" v={target?.account_status || '—'} />
            <KeyValue k="KYC vérifié" v={target?.kyc_confirmed ? 'Oui' : 'Non'} />
            <KeyValue k="Montant saisi" v={money(value)} />
            <KeyValue k="Solde après envoi" v={money(Math.max(balance - value, 0))} />
          </div>

          <p className="mute-xs">
            Le virement est créé au statut « en cours » puis débité seulement après la saisie de votre code PIN à
            l’étape suivante.
          </p>
        </aside>
      </div>
    </>
  )
}
