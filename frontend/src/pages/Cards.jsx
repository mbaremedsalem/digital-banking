import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, RefreshCw, Wallet, ArrowRight } from 'lucide-react'
import { cards as cardsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import { EmptyState, Loader } from '../components/ui'
import { money, maskCard } from '../utils/format'

export default function Cards() {
  const navigate = useNavigate()
  const toast = useToast()

  const [account, setAccount] = useState(null)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await cardsApi.list()
      setAccount(data.account)
      setList(data.credit_cards || [])
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

  const totalOnCards = list.reduce((acc, c) => acc + Number(c.amount || 0), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mes cartes</h1>
          <p>
            {list.length} carte{list.length > 1 ? 's' : ''} · {money(totalOnCards)} chargés
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="card card-pad row" style={{ marginBottom: 18, gap: 14 }}>
        <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
          <Wallet size={21} />
        </span>
        <div className="grow">
          <div className="stat-label">Solde du compte principal</div>
          <div className="stat-value mono">{money(account?.account_balance)}</div>
        </div>
        <span className="badge badge-brand">{account?.account_number}</span>
      </div>

      {loading && <Loader full label="Chargement des cartes…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState
            icon={CreditCard}
            title="Aucune carte"
            text="Les cartes sont créées depuis l’administration Django (core → Credit cards)."
          />
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-2">
          {list.map((c) => (
            <article key={c.card_id} className="stack" style={{ gap: 12 }}>
              <div className={`cc cc-${c.card_type}`} onClick={() => navigate(`/cards/${c.card_id}`)}>
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

              <div className="row-between">
                <span className={`badge ${c.card_status ? 'badge-success' : 'badge-danger'}`}>
                  {c.card_status ? 'Active' : 'Bloquée'}
                </span>
                <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/cards/${c.card_id}`)}>
                  Gérer <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
