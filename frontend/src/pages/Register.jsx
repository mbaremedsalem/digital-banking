import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { Field, ErrorBanner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const { register, login, isAuthenticated, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password1: '', password2: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to="/" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password1 !== form.password2) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setBusy(true)
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password1: form.password1,
        password2: form.password2,
      })
      // Le backend cree le compte bancaire automatiquement (signal post_save).
      await login(form.email.trim(), form.password1)
      toast.success('Compte créé. Bienvenue sur PoolPay !')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2>Créer un compte</h2>
      <p>Ouvrez votre compte PoolPay en moins d’une minute.</p>

      <form className="stack" onSubmit={submit}>
        <ErrorBanner>{error}</ErrorBanner>

        <Field label="Nom d’utilisateur">
          <div className="input-group">
            <User size={17} />
            <input className="input" placeholder="mbaré" value={form.username} onChange={set('username')} required />
          </div>
        </Field>

        <Field label="Adresse email">
          <div className="input-group">
            <Mail size={17} />
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
        </Field>

        <Field label="Mot de passe" hint="8 caractères minimum, pas uniquement des chiffres.">
          <div className="input-group">
            <Lock size={17} />
            <input
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password1}
              onChange={set('password1')}
              required
            />
            <button type="button" className="input-suffix" onClick={() => setShow((s) => !s)} aria-label="Afficher le mot de passe">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <Field
          label="Confirmer le mot de passe"
          error={form.password2 && form.password1 !== form.password2 ? 'Les mots de passe diffèrent.' : ''}
        >
          <div className="input-group">
            <Lock size={17} />
            <input
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password2}
              onChange={set('password2')}
              required
            />
          </div>
        </Field>

        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? <span className="spinner" /> : <UserPlus size={17} />}
          {busy ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="auth-alt">
        Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </AuthLayout>
  )
}
