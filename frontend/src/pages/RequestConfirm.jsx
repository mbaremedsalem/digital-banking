import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { paymentRequests } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, KeyValue, Loader, PinInput, Stepper } from '../components/ui'
import { REQUEST_STEPS } from './Request'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

export default function RequestConfirm() {
  const { accountNumber, transactionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    paymentRequests
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
      await paymentRequests.finalize(accountNumber, transactionId, pin)
      toast.success('Demande de paiement envoyée')
      navigate(`/request/${accountNumber}/${transactionId}/done`, { replace: true })
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement de la demande…" />

  const tx = data?.transaction
  const account = data?.account

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Retour
          </button>
          <h1>Confirmer la demande</h1>
          <p>Validez l’envoi avec votre code PIN.</p>
        </div>
      </div>

      <Stepper steps={REQUEST_STEPS} current={2} />

      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="center stack" style={{ gap: 4, marginBottom: 18 }}>
            <span className="mute-xs">Montant demandé</span>
            <span className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {money(tx?.amount)}
            </span>
            <span className={statusClass(tx?.status)}>{statusLabel(tx?.status)}</span>
          </div>

          <KeyValue k="Compte du payeur" v={account?.account_number} />
          <KeyValue k="Référence" v={<span className="mono">{tx?.transaction_id}</span>} />
          <KeyValue k="Motif" v={tx?.description || '—'} />
          <KeyValue k="Créée le" v={dateLong(tx?.date)} />
        </div>

        <form className="card card-pad stack" onSubmit={submit}>
          <div>
            <strong style={{ fontSize: '.96rem' }}>Code PIN à 4 chiffres</strong>
            <p className="mute-xs">Confirme que la demande vient bien de vous.</p>
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <div style={{ padding: '10px 0' }}>
            <PinInput value={pin} onChange={setPin} />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || pin.length !== 4}>
            {busy ? <span className="spinner" /> : <Send size={17} />}
            {busy ? 'Envoi…' : 'Envoyer la demande'}
          </button>

          <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/request')} disabled={busy}>
            Annuler
          </button>
        </form>
      </div>
    </>
  )
}
