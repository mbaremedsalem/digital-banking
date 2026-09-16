import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { transfers } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, KeyValue, Loader, PinInput, Stepper } from '../components/ui'
import { TRANSFER_STEPS } from './Transfer'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

export default function TransferConfirm() {
  const { accountNumber, transactionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    transfers
      .confirmation(accountNumber, transactionId)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [accountNumber, transactionId])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await transfers.process(accountNumber, transactionId, pin)
      await refresh()
      toast.success('Transfert effectué avec succès')
      navigate(`/transfer/${accountNumber}/${transactionId}/done`, { replace: true })
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement de la confirmation…" />

  const tx = data?.transaction
  const account = data?.account

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Retour
          </button>
          <h1>Confirmer le transfert</h1>
          <p>Vérifiez les informations puis saisissez votre code PIN.</p>
        </div>
      </div>

      <Stepper steps={TRANSFER_STEPS} current={2} />

      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="center stack" style={{ gap: 4, marginBottom: 18 }}>
            <span className="mute-xs">Montant du transfert</span>
            <span className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {money(tx?.amount)}
            </span>
            <span className={statusClass(tx?.status)}>{statusLabel(tx?.status)}</span>
          </div>

          <KeyValue k="Compte bénéficiaire" v={account?.account_number} />
          <KeyValue k="ID du compte" v={account?.account_id} />
          <KeyValue k="Référence" v={<span className="mono">{tx?.transaction_id}</span>} />
          <KeyValue k="Description" v={tx?.description || '—'} />
          <KeyValue k="Créé le" v={dateLong(tx?.date)} />
        </div>

        <form className="card card-pad stack" onSubmit={submit}>
          <div className="row" style={{ gap: 12 }}>
            <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <ShieldCheck size={21} />
            </span>
            <div>
              <strong style={{ fontSize: '.96rem' }}>Code PIN à 4 chiffres</strong>
              <p className="mute-xs">Le PIN figure sur votre profil, section sécurité.</p>
            </div>
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <div style={{ padding: '10px 0' }}>
            <PinInput value={pin} onChange={setPin} />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || pin.length !== 4}>
            {busy ? <span className="spinner" /> : <ShieldCheck size={17} />}
            {busy ? 'Traitement…' : `Envoyer ${money(tx?.amount)}`}
          </button>

          <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/transfer')} disabled={busy}>
            Annuler
          </button>
        </form>
      </div>
    </>
  )
}
