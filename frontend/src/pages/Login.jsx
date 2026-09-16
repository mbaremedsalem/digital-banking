import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { Field, ErrorBanner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      toast.success('Connexion réussie. Bon retour !')
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Email ou mot de passe incorrect.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2>Se connecter</h2>
      <p>Accédez à votre compte PoolPay.</p>

      <form className="stack" onSubmit={submit}>
        <ErrorBanner>{error}</ErrorBanner>

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

        <Field label="Mot de passe">
          <div className="input-group">
            <Lock size={17} />
            <input
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
            />
            <button type="button" className="input-suffix" onClick={() => setShow((s) => !s)} aria-label="Afficher le mot de passe">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? <span className="spinner" /> : <LogIn size={17} />}
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="auth-alt">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </AuthLayout>
  )
}
