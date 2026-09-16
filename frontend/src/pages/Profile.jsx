import { useEffect, useState } from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Save,
  X,
  KeyRound,
  Lock,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { KeyValue, Field, ErrorBanner } from '../components/ui'
import { auth as authApi } from '../api/endpoints'
import { API_URL, tokens } from '../api/client'
import { money, dateLong, initials, copy } from '../utils/format'

const KYC_FIELDS = [
  { key: 'full_name', label: 'Nom complet' },
  { key: 'mobile', label: 'Téléphone' },
  { key: 'fax', label: 'Fax' },
  { key: 'country', label: 'Pays' },
  { key: 'state', label: 'Région / État' },
  { key: 'city', label: 'Ville' },
]

const GENDERS = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
]

const MARITAL = [
  { value: 'single', label: 'Célibataire' },
  { value: 'married', label: 'Marié(e)' },
  { value: 'other', label: 'Autre' },
]

export default function Profile() {
  const { user, account, kyc, displayName, logout, refresh } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()

  const [showSecret, setShowSecret] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [pwd, setPwd] = useState({ old_password: '', new_password1: '', new_password2: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)

  // Le formulaire repart toujours des valeurs actuelles du profil.
  useEffect(() => {
    setForm({
      username: user?.username || '',
      email: user?.email || '',
      full_name: kyc?.full_name || '',
      mobile: kyc?.mobile || '',
      fax: kyc?.fax || '',
      gender: kyc?.gender || '',
      marrital_status: kyc?.marrital_status || '',
      country: kyc?.country || '',
      state: kyc?.state || '',
      city: kyc?.city || '',
    })
  }, [user, kyc])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setP = (k) => (e) => setPwd((p) => ({ ...p, [k]: e.target.value }))

  const doCopy = (value, label) =>
    copy(value)
      .then(() => toast.success(`${label} copié`))
      .catch(() => toast.error('Impossible de copier'))

  const saveProfile = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = { username: form.username, email: form.email }
      // Les champs KYC ne sont envoyés que si une fiche existe déjà côté backend.
      if (kyc) {
        KYC_FIELDS.forEach(({ key }) => {
          payload[key] = form[key]
        })
        payload.gender = form.gender
        payload.marrital_status = form.marrital_status
      }
      const res = await authApi.updateProfile(payload)
      await refresh()
      setEditing(false)
      toast.success(res?.detail || 'Profil mis à jour')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwdError('')

    if (pwd.new_password1 !== pwd.new_password2) {
      setPwdError('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }

    setPwdBusy(true)
    try {
      const res = await authApi.changePassword(pwd)
      // Le backend renvoie une nouvelle paire de tokens : on la garde pour
      // rester connecté après le changement.
      if (res?.access) tokens.save({ access: res.access, refresh: res.refresh })
      setPwd({ old_password: '', new_password1: '', new_password2: '' })
      toast.success(res?.detail || 'Mot de passe modifié')
    } catch (err) {
      setPwdError(err.message)
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mon profil</h1>
          <p>Informations personnelles, sécurité et préférences.</p>
        </div>
        <button className="btn btn-danger" onClick={logout}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      <div className="grid grid-2">
        <div className="stack">
          <section className="card card-pad">
            <div className="row" style={{ gap: 16 }}>
              {kyc?.image ? (
                <img
                  src={kyc.image.startsWith('http') ? kyc.image : `${API_URL}${kyc.image}`}
                  alt={displayName}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span className="avatar avatar-lg">{initials(displayName)}</span>
              )}
              <div className="grow" style={{ minWidth: 0 }}>
                <h3>{displayName || user?.username}</h3>
                <p className="mute-xs row" style={{ gap: 6 }}>
                  <Mail size={13} /> {user?.email}
                </p>
              </div>
              {account?.kyc_confirmed ? (
                <span className="badge badge-success">
                  <BadgeCheck size={13} /> Vérifié
                </span>
              ) : (
                <span className="badge badge-warning">KYC en attente</span>
              )}
            </div>

            {!editing ? (
              <>
                <div style={{ marginTop: 16 }}>
                  <KeyValue k="Nom d’utilisateur" v={user?.username} />
                  <KeyValue k="Email" v={user?.email} />
                  <KeyValue k="Membre depuis" v={dateLong(user?.date_joined)} />
                  {kyc && (
                    <>
                      <KeyValue k="Nom complet" v={kyc.full_name} />
                      <KeyValue k="Genre" v={kyc.gender} />
                      <KeyValue
                        k="Téléphone"
                        v={
                          <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                            <Phone size={13} /> {kyc.mobile}
                          </span>
                        }
                      />
                      <KeyValue
                        k="Adresse"
                        v={
                          <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                            <MapPin size={13} /> {[kyc.city, kyc.state, kyc.country].filter(Boolean).join(', ')}
                          </span>
                        }
                      />
                    </>
                  )}
                </div>

                <button className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
                  <Pencil size={16} /> Modifier mes informations
                </button>
              </>
            ) : (
              <form className="stack" style={{ marginTop: 16 }} onSubmit={saveProfile}>
                <ErrorBanner>{formError}</ErrorBanner>

                <Field label="Nom d’utilisateur">
                  <div className="input-group">
                    <UserIcon size={17} />
                    <input className="input" value={form.username} onChange={set('username')} required />
                  </div>
                </Field>

                <Field label="Adresse email">
                  <div className="input-group">
                    <Mail size={17} />
                    <input className="input" type="email" value={form.email} onChange={set('email')} required />
                  </div>
                </Field>

                {kyc ? (
                  <>
                    {KYC_FIELDS.map(({ key, label }) => (
                      <Field label={label} key={key}>
                        <input className="input" value={form[key] || ''} onChange={set(key)} />
                      </Field>
                    ))}

                    <Field label="Genre">
                      <select className="select" value={form.gender || ''} onChange={set('gender')}>
                        <option value="">—</option>
                        {GENDERS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Situation familiale">
                      <select className="select" value={form.marrital_status || ''} onChange={set('marrital_status')}>
                        <option value="">—</option>
                        {MARITAL.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : (
                  <p className="mute-xs">
                    Aucune fiche KYC n’existe pour ce compte : seuls le nom d’utilisateur et l’email sont modifiables
                    ici. La fiche KYC (pièce d’identité, signature) se dépose depuis l’espace Django.
                  </p>
                )}

                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn-primary grow" type="submit" disabled={saving}>
                    {saving ? <span className="spinner" /> : <Save size={16} />} Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditing(false)
                      setFormError('')
                    }}
                    disabled={saving}
                  >
                    <X size={16} /> Annuler
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card card-pad">
            <h3 style={{ marginBottom: 12 }}>Préférences</h3>
            <div className="row-between">
              <div>
                <strong style={{ fontSize: '.92rem' }}>Thème {theme === 'dark' ? 'sombre' : 'clair'}</strong>
                <p className="mute-xs">Bascule l’interface entre clair et sombre.</p>
              </div>
              <button className="btn btn-ghost" onClick={toggle}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Changer
              </button>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="balance-card">
            <span className="balance-label">Compte bancaire</span>
            <div className="balance-amount mono">{money(account?.account_balance)}</div>
            <div className="balance-meta">
              <button className="acct-pill" onClick={() => doCopy(account?.account_number, 'Numéro de compte')}>
                <Copy size={15} /> {account?.account_number}
              </button>
              <button className="acct-pill" onClick={() => doCopy(account?.account_id, 'ID compte')}>
                <Copy size={15} /> {account?.account_id}
              </button>
            </div>
          </section>

          <section className="card card-pad stack">
            <div className="row" style={{ gap: 10 }}>
              <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                <KeyRound size={20} />
              </span>
              <div>
                <strong style={{ fontSize: '.92rem' }}>Changer mon mot de passe</strong>
                <p className="mute-xs">Il vous sera aussi demandé lors des retraits au guichet.</p>
              </div>
            </div>

            <form className="stack" onSubmit={savePassword}>
              <ErrorBanner>{pwdError}</ErrorBanner>

              <Field label="Mot de passe actuel">
                <div className="input-group">
                  <Lock size={17} />
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={pwd.old_password}
                    onChange={setP('old_password')}
                    required
                  />
                  <button type="button" className="input-suffix" onClick={() => setShowPwd((v) => !v)}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              <Field label="Nouveau mot de passe" hint="8 caractères minimum, pas uniquement des chiffres.">
                <div className="input-group">
                  <Lock size={17} />
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd.new_password1}
                    onChange={setP('new_password1')}
                    required
                  />
                </div>
              </Field>

              <Field
                label="Confirmer le nouveau mot de passe"
                error={
                  pwd.new_password2 && pwd.new_password1 !== pwd.new_password2 ? 'Les mots de passe diffèrent.' : ''
                }
              >
                <div className="input-group">
                  <Lock size={17} />
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd.new_password2}
                    onChange={setP('new_password2')}
                    required
                  />
                </div>
              </Field>

              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={pwdBusy || !pwd.old_password || !pwd.new_password1}
              >
                {pwdBusy ? <span className="spinner" /> : <KeyRound size={16} />} Modifier le mot de passe
              </button>
            </form>
          </section>

          <section className="card card-pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="stat-icon" style={{ background: 'var(--surface-3)', color: 'var(--text-soft)' }}>
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <strong style={{ fontSize: '.92rem' }}>Compte</strong>
                  <p className="mute-xs">Statut et vérification.</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowSecret((s) => !s)} aria-label="Afficher">
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <KeyValue k="Statut du compte" v={account?.account_status} />
            <KeyValue k="KYC soumis" v={account?.kyc_submitted ? 'Oui' : 'Non'} />
            <KeyValue k="KYC confirmé" v={account?.kyc_confirmed ? 'Oui' : 'Non'} />
            <KeyValue k="Ouvert le" v={dateLong(account?.date)} />
            <KeyValue
              k="Identifiant interne"
              v={<span className="mono">{showSecret ? account?.id : '••••••••-••••-••••'}</span>}
            />
            {user?.is_staff && <KeyValue k="Rôle" v={<span className="badge badge-brand">Agent guichet</span>} />}

            <p className="mute-xs" style={{ marginTop: 12 }}>
              Le code PIN (validation des virements) n’est jamais exposé par l’API. Retrouvez-le dans l’administration
              Django si vous l’avez oublié.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
