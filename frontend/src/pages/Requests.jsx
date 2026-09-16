import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, Trash2, CheckCircle2, Inbox, RefreshCw, Send } from 'lucide-react'
import { transactions as txApi, paymentRequests } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, Loader, Modal, KeyValue } from '../components/ui'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

export default function Requests() {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('received')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setData(await txApi.list())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cote backend, celui qui demande l'argent est le "sender" de la transaction.
  const received = useMemo(() => data?.request_reciever_transactions || [], [data])
  const sent = useMemo(() => data?.request_sender_transactions || [], [data])
  const list = tab === 'received' ? received : sent

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await paymentRequests.remove(toDelete.sender_account_number, toDelete.transaction_id)
      toast.success('Demande supprimée')
      setToDelete(null)
      await Promise.all([load(), refresh()])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Demandes de paiement</h1>
          <p>Réglez les demandes reçues et suivez celles que vous avez envoyées.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}>
            <RefreshCw size={16} /> Actualiser
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/request')}>
            <HandCoins size={16} /> Nouvelle demande
          </button>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 420, marginBottom: 18 }}>
        <button className={`tab ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
          À régler ({received.length})
        </button>
        <button className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          Envoyées ({sent.length})
        </button>
      </div>

      {loading && <Loader full label="Chargement des demandes…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Inbox}
            title={tab === 'received' ? 'Aucune demande à régler' : 'Aucune demande envoyée'}
            text={
              tab === 'received'
                ? 'Les demandes de paiement qui vous sont adressées apparaîtront ici.'
                : 'Demandez de l’argent à un autre titulaire de compte PoolPay.'
            }
            action={
              tab === 'sent' && (
                <button className="btn btn-primary" onClick={() => navigate('/request')}>
                  Créer une demande
                </button>
              )
            }
          />
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-2">
          {list.map((r) => {
            const settled = r.status === 'request_settled'
            return (
              <article className="card card-pad stack" key={r.transaction_id}>
                <div className="row-between">
                  <div className="row" style={{ gap: 12 }}>
                    <span className="tx-icon tx-req">
                      {tab === 'received' ? <HandCoins size={19} /> : <Send size={19} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }} className="mono">
                        {money(r.amount)}
                      </div>
                      <div className="mute-xs">
                        {tab === 'received'
                          ? `De ${r.sender_username || 'un utilisateur'} · ${r.sender_account_number || '—'}`
                          : `À ${r.reciever_username || 'un utilisateur'} · ${r.reciever_account_number || '—'}`}
                      </div>
                    </div>
                  </div>
                  <span className={statusClass(r.status)}>{statusLabel(r.status)}</span>
                </div>

                <KeyValue k="Motif" v={r.description || '—'} />
                <KeyValue k="Référence" v={<span className="mono">{r.transaction_id}</span>} />
                <KeyValue k="Date" v={dateLong(r.date)} />

                <div className="row wrap" style={{ gap: 8 }}>
                  {tab === 'received' && !settled && (
                    <button
                      className="btn btn-primary grow"
                      disabled={!r.sender_account_number}
                      onClick={() => navigate(`/requests/${r.sender_account_number}/${r.transaction_id}/settle`)}
                    >
                      <CheckCircle2 size={16} /> Régler
                    </button>
                  )}
                  {tab === 'received' && settled && (
                    <span className="badge badge-success">
                      <CheckCircle2 size={13} /> Réglée
                    </span>
                  )}
                  {tab === 'sent' && (
                    <button className="btn btn-danger grow" onClick={() => setToDelete(r)}>
                      <Trash2 size={16} /> Supprimer
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={() => navigate(`/transactions/${r.transaction_id}`)}>
                    Détail
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer la demande ?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setToDelete(null)} disabled={busy}>
              Annuler
            </button>
            <button className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
              {busy ? <span className="spinner" /> : <Trash2 size={16} />} Supprimer
            </button>
          </>
        }
      >
        <p className="muted">
          La demande de {money(toDelete?.amount)} (référence {toDelete?.transaction_id}) sera définitivement
          supprimée.
        </p>
      </Modal>
    </>
  )
}
