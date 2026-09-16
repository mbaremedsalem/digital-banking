import { ShieldCheck, Zap, Lock, CreditCard } from 'lucide-react'

const FEATURES = [
  { icon: Zap, title: 'Virements instantanés', text: 'Envoyez de l’argent en quelques secondes, 24h/24.' },
  { icon: Lock, title: 'Validation par code PIN', text: 'Chaque opération est confirmée par votre PIN personnel.' },
  { icon: CreditCard, title: 'Cartes virtuelles', text: 'Alimentez et pilotez vos cartes depuis un seul écran.' },
]

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="brand-name" style={{ color: '#fff' }}>PoolPay</span>
            <br />
            <span className="brand-sub" style={{ color: 'rgba(255,255,255,.6)' }}>Digital Banking</span>
          </span>
        </div>

        <div className="auth-hero">
          <h1>
            Votre banque,
            <br />
            simplement digitale.
          </h1>
          <p>
            Transférez, demandez et suivez votre argent depuis une interface pensée pour aller vite — sans jamais
            quitter votre tableau de bord.
          </p>

          <div className="auth-feats">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div className="auth-feat" key={title}>
                <span className="auth-feat-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '.78rem', opacity: 0.6 }}>© {new Date().getFullYear()} PoolPay — Tous droits réservés.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-form">{children}</div>
      </main>
    </div>
  )
}
