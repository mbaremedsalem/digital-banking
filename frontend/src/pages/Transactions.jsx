import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Wallet, Download } from 'lucide-react'
import { transactions as txApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, Loader } from '../components/ui'
import TransactionItem from '../components/TransactionItem'
import { dayLabel, money } from '../utils/format'

const TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'sent', label: 'Envoyés' },
  { key: 'received', label: 'Reçus' },
  { key: 'requests', label: 'Demandes' },
  { key: 'withdrawals', label: 'Retraits' },
  { key: 'services', label: 'Paiements' },
]

export default function Transactions() {
  const { user } = useAuth()
  const toast = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

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

  const list = useMemo(() => {
    if (!data) return []
    const sets = {
      all: [
        ...(data.sender_transactions || []),
        ...(data.reciever_transactions || []),
        ...(data.request_sender_transactions || []),
        ...(data.request_reciever_transactions || []),
        ...(data.withdraw_transactions || []),
        ...(data.service_transactions || []),
      ],
      sent: data.sender_transactions || [],
      received: data.reciever_transactions || [],
      requests: [...(data.request_sender_transactions || []), ...(data.request_reciever_transactions || [])],
      withdrawals: data.withdraw_transactions || [],
      services: data.service_transactions || [],
    }
    const q = query.trim().toLowerCase()
    return sets[tab]
      .filter(
        (t) =>
          !q ||
          t.transaction_id?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          String(t.amount).includes(q),
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [data, tab, query])

  const grouped = useMemo(() => {
    const map = new Map()
    list.forEach((t) => {
      const key = dayLabel(t.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    })
    return [...map.entries()]
  }, [list])

  const total = useMemo(() => list.reduce((acc, t) => acc + Number(t.amount || 0), 0), [list])

  const exportCsv = () => {
    const header = 'reference,date,type,statut,montant,description\n'
    const rows = list
      .map((t) =>
        [t.transaction_id, t.date, t.transaction_type, t.status, t.amount, `"${(t.description || '').replace(/"/g, "'")}"`].join(','),
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p>
            {list.length} opération{list.length > 1 ? 's' : ''} · volume {money(total)}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportCsv} disabled={list.length === 0}>
            <Download size={16} /> Exporter
          </button>
          <button className="btn btn-ghost" onClick={load}>
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 12, marginBottom: 18 }}>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="input-group grow" style={{ maxWidth: 320 }}>
          <Search size={17} />
          <input
            className="input"
            placeholder="Rechercher (référence, montant, description)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && <Loader full label="Chargement des transactions…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState icon={Wallet} title="Aucune transaction" text="Aucune opération ne correspond à ce filtre." />
        </div>
      )}

      {!loading &&
        grouped.map(([day, items]) => (
          <section key={day} style={{ marginBottom: 18 }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="mute-xs" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {day}
              </span>
              <span className="mute-xs">{items.length} opération(s)</span>
            </div>
            <div className="card">
              {items.map((tx) => (
                <TransactionItem key={tx.transaction_id} tx={tx} userId={user?.id} />
              ))}
            </div>
          </section>
        ))}
    </>
  )
}
