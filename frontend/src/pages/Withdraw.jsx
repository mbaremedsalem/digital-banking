import { useEffect, useState } from 'react'
import {
  Banknote,
  Copy,
  Check,
  X,
  Clock,
  RefreshCw,
  Landmark,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'
import { withdrawals as api } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorBanner, Field, KeyValue, Loader, Modal } from '../components/ui'
import { money, dateLong, copy } from '../utils/format'

const SUGGESTIONS = [1000, 5000, 10000, 20000]

const STATUS = {
  pending: { label: 'En attente de retrait', cls: 'badge badge-warning', icon: Clock },
  completed: { label: 'Retiré', cls: 'badge badge-success', icon: Check },
  cancelled: { label: 'Annulé', cls: 'badge badge-danger', icon: X },
}

export default function Withdraw() {
  const { account, refresh } = useAuth()
  const toast = useToast()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const [toCancel, setToCancel] = useState(null)
  const [copied, setCopied] = useState('')

  const load = async () => {
    try {
      const data = await api.list()
      setList(data.withdrawals || [])
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

  const balance = Number(account?.account_balance || 0)
  const pendingTotal = list
    .filter((w) => w.status === 'pending')
    .reduce((acc, w) => acc + Number(w.amount || 0), 0)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api.create(amount, description)
      setCreated(data.withdrawal)
      setAmount('')
      setDescription('')
      await load()
      toast.success('Code de retrait généré')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await api.cancel(toCancel.code)
      toast.success('Demande annulée')
      setToCancel(null)
      await Promise.all([load(), refresh()])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const doCopy = (code) =>
    copy(code)
      .then(() => {
        setCopied(code)
        toast.success('Code copié')
        setTimeout(() => setCopied(''), 1800)
      })
      .catch(() => toast.error('Impossible de copier'))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Retrait d’espèces</h1>
          <p>Générez un code de retrait, puis présentez-le au guichet avec votre mot de passe.</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="grid grid-2">
        <form className="card card-pad stack" onSubmit={submit}>
          <div className="row" style={{ gap: 12 }}>
            <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <Banknote size={21} />
            </span>
            <div>
              <strong style={{ fontSize: '.96rem' }}>Nouvelle demande de retrait</strong>
              <p className="mute-xs">
                Disponible : {money(balance)}
                {pendingTotal > 0 ? ` · ${money(pendingTotal)} déjà réservés` : ''}
              </p>
            </div>
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <Field label="Montant à retirer">
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
            />
          </Field>

          <div className="row wrap" style={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="btn btn-sm btn-ghost" onClick={() => setAmount(String(s))}>
                {money(s)}
              </button>
            ))}
          </div>

          <Field label="Motif (optionnel)">
            <textarea
              className="textarea"
              placeholder="Retrait au guichet principal…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </Field>

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={busy || !amount || Number(amount) <= 0 || Number(amount) + pendingTotal > balance}
          >
            {busy ? <span className="spinner" /> : <KeyRound size={17} />}
            {busy ? 'Génération…' : 'Générer mon code de retrait'}
          </button>
        </form>

        <aside className="card card-pad stack">
          <h3>Comment ça marche</h3>
          {[
            { icon: KeyRound, t: 'Vous générez un code', d: 'Un code unique (WDR…) est créé pour le montant demandé. Le solde reste sur votre compte.' },
            { icon: Landmark, t: 'Vous allez au guichet', d: 'L’agent saisit votre code et vérifie le montant à remettre.' },
            { icon: ShieldCheck, t: 'Vous confirmez', d: 'Vous saisissez votre mot de passe. Le compte est débité et l’agent vous remet l’argent.' },
          ].map(({ icon: Icon, t, d }, i) => (
            <div className="row" key={t} style={{ alignItems: 'flex-start', gap: 12 }}>
              <span className="step-num" style={{ background: 'var(--brand-600)', color: '#fff', borderColor: 'transparent' }}>
                {i + 1}
              </span>
              <div>
                <strong className="row" style={{ fontSize: '.9rem', gap: 7 }}>
                  <Icon size={15} /> {t}
                </strong>
                <p className="mute-xs">{d}</p>
              </div>
            </div>
          ))}
          <p className="mute-xs">
            Tant qu’un code est en attente, son montant est réservé : vous ne pouvez pas demander plus que votre solde
            disponible.
          </p>
        </aside>
      </div>

      <h2 style={{ margin: '26px 0 14px' }}>Mes demandes</h2>

      {loading && <Loader full label="Chargement des demandes…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState icon={Banknote} title="Aucune demande de retrait" text="Générez un code pour retirer de l’argent au guichet." />
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-2">
          {list.map((w) => {
            const meta = STATUS[w.status] || STATUS.pending
            const Icon = meta.icon
            return (
              <article className="card card-pad stack" key={w.code}>
                <div className="row-between">
                  <div>
                    <div className="mute-xs">Code de retrait</div>
                    <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '.08em' }}>
                      {w.code}
                    </div>
                  </div>
                  <span className={meta.cls}>
                    <Icon size={13} /> {meta.label}
                  </span>
                </div>

                <KeyValue k="Montant" v={money(w.amount)} />
                <KeyValue k="Motif" v={w.description || '—'} />
                <KeyValue k="Demandé le" v={dateLong(w.date)} />
                {w.status === 'completed' && (
                  <>
                    <KeyValue k="Retiré le" v={dateLong(w.processed_at)} />
                    <KeyValue k="Agent" v={w.processed_by_username || '—'} />
                    <KeyValue k="Transaction" v={<span className="mono">{w.transaction_id || '—'}</span>} />
                  </>
                )}

                {w.status === 'pending' && (
                  <div className="row wrap" style={{ gap: 8 }}>
                    <button className="btn btn-ghost grow" onClick={() => doCopy(w.code)}>
                      {copied === w.code ? <Check size={16} /> : <Copy size={16} />} Copier le code
                    </button>
                    <button className="btn btn-danger" onClick={() => setToCancel(w)}>
                      <X size={16} /> Annuler
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Votre code de retrait"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreated(null)}>
              Fermer
            </button>
            <button className="btn btn-primary" onClick={() => doCopy(created?.code)}>
              <Copy size={16} /> Copier
            </button>
          </>
        }
      >
        <div className="stack" style={{ textAlign: 'center' }}>
          <div className="success-ring">
            <KeyRound size={36} />
          </div>
          <div
            className="mono"
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '.12em',
              fontFamily: 'var(--font-display)',
            }}
          >
            {created?.code}
          </div>
          <p className="muted">
            Présentez ce code au guichet pour retirer <strong>{money(created?.amount)}</strong>. Votre mot de passe
            vous sera demandé au moment de la remise.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="Annuler cette demande ?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setToCancel(null)} disabled={busy}>
              Retour
            </button>
            <button className="btn btn-danger" onClick={cancel} disabled={busy}>
              {busy ? <span className="spinner" /> : <X size={16} />} Annuler la demande
            </button>
          </>
        }
      >
        <p className="muted">
          Le code {toCancel?.code} ({money(toCancel?.amount)}) ne sera plus utilisable au guichet.
        </p>
      </Modal>
    </>
  )
}
