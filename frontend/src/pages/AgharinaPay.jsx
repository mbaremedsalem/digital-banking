import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  Wallet,
  Receipt,
  Sofa,
  RefreshCw,
  Tag,
} from 'lucide-react'
import { agharina, servicePayments } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorBanner, Field, KeyValue, Loader, Modal } from '../components/ui'
import { money, dateLong } from '../utils/format'

const UNITS = { mois: 'mois', jour: 'jour', an: 'an', forfait: 'forfait', m2: 'm²' }

const unitLabel = (u) => UNITS[u] || u || ''

/** Écran client : payer un bien immobilier Agharina depuis son compte PoolPay. */
export default function AgharinaPay() {
  const { account, refresh } = useAuth()
  const toast = useToast()

  // catalogue
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  // bien sélectionné
  const [reference, setReference] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [photo, setPhoto] = useState(0)

  // paiement
  const [payOpen, setPayOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [payError, setPayError] = useState('')
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState(null)

  // historique
  const [history, setHistory] = useState([])
  const [totals, setTotals] = useState(null)

  const loadList = async (search = query, transaction = filter) => {
    setListLoading(true)
    setListError('')
    try {
      const data = await agharina.list({ search, type_transaction: transaction })
      setResults(data.results || [])
      setCount(data.count || 0)
    } catch (err) {
      setListError(err.message)
      setResults([])
    } finally {
      setListLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const data = await servicePayments.list('agharina')
      setHistory(data.payments || [])
      setTotals(data.totals || null)
    } catch {
      /* l'historique n'est pas bloquant */
    }
  }

  useEffect(() => {
    loadList()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le devis est recalculé par le backend à chaque changement de période.
  const loadDetail = async (ref, qty = 1) => {
    setDetailLoading(true)
    setDetailError('')
    try {
      const data = await agharina.detail(ref, qty)
      setDetail(data)
      setReference(ref)
      setPhoto(0)
    } catch (err) {
      setDetailError(err.message)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const changeQuantity = async (next) => {
    const qty = Math.max(1, Math.min(120, next))
    setQuantity(qty)
    if (reference) {
      try {
        const data = await agharina.detail(reference, qty)
        setDetail(data)
      } catch (err) {
        setDetailError(err.message)
      }
    }
  }

  const bien = detail?.bien
  const quote = detail?.quote
  const isRental = bien?.type_transaction === 'location'

  const photos = useMemo(() => (bien?.medias || []).map((m) => m.fichier).filter(Boolean), [bien])

  const pay = async (e) => {
    e?.preventDefault()
    setPayError('')
    setPaying(true)
    try {
      const data = await agharina.pay(reference, password, quantity)
      setPayOpen(false)
      setPassword('')
      setReceipt(data.payment)
      toast.success(data.detail || 'Paiement effectué')
      await Promise.all([refresh(), loadHistory()])
      // On recharge le devis pour refléter le nouveau solde.
      loadDetail(reference, quantity)
    } catch (err) {
      setPayError(err.message)
      setPassword('')
    } finally {
      setPaying(false)
    }
  }

  const balance = Number(account?.account_balance || 0)
  const total = Number(quote?.total || 0)
  const insufficient = total > balance

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Paiement Agharina</h1>
          <p>Payez un loyer ou l’achat d’un bien immobilier directement depuis votre compte PoolPay.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => loadList()}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {/* ---------------------------------------------------- recherche */}
      <form
        className="card card-pad stack"
        style={{ marginBottom: 18 }}
        onSubmit={(e) => {
          e.preventDefault()
          loadList()
        }}
      >
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="input-group grow" style={{ minWidth: 220 }}>
            <Search size={17} />
            <input
              className="input"
              placeholder="Référence (AGH-APP-…), ville, quartier…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 150 }}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              loadList(query, e.target.value)
            }}
          >
            <option value="">Tous les biens</option>
            <option value="location">Location</option>
            <option value="vente">Vente</option>
          </select>
          <button className="btn btn-primary" type="submit">
            Rechercher
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              const ref = query.trim().toUpperCase()
              if (ref) loadDetail(ref, 1)
            }}
            disabled={!query.trim()}
          >
            Ouvrir par référence
          </button>
        </div>
        <ErrorBanner>{listError}</ErrorBanner>
        {!listError && <p className="mute-xs">{count} bien(s) disponibles chez Agharina.</p>}
      </form>

      {/* ---------------------------------------------------- catalogue */}
      {!detail && (
        <>
          {listLoading && <Loader full label="Chargement du catalogue…" />}

          {!listLoading && results.length === 0 && (
            <div className="card">
              <EmptyState icon={Building2} title="Aucun bien trouvé" text="Modifiez votre recherche ou vos filtres." />
            </div>
          )}

          {!listLoading && results.length > 0 && (
            <div className="bien-grid">
              {results.map((b) => (
                <article
                  key={b.reference}
                  className="bien-card"
                  onClick={() => {
                    setQuantity(1)
                    loadDetail(b.reference, 1)
                  }}
                >
                  {b.photo_principale ? (
                    <img className="bien-thumb" src={b.photo_principale} alt={b.titre} loading="lazy" />
                  ) : (
                    <div className="bien-thumb center">
                      <Building2 size={28} color="var(--text-mute)" />
                    </div>
                  )}
                  <div className="bien-body">
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge ${b.type_transaction === 'vente' ? 'badge-brand' : 'badge-warning'}`}>
                        {b.type_transaction}
                      </span>
                      <span className="badge">{b.type_bien}</span>
                    </div>
                    <div className="bien-title">{b.titre}</div>
                    <div className="mute-xs row" style={{ gap: 5 }}>
                      <MapPin size={12} /> {[b.quartier, b.ville].filter(Boolean).join(', ') || '—'}
                    </div>
                    <div className="mute-xs row" style={{ gap: 10 }}>
                      {b.nb_chambres != null && (
                        <span className="row" style={{ gap: 4 }}>
                          <BedDouble size={12} /> {b.nb_chambres}
                        </span>
                      )}
                      {b.nb_salles_bain != null && (
                        <span className="row" style={{ gap: 4 }}>
                          <Bath size={12} /> {b.nb_salles_bain}
                        </span>
                      )}
                    </div>
                    <div className="bien-price" style={{ marginTop: 'auto' }}>
                      {money(b.prix)} <small>/ {unitLabel(b.unite_prix)}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {detailLoading && <Loader full label="Chargement du bien…" />}
      <ErrorBanner>{detailError}</ErrorBanner>

      {/* ------------------------------------------------- bien + devis */}
      {detail && bien && !detailLoading && (
        <>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 14 }}
            onClick={() => {
              setDetail(null)
              setReference('')
              setQuantity(1)
            }}
          >
            <ArrowLeft size={15} /> Retour au catalogue
          </button>

          <div className="grid grid-2">
            <div className="stack">
              {photos.length > 0 ? (
                <>
                  <img className="gallery-main" src={photos[photo]} alt={bien.titre} />
                  {photos.length > 1 && (
                    <div className="gallery-strip">
                      {photos.map((src, i) => (
                        <img
                          key={src}
                          src={src}
                          alt={`Photo ${i + 1}`}
                          className={i === photo ? 'active' : ''}
                          onClick={() => setPhoto(i)}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="card center" style={{ aspectRatio: '16 / 10' }}>
                  <Building2 size={40} color="var(--text-mute)" />
                </div>
              )}

              <div className="card card-pad stack">
                <div className="row wrap" style={{ gap: 7 }}>
                  <span className={`badge ${bien.type_transaction === 'vente' ? 'badge-brand' : 'badge-warning'}`}>
                    <Tag size={12} /> {bien.type_transaction}
                  </span>
                  <span className="badge">{bien.type_bien}</span>
                  {bien.meuble && <span className="badge badge-success">Meublé</span>}
                  {bien.vendu && <span className="badge badge-danger">Vendu</span>}
                  <span className="badge mono">{bien.reference}</span>
                </div>

                <h2>{bien.titre}</h2>
                <p className="muted row" style={{ gap: 6 }}>
                  <MapPin size={15} /> {bien.adresse_complete || '—'}
                </p>

                <div className="row wrap" style={{ gap: 16, marginTop: 4 }}>
                  <span className="row" style={{ gap: 6 }}>
                    <BedDouble size={16} /> {bien.nb_chambres ?? '—'} chambre(s)
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <Bath size={16} /> {bien.nb_salles_bain ?? '—'} SDB
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <Layers size={16} /> {bien.nb_etages ?? '—'} étage(s)
                  </span>
                </div>

                {bien.equipements?.length > 0 && (
                  <div className="row wrap" style={{ gap: 7 }}>
                    {bien.equipements.map((e) => (
                      <span className="badge" key={e.id}>
                        <Sofa size={12} /> {e.nom}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------ récapitulatif */}
            <aside className="stack">
              <div className="card card-pad stack">
                <div className="row-between">
                  <span className="mute-xs">Prix affiché par Agharina</span>
                  <span className="badge badge-brand">{unitLabel(bien.unite_prix)}</span>
                </div>
                <div className="mono" style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  {money(bien.prix)}
                  <span style={{ fontSize: '.9rem', color: 'var(--text-mute)', fontWeight: 600 }}>
                    {' '}
                    / {unitLabel(bien.unite_prix)}
                  </span>
                </div>

                {isRental ? (
                  <Field label={`Nombre de ${unitLabel(bien.unite_prix)}(s) à payer`}>
                    <div className="qty">
                      <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1}>
                        −
                      </button>
                      <input
                        className="input mono"
                        type="number"
                        min="1"
                        max="120"
                        value={quantity}
                        onChange={(e) => changeQuantity(Number(e.target.value) || 1)}
                      />
                      <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= 120}>
                        +
                      </button>
                    </div>
                  </Field>
                ) : (
                  <p className="mute-xs">Une vente se règle en une seule fois (forfait).</p>
                )}

                <div>
                  <div className="total-line">
                    <span className="muted">
                      Montant{isRental ? ` (${quantity} × ${money(quote?.unit_price)})` : ''}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {money(quote?.amount)}
                    </span>
                  </div>
                  <div className="total-line">
                    <span className="tax">Taxe de service ({quote?.tax_percent} %)</span>
                    <span className="mono tax">+ {money(quote?.tax_amount)}</span>
                  </div>
                  <div className="total-line grand">
                    <span>Total à débiter</span>
                    <span className="mono">{money(quote?.total)}</span>
                  </div>
                </div>

                <div className="row-between" style={{ fontSize: '.86rem' }}>
                  <span className="muted row" style={{ gap: 6 }}>
                    <Wallet size={14} /> Votre solde
                  </span>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {money(balance)}
                  </span>
                </div>
                <div className="row-between" style={{ fontSize: '.86rem' }}>
                  <span className="muted">Solde après paiement</span>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {money(Math.max(balance - total, 0))}
                  </span>
                </div>

                {insufficient && <ErrorBanner>Solde insuffisant pour ce paiement.</ErrorBanner>}

                <button
                  className="btn btn-primary btn-block"
                  disabled={insufficient || !bien.actif || (bien.type_transaction === 'vente' && bien.vendu)}
                  onClick={() => {
                    setPayError('')
                    setPayOpen(true)
                  }}
                >
                  <Lock size={16} /> Payer {money(quote?.total)}
                </button>

                <p className="mute-xs">
                  Le montant est recalculé par le serveur auprès d’Agharina au moment du paiement. Votre mot de passe
                  vous sera demandé pour confirmer.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* --------------------------------------------------- historique */}
      <h2 style={{ margin: '28px 0 14px' }}>Mes paiements Agharina</h2>

      {totals && Number(totals.count) > 0 && (
        <div className="grid grid-3" style={{ gap: 12, marginBottom: 14 }}>
          <div className="card stat">
            <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <Receipt size={20} />
            </span>
            <div>
              <div className="stat-value mono">{money(totals.amount)}</div>
              <div className="stat-label">Total payé aux biens</div>
            </div>
          </div>
          <div className="card stat">
            <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <Tag size={20} />
            </span>
            <div>
              <div className="stat-value mono">{money(totals.tax)}</div>
              <div className="stat-label">Total des taxes de service</div>
            </div>
          </div>
          <div className="card stat">
            <span className="stat-icon" style={{ background: 'var(--surface-3)', color: 'var(--text-soft)' }}>
              <Wallet size={20} />
            </span>
            <div>
              <div className="stat-value mono">{money(totals.total)}</div>
              <div className="stat-label">Total débité ({totals.count} paiement(s))</div>
            </div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title="Aucun paiement" text="Vos paiements immobiliers apparaîtront ici." />
        </div>
      ) : (
        <div className="grid grid-2">
          {history.map((p) => (
            <article className="card card-pad stack" key={p.payment_id}>
              <div className="row-between">
                <div>
                  <div style={{ fontWeight: 700 }}>{p.label}</div>
                  <div className="mute-xs mono">{p.reference}</div>
                </div>
                <span className="badge badge-success">
                  <Check size={12} /> Payé
                </span>
              </div>

              <div className="row wrap" style={{ gap: 6 }}>
                <span className="badge">{p.type_bien}</span>
                <span className={`badge ${p.type_transaction === 'vente' ? 'badge-brand' : 'badge-warning'}`}>
                  {p.type_transaction}
                </span>
                {p.quantity > 1 && (
                  <span className="badge">
                    {p.quantity} × {unitLabel(p.unite_prix)}
                  </span>
                )}
              </div>

              <div>
                <div className="total-line">
                  <span className="muted">Montant du bien</span>
                  <span className="mono">{money(p.amount)}</span>
                </div>
                <div className="total-line">
                  <span className="tax">Taxe de service ({p.tax_percent} %)</span>
                  <span className="mono tax">{money(p.tax_amount)}</span>
                </div>
                <div className="total-line grand">
                  <span>Total débité</span>
                  <span className="mono">{money(p.total)}</span>
                </div>
              </div>

              <KeyValue k="Référence paiement" v={<span className="mono">{p.payment_id}</span>} />
              <KeyValue k="Transaction" v={<span className="mono">{p.transaction_id || '—'}</span>} />
              <KeyValue k="Transaction taxe" v={<span className="mono">{p.tax_transaction_id || '—'}</span>} />
              <KeyValue k="Date" v={dateLong(p.date)} />
            </article>
          ))}
        </div>
      )}

      {/* ------------------------------------------------ modal paiement */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Confirmer le paiement"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPayOpen(false)} disabled={paying}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={pay} disabled={paying || !password}>
              {paying ? <span className="spinner" /> : <Check size={16} />} Payer {money(quote?.total)}
            </button>
          </>
        }
      >
        <form className="stack" onSubmit={pay}>
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
            <KeyValue k="Bien" v={bien?.titre} />
            <KeyValue k="Référence" v={<span className="mono">{bien?.reference}</span>} />
            <KeyValue k="Type" v={`${bien?.type_bien} · ${bien?.type_transaction}`} />
            <KeyValue
              k="Montant"
              v={`${money(quote?.amount)}${isRental ? ` (${quantity} ${unitLabel(bien?.unite_prix)})` : ''}`}
            />
            <KeyValue k={`Taxe de service (${quote?.tax_percent} %)`} v={money(quote?.tax_amount)} />
            <KeyValue k="Total débité" v={<strong>{money(quote?.total)}</strong>} />
          </div>

          <ErrorBanner>{payError}</ErrorBanner>

          <Field label="Votre mot de passe">
            <div className="input-group">
              <Lock size={17} />
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <button type="button" className="input-suffix" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
        </form>
      </Modal>

      {/* -------------------------------------------------- modal reçu */}
      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Paiement effectué"
        footer={
          <button className="btn btn-primary" onClick={() => setReceipt(null)}>
            Terminer
          </button>
        }
      >
        <div className="stack" style={{ textAlign: 'center' }}>
          <div className="success-ring">
            <Check size={38} strokeWidth={3} />
          </div>
          <h3>{receipt?.label}</h3>
          <p className="muted">Paiement {receipt?.payment_id} enregistré.</p>
          <div style={{ textAlign: 'left' }}>
            <div className="total-line">
              <span className="muted">Montant versé à Agharina</span>
              <span className="mono">{money(receipt?.amount)}</span>
            </div>
            <div className="total-line">
              <span className="tax">Taxe de service ({receipt?.tax_percent} %)</span>
              <span className="mono tax">{money(receipt?.tax_amount)}</span>
            </div>
            <div className="total-line grand">
              <span>Total débité</span>
              <span className="mono">{money(receipt?.total)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
