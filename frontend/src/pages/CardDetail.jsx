import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react'
import { cards as cardsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, Field, KeyValue, Loader, Modal } from '../components/ui'
import { money, maskCard, dateLong } from '../utils/format'

export default function CardDetail() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useAuth()

  const [account, setAccount] = useState(null)
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'fund' | 'withdraw' | 'delete'
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const data = await cardsApi.detail(cardId)
      setAccount(data.account)
      setCard(data.credit_card)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId])

  const close = () => {
    setModal(null)
    setAmount('')
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (modal === 'fund') {
        const res = await cardsApi.fund(cardId, amount)
        toast.success(res?.detail || 'Carte alimentée')
      } else if (modal === 'withdraw') {
        const res = await cardsApi.withdraw(cardId, amount)
        toast.success(res?.detail || 'Retrait effectué')
      }
      close()
      await Promise.all([load(), refresh()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const res = await cardsApi.remove(cardId)
      toast.success(res?.detail || 'Carte supprimée')
      await refresh()
      navigate('/cards', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement de la carte…" />
  if (!card) return <ErrorBanner>Carte introuvable.</ErrorBanner>

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cards')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Toutes mes cartes
          </button>
          <h1>Carte {card.card_type}</h1>
          <p className="mono">{card.card_id}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="stack">
          <div className={`cc cc-${card.card_type}`} style={{ cursor: 'default' }}>
            <div className="cc-amount">
              <div className="cc-label">Solde carte</div>
              <div className="cc-value">{money(card.amount)}</div>
            </div>
            <div className="cc-chip" />
            <div>
              <div className="cc-number mono">{maskCard(card.number)}</div>
              <div className="cc-foot" style={{ marginTop: 14 }}>
                <div>
                  <div className="cc-label">Titulaire</div>
                  <div className="cc-value">{card.name}</div>
                </div>
                <div>
                  <div className="cc-label">Exp.</div>
                  <div className="cc-value">
                    {String(card.month).padStart(2, '0')}/{String(card.year).slice(-2)}
                  </div>
                </div>
                <span className="cc-brand">{card.card_type}</span>
              </div>
            </div>
          </div>

          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary grow" onClick={() => setModal('fund')}>
              <ArrowDownToLine size={16} /> Alimenter
            </button>
            <button className="btn btn-ghost grow" onClick={() => setModal('withdraw')} disabled={Number(card.amount) <= 0}>
              <ArrowUpFromLine size={16} /> Retirer
            </button>
            <button className="btn btn-danger" onClick={() => setModal('delete')}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 10 }}>Informations</h3>
          <KeyValue k="Identifiant carte" v={<span className="mono">{card.card_id}</span>} />
          <KeyValue k="Titulaire" v={card.name} />
          <KeyValue k="Type" v={card.card_type} />
          <KeyValue k="Numéro" v={<span className="mono">{maskCard(card.number)}</span>} />
          <KeyValue k="Expiration" v={`${String(card.month).padStart(2, '0')}/${card.year}`} />
          <KeyValue k="Solde chargé" v={money(card.amount)} />
          <KeyValue k="Statut" v={card.card_status ? 'Active' : 'Bloquée'} />
          <KeyValue k="Créée le" v={dateLong(card.date)} />
          <KeyValue k="Compte lié" v={account?.account_number} />
          <KeyValue k="Solde du compte" v={money(account?.account_balance)} />
        </div>
      </div>

      <Modal
        open={modal === 'fund' || modal === 'withdraw'}
        onClose={close}
        title={modal === 'fund' ? 'Alimenter la carte' : 'Retirer vers le compte'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={close} disabled={busy} type="button">
              Annuler
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={busy || !amount || Number(amount) <= 0}>
              {busy ? <span className="spinner" /> : null} Confirmer
            </button>
          </>
        }
      >
        <form className="stack" onSubmit={submit}>
          <ErrorBanner>{error}</ErrorBanner>
          <p className="muted" style={{ fontSize: '.88rem' }}>
            {modal === 'fund'
              ? `Disponible sur le compte : ${money(account?.account_balance)}`
              : `Disponible sur la carte : ${money(card.amount)}`}
          </p>
          <Field label="Montant">
            <input
              className="input mono"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={modal === 'delete'}
        onClose={close}
        title="Supprimer cette carte ?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={close} disabled={busy}>
              Annuler
            </button>
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              {busy ? <span className="spinner" /> : <Trash2 size={16} />} Supprimer
            </button>
          </>
        }
      >
        <p className="muted">
          Le solde de la carte ({money(card.amount)}) sera reversé sur votre compte principal, puis la carte sera
          définitivement supprimée.
        </p>
      </Modal>
    </>
  )
}
