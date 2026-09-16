import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  HandCoins,
  Receipt,
  CreditCard,
  UserRound,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Search,
  ShieldCheck,
  Plus,
  Wallet,
  Banknote,
  Landmark,
  Building2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Dropdown } from './ui'
import { initials, money, dateShort } from '../utils/format'

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/transfer', label: 'Transférer', icon: ArrowLeftRight },
  { to: '/request', label: 'Demander', icon: HandCoins },
  { to: '/withdraw', label: 'Retrait espèces', icon: Banknote },
  { to: '/agharina', label: 'Paiement Agharina', icon: Building2 },
  { to: '/requests', label: 'Demandes', icon: Receipt },
  { to: '/transactions', label: 'Transactions', icon: Wallet },
  { to: '/cards', label: 'Cartes', icon: CreditCard },
]

const MOBILE = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Activité', icon: Wallet },
  { to: '/transfer', label: 'Envoyer', icon: Plus, fab: true },
  { to: '/withdraw', label: 'Retrait', icon: Banknote },
  { to: '/profile', label: 'Profil', icon: UserRound },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { displayName, user, account, notifications, unread, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => setOpen(false), [location.pathname])

  const onSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // Un identifiant de transaction commence par TRN, sinon on cherche un compte.
    if (/^TRN/i.test(q)) navigate(`/transactions/${q}`)
    else navigate(`/transfer?q=${encodeURIComponent(q)}`)
    setQuery('')
  }

  return (
    <div className="shell">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="row-between">
          <div className="brand">
            <span className="brand-mark">
              <ShieldCheck size={20} />
            </span>
            <span>
              <span className="brand-name">PoolPay</span>
              <br />
              <span className="brand-sub">Digital Banking</span>
            </span>
          </div>
          <button className="btn-icon only-mobile" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav">
          <span className="nav-label">Menu</span>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}

          {user?.is_staff && (
            <>
              <span className="nav-label">Guichet</span>
              <NavLink to="/teller" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Landmark size={19} />
                Retraits à valider
              </NavLink>
            </>
          )}

          <span className="nav-label">Compte</span>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UserRound size={19} />
            Profil
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bell size={19} />
            Notifications
            {unread > 0 && <span className="nav-dot">{unread}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-promo">
            <strong style={{ fontSize: '.92rem' }}>Solde disponible</strong>
            <p style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 6 }}>{money(account?.account_balance)}</p>
            <p>Compte {account?.account_number || '—'}</p>
            <button className="btn btn-sm btn-block" onClick={() => navigate('/transfer')}>
              Envoyer de l&apos;argent
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn-icon only-mobile" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={20} />
          </button>

          <form className="topbar-search hide-sm" onSubmit={onSearch}>
            <div className="input-group">
              <Search size={17} />
              <input
                className="input"
                placeholder="Rechercher un compte ou une transaction…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>

          <div className="topbar-actions">
            <button className="btn-icon" onClick={toggle} aria-label="Changer de thème">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <Dropdown
              trigger={
                <button className="btn-icon bell" aria-label="Notifications">
                  <Bell size={19} />
                  {unread > 0 && <span className="bell-dot" />}
                </button>
              }
            >
              <div className="menu-head">
                <strong style={{ fontSize: '.9rem' }}>Notifications</strong>
                <p className="mute-xs">{unread} non lue{unread > 1 ? 's' : ''}</p>
              </div>
              {notifications.length === 0 && <p className="mute-xs" style={{ padding: '10px 12px' }}>Aucune notification</p>}
              {notifications.slice(0, 6).map((n) => (
                <div key={n.nid} className="menu-item" style={{ alignItems: 'flex-start' }}>
                  <Bell size={15} style={{ marginTop: 3, color: 'var(--brand-600)' }} />
                  <span>
                    <span style={{ fontWeight: 600 }}>{n.notification_type}</span>
                    <br />
                    <span className="mute-xs">
                      {money(n.amount)} · {dateShort(n.date)}
                    </span>
                  </span>
                </div>
              ))}
              <div className="menu-sep" />
              <button className="menu-item" onClick={() => navigate('/notifications')}>
                Voir tout
              </button>
            </Dropdown>

            <Dropdown
              trigger={
                <button className="user-chip">
                  <span className="avatar">{initials(displayName)}</span>
                  <span className="hide-sm" style={{ textAlign: 'left' }}>
                    <span className="user-chip-name">{displayName || 'Utilisateur'}</span>
                    <br />
                    <span className="mute-xs">{account?.account_number}</span>
                  </span>
                </button>
              }
            >
              <div className="menu-head">
                <strong style={{ fontSize: '.9rem' }}>{displayName}</strong>
                <p className="mute-xs">{user?.email}</p>
              </div>
              <button className="menu-item" onClick={() => navigate('/profile')}>
                <UserRound size={16} /> Mon profil
              </button>
              <button className="menu-item" onClick={() => navigate('/cards')}>
                <CreditCard size={16} /> Mes cartes
              </button>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={logout}>
                <LogOut size={16} /> Se déconnecter
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bar">
        {MOBILE.map(({ to, label, icon: Icon, end, fab }) =>
          fab ? (
            <NavLink key={to} to={to} className="mobile-fab" aria-label={label}>
              <Icon size={24} />
            </NavLink>
          ) : (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              {label}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}
