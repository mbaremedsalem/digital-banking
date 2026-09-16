import { useState } from 'react'
import {
  Bell,
  BellRing,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  HandCoins,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState } from '../components/ui'
import { money, dateLong } from '../utils/format'

const ICONS = {
  'Credit Alert': { icon: ArrowDownLeft, tone: 'tx-in' },
  'Debit Alert': { icon: ArrowUpRight, tone: 'tx-out' },
  Transfer: { icon: ArrowUpRight, tone: 'tx-out' },
  'Sent Payment Request': { icon: HandCoins, tone: 'tx-req' },
  'Recieved Payment Request': { icon: HandCoins, tone: 'tx-req' },
  'Received Payment Request': { icon: HandCoins, tone: 'tx-req' },
  'Funded Credit Card': { icon: CreditCard, tone: 'tx-out' },
  'Withdrew Credit Card Funds': { icon: CreditCard, tone: 'tx-in' },
  'Added Credit Card': { icon: CreditCard, tone: 'tx-out' },
  'Deleted Credit Card': { icon: Trash2, tone: 'tx-req' },
}

export default function Notifications() {
  const { notifications, unread, refresh } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setBusy(true)
    await refresh()
    setBusy(false)
    toast.info('Notifications actualisées')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>
            {notifications.length} notification{notifications.length > 1 ? 's' : ''} · {unread} non lue
            {unread > 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={reload} disabled={busy}>
          {busy ? <span className="spinner" /> : <RefreshCw size={16} />} Actualiser
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            text="Vos alertes de crédit, débit et demandes de paiement s’afficheront ici."
          />
        </div>
      ) : (
        <div className="card">
          {notifications.map((n) => {
            const { icon: Icon, tone } = ICONS[n.notification_type] || { icon: BellRing, tone: 'tx-req' }
            return (
              <div className="tx" key={n.nid}>
                <span className={`tx-icon ${tone}`}>
                  <Icon size={19} />
                </span>
                <div className="tx-body">
                  <div className="tx-title">{n.notification_type}</div>
                  <div className="tx-sub">{dateLong(n.date)}</div>
                </div>
                <div className="tr">
                  <div className="tx-amount">{money(n.amount)}</div>
                  {!n.is_read && <span className="badge badge-brand">Nouveau</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mute-xs" style={{ marginTop: 14 }}>
        Les 10 dernières notifications sont renvoyées par <span className="mono">/user/me/</span>.
      </p>
    </>
  )
}
