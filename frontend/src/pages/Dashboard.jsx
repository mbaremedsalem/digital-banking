import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  HandCoins,
  CreditCard,
  Receipt,
  Copy,
  Check,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Banknote,
  Building2,
} from 'lucide-react'
import { transactions as txApi, cards as cardsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, Skeleton } from '../components/ui'
import TransactionItem from '../components/TransactionItem'
import { money, copy, maskCard } from '../utils/format'

const QUICK = [
  { to: '/transfer', label: 'Transférer', icon: ArrowLeftRight },
  { to: '/request', label: 'Demander', icon: HandCoins },
  { to: '/withdraw', label: 'Retrait espèces', icon: Banknote },
  { to: '/agharina', label: 'Paiement Agharina', icon: Building2 },
]

export default function Dashboard() {
  const { user, account, displayName, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tx, cardData] = await Promise.all([txApi.list(), cardsApi.list()])
      setData(tx)
      setCards(cardData.credit_cards || [])
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

  const stats = useMemo(() => {
    if (!data) return { sent: 0, received: 0, pendingRequests: 0 }
    const sum = (list) =>
      (list || []).filter((t) => t.status === 'completed').reduce((acc, t) => acc + Number(t.amount || 0), 0)
    return {
      sent: sum(data.sender_transactions),
      received: sum(data.reciever_transactions),
      pendingRequests: (data.request_reciever_transactions || []).filter((t) => t.status === 'request_sent').length,
    }
  }, [data])

  const recent = useMemo(() => {
    if (!data) return []
    return [
      ...(data.sender_transactions || []),
      ...(data.reciever_transactions || []),
      ...(data.withdraw_transactions || []),
      ...(data.service_transactions || []),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6)
  }, [data])

  const onCopy = async () => {
    try {
      await copy(account?.account_number)
      setCopied(true)
      toast.success('Numéro de compte copié')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  const reload = async () => {
    await Promise.all([refresh(), load()])
    toast.info('Données actualisées')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour, {displayName?.split(' ')[0] || 'bienvenue'} 👋</h1>
          <p>Voici l’état de votre compte aujourd’hui.</p>
        </div>
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {account && !account.kyc_confirmed && (
        <div className="card card-pad row" style={{ marginBottom: 18, gap: 14, borderColor: 'var(--warning)' }}>
          <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <ShieldAlert size={22} />
          </span>
          <div className="grow">
            <strong style={{ fontSize: '.95rem' }}>Vérification KYC en attente</strong>
            <p className="mute-xs">
              Votre compte est « {account.account_status} ». Certaines opérations peuvent être limitées tant que le KYC
              n’est pas validé par un administrateur.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <section className="balance-card">
          <div className="row-between">
            <span className="balance-label">Solde disponible</span>
            <button className="btn-icon" style={{ color: 'rgba(255,255,255,.85)' }} onClick={() => setHidden((h) => !h)}>
              {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="balance-amount mono">{hidden ? '••••••' : money(account?.account_balance)}</div>

          <div className="balance-meta">
            <button className="acct-pill" onClick={onCopy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {account?.account_number || '—'}
            </button>
            <span className="acct-pill" style={{ cursor: 'default' }}>
              ID {account?.account_id || '—'}
            </span>
          </div>

          <div className="row" style={{ marginTop: 20, gap: 10 }}>
            <button className="btn" style={{ background: '#fff', color: 'var(--brand-700)' }} onClick={() => navigate('/transfer')}>
              <ArrowLeftRight size={16} /> Transférer
            </button>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}
              onClick={() => navigate('/request')}
            >
              <HandCoins size={16} /> Demander
            </button>
          </div>
        </section>

        <section className="stack">
          <div className="quick-grid">
            {QUICK.map(({ to, label, icon: Icon }) => (
              <button key={to} className="quick" onClick={() => navigate(to)}>
                <span className="quick-icon">
                  <Icon size={21} />
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-3" style={{ gap: 12 }}>
            <StatTile
              icon={TrendingUp}
              tone="success"
              label="Total reçu"
              value={loading ? null : money(stats.received)}
            />
            <StatTile icon={TrendingDown} tone="brand" label="Total envoyé" value={loading ? null : money(stats.sent)} />
            <StatTile
              icon={Receipt}
              tone="warning"
              label="Demandes à régler"
              value={loading ? null : String(stats.pendingRequests)}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Transactions récentes</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/transactions')}>
              Tout voir <ArrowRight size={14} />
            </button>
          </div>

          {loading && (
            <div className="stack card-pad">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={44} />
              ))}
            </div>
          )}

          {!loading && recent.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="Aucune transaction"
              text="Vos virements apparaîtront ici dès votre premier envoi."
              action={
                <button className="btn btn-primary" onClick={() => navigate('/transfer')}>
                  Faire un transfert
                </button>
              }
            />
          )}

          {!loading && recent.map((tx) => <TransactionItem key={tx.transaction_id} tx={tx} userId={user?.id} />)}
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Mes cartes</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/cards')}>
              Gérer <ArrowRight size={14} />
            </button>
          </div>

          <div className="card-pad stack">
            {loading && <Skeleton h={180} />}

            {!loading && cards.length === 0 && (
              <EmptyState icon={CreditCard} title="Aucune carte" text="Ajoutez une carte depuis l’espace administrateur." />
            )}

            {!loading &&
              cards.slice(0, 1).map((c) => (
                <div key={c.card_id} className={`cc cc-${c.card_type}`} onClick={() => navigate(`/cards/${c.card_id}`)}>
                  <div className="cc-amount">
                    <div className="cc-label">Solde carte</div>
                    <div className="cc-value">{money(c.amount)}</div>
                  </div>
                  <div className="cc-chip" />
                  <div>
                    <div className="cc-number mono">{maskCard(c.number)}</div>
                    <div className="cc-foot" style={{ marginTop: 14 }}>
                      <div>
                        <div className="cc-label">Titulaire</div>
                        <div className="cc-value">{c.name}</div>
                      </div>
                      <div>
                        <div className="cc-label">Exp.</div>
                        <div className="cc-value">
                          {String(c.month).padStart(2, '0')}/{String(c.year).slice(-2)}
                        </div>
                      </div>
                      <span className="cc-brand">{c.card_type}</span>
                    </div>
                  </div>
                </div>
              ))}

            {!loading && cards.length > 1 && (
              <p className="mute-xs center">+ {cards.length - 1} autre(s) carte(s)</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    success: { background: 'var(--success-bg)', color: 'var(--success)' },
    brand: { background: 'var(--brand-50)', color: 'var(--brand-600)' },
    warning: { background: 'var(--warning-bg)', color: 'var(--warning)' },
  }
  return (
    <div className="card stat">
      <span className="stat-icon" style={tones[tone]}>
        <Icon size={21} />
      </span>
      <div style={{ minWidth: 0 }}>
        {value === null ? <Skeleton h={22} w={90} /> : <div className="stat-value mono">{value}</div>}
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
