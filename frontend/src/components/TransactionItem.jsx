import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowDownLeft, HandCoins, Clock, Banknote, Building2, Percent } from 'lucide-react'
import { money, dateLong, statusClass, statusLabel } from '../utils/format'

/**
 * Une ligne de transaction.
 * Le serializer backend ne renvoie que des identifiants (pas les noms des
 * contreparties) : on affiche donc le sens, la description et le statut.
 */
export default function TransactionItem({ tx, userId, showStatus = true }) {
  const navigate = useNavigate()

  const isRequest = tx.transaction_type === 'request'
  const isWithdraw = tx.transaction_type === 'withdraw'
  const outgoing = tx.sender === userId

  let Icon = outgoing ? ArrowUpRight : ArrowDownLeft
  let tone = outgoing ? 'tx-out' : 'tx-in'
  let title = outgoing ? 'Transfert envoyé' : 'Transfert reçu'

  if (isRequest) {
    Icon = HandCoins
    tone = 'tx-req'
    title = outgoing ? 'Demande envoyée' : 'Demande reçue'
  }

  if (isWithdraw) {
    Icon = Banknote
    tone = outgoing ? 'tx-out' : 'tx-in'
    title = outgoing ? 'Retrait espèces au guichet' : 'Espèces remises au client'
  }

  if (tx.transaction_type === 'payment') {
    Icon = Building2
    tone = 'tx-out'
    title = 'Paiement de service'
  }

  if (tx.transaction_type === 'fee') {
    Icon = Percent
    tone = 'tx-req'
    title = 'Taxe de service'
  }

  // La contrepartie n'est connue que depuis les champs ajoutes au serializer.
  const counterpart = outgoing ? tx.reciever_username : tx.sender_username
  if (counterpart && !isWithdraw) title = `${title} · ${counterpart}`

  const plus = !outgoing && !isRequest && !['payment', 'fee'].includes(tx.transaction_type)

  return (
    <div className="tx" onClick={() => navigate(`/transactions/${tx.transaction_id}`)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/transactions/${tx.transaction_id}`)}>
      <span className={`tx-icon ${tone}`}>
        <Icon size={19} />
      </span>

      <div className="tx-body">
        <div className="tx-title">{tx.description?.trim() || title}</div>
        <div className="tx-sub row" style={{ gap: 6 }}>
          <Clock size={12} />
          {dateLong(tx.date)}
        </div>
      </div>

      <div className="tr" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <span className={`tx-amount ${plus ? 'plus' : 'minus'}`}>
          {money(tx.amount, { sign: isRequest ? '' : plus ? '+' : '−' })}
        </span>
        {showStatus && <span className={statusClass(tx.status)}>{statusLabel(tx.status)}</span>}
      </div>
    </div>
  )
}
