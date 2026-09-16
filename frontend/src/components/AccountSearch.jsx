import { useEffect, useState } from 'react'
import { Search, UserRound, ArrowRight, SearchX } from 'lucide-react'
import { EmptyState, ErrorBanner } from './ui'
import { useAuth } from '../context/AuthContext'
import { money, initials } from '../utils/format'

/**
 * Etape 1 des parcours "transférer" et "demander" :
 * recherche d'un compte par numéro de compte ou account_id.
 *
 * @param {(accountNumber: string) => void} onSelect
 * @param {(query: string) => Promise} searchFn  endpoint a appeler
 */
export default function AccountSearch({ onSelect, searchFn, initialQuery = '', cta = 'Continuer' }) {
  const { account: myAccount } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (value) => {
    const q = (value ?? query).trim()
    if (!q) return
    setError('')
    setBusy(true)
    try {
      const data = await searchFn(q)
      setResults(data.accounts || [])
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  // Recherche automatique quand la page est ouverte depuis la barre de recherche.
  useEffect(() => {
    if (initialQuery) run(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  return (
    <div className="stack">
      <form
        className="card card-pad stack"
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
      >
        <ErrorBanner>{error}</ErrorBanner>

        <div className="row wrap" style={{ gap: 10 }}>
          <div className="input-group grow" style={{ minWidth: 220 }}>
            <Search size={17} />
            <input
              className="input"
              placeholder="Numéro de compte (ex. 2171234567) ou ID compte"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <button className="btn btn-primary" disabled={busy || !query.trim()} type="submit">
            {busy ? <span className="spinner" /> : <Search size={16} />}
            Rechercher
          </button>
        </div>
        <p className="mute-xs">
          Votre propre compte : <strong>{myAccount?.account_number}</strong> — vous ne pouvez pas vous l’envoyer à
          vous-même.
        </p>
      </form>

      {results && results.length === 0 && !busy && (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="Aucun compte trouvé"
            text="Vérifiez le numéro de compte ou l’identifiant saisi."
          />
        </div>
      )}

      {results && results.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <span className="mute-xs">
            {results.length} compte{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
          </span>

          {results.map((acc) => {
            const mine = acc.account_number === myAccount?.account_number
            return (
              <div className="result-row" key={acc.id}>
                <span className="avatar">{initials(acc.account_number?.slice(-2) || 'PP')}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    Compte {acc.account_number} {mine && <span className="badge badge-brand">Vous</span>}
                  </div>
                  <div className="mute-xs">
                    ID {acc.account_id} · statut {acc.account_status}
                    {acc.kyc_confirmed ? ' · KYC vérifié' : ''}
                  </div>
                </div>
                <div className="hide-sm tr">
                  <div className="mute-xs">Solde</div>
                  <div style={{ fontWeight: 600 }}>{money(acc.account_balance)}</div>
                </div>
                <button className="btn btn-primary btn-sm" disabled={mine} onClick={() => onSelect(acc.account_number)}>
                  {cta} <ArrowRight size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!results && !busy && (
        <div className="card">
          <EmptyState
            icon={UserRound}
            title="Recherchez un bénéficiaire"
            text="Saisissez le numéro de compte PoolPay du destinataire pour démarrer."
          />
        </div>
      )}
    </div>
  )
}
