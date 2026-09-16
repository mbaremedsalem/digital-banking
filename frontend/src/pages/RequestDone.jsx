import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Home, Receipt } from 'lucide-react'
import { paymentRequests } from '../api/endpoints'
import { KeyValue, Loader, Stepper } from '../components/ui'
import { REQUEST_STEPS } from './Request'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

export default function RequestDone() {
  const { accountNumber, transactionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    paymentRequests
      .completed(accountNumber, transactionId)
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [accountNumber, transactionId])

  if (loading) return <Loader full label="Chargement…" />

  const tx = data?.transaction
  const account = data?.account

  return (
    <>
      <Stepper steps={REQUEST_STEPS} current={3} />

      <div className="card card-pad stack" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div className="success-ring">
          <Check size={40} strokeWidth={3} />
        </div>

        <div>
          <h2>Demande envoyée</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Le compte {account?.account_number} a reçu votre demande de {money(tx?.amount)}.
          </p>
        </div>

        <div style={{ textAlign: 'left', marginTop: 8 }}>
          <KeyValue k="Référence" v={<span className="mono">{tx?.transaction_id}</span>} />
          <KeyValue k="Montant" v={money(tx?.amount)} />
          <KeyValue k="Motif" v={tx?.description || '—'} />
          <KeyValue k="Statut" v={<span className={statusClass(tx?.status)}>{statusLabel(tx?.status)}</span>} />
          <KeyValue k="Date" v={dateLong(tx?.date)} />
        </div>

        <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary grow" onClick={() => navigate('/')}>
            <Home size={16} /> Tableau de bord
          </button>
          <button className="btn btn-ghost grow" onClick={() => navigate('/requests')}>
            <Receipt size={16} /> Mes demandes
          </button>
        </div>
      </div>
    </>
  )
}
