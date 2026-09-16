import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, HandCoins, Copy, Printer } from 'lucide-react'
import { transactions as txApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, KeyValue, Loader } from '../components/ui'
import { money, dateLong, statusClass, statusLabel, copy } from '../utils/format'

export default function TransactionDetail() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [tx, setTx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    txApi
      .detail(transactionId)
      .then((d) => alive && setTx(d))
      .catch((err) => alive && setError(err.status === 404 ? 'Transaction introuvable.' : err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [transactionId])

  if (loading) return <Loader full label="Chargement de la transaction…" />

  if (error) {
    return (
      <>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
          <ArrowLeft size={15} /> Retour
        </button>
        <ErrorBanner>{error}</ErrorBanner>
      </>
    )
  }

  const isRequest = tx.transaction_type === 'request'
  const outgoing = tx.sender === user?.id
  const Icon = isRequest ? HandCoins : outgoing ? ArrowUpRight : ArrowDownLeft
  const tone = isRequest ? 'tx-req' : outgoing ? 'tx-out' : 'tx-in'

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Retour
          </button>
          <h1>Détail de la transaction</h1>
          <p className="mono">{tx.transaction_id}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() =>
              copy(tx.transaction_id)
                .then(() => toast.success('Référence copiée'))
                .catch(() => toast.error('Impossible de copier'))
            }
          >
            <Copy size={16} /> Copier la référence
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-pad stack" style={{ textAlign: 'center' }}>
          <span className={`tx-icon ${tone}`} style={{ width: 60, height: 60, margin: '0 auto', borderRadius: 18 }}>
            <Icon size={28} />
          </span>
          <div>
            <div className="mute-xs">{isRequest ? 'Demande de paiement' : outgoing ? 'Transfert envoyé' : 'Transfert reçu'}</div>
            <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {money(tx.amount)}
            </div>
            <span className={statusClass(tx.status)}>{statusLabel(tx.status)}</span>
          </div>
          <p className="muted">{tx.description || 'Aucune description'}</p>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 10 }}>Informations</h3>
          <KeyValue k="Référence" v={<span className="mono">{tx.transaction_id}</span>} />
          <KeyValue k="Type" v={tx.transaction_type} />
          <KeyValue k="Statut" v={<span className={statusClass(tx.status)}>{statusLabel(tx.status)}</span>} />
          <KeyValue k="Montant" v={money(tx.amount)} />
          <KeyValue k="Émetteur" v={tx.sender_username || '—'} />
          <KeyValue k="Compte émetteur" v={tx.sender_account_number || '—'} />
          <KeyValue k="Bénéficiaire" v={tx.reciever_username || '—'} />
          <KeyValue k="Compte bénéficiaire" v={tx.reciever_account_number || '—'} />
          <KeyValue k="Créée le" v={dateLong(tx.date)} />
          {tx.updated && <KeyValue k="Mise à jour" v={dateLong(tx.updated)} />}
        </div>
      </div>
    </>
  )
}
