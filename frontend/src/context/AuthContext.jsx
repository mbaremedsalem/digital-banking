import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth as authApi } from '../api/endpoints'
import { tokens } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null) // { user, account, kyc, notifications, unread_notifications }
  const [loading, setLoading] = useState(Boolean(tokens.access))

  /** Recharge le profil complet (utilise apres chaque operation qui bouge le solde). */
  const refresh = useCallback(async () => {
    if (!tokens.access) {
      setProfile(null)
      setLoading(false)
      return null
    }
    try {
      const data = await authApi.me()
      setProfile(data)
      return data
    } catch {
      setProfile(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Le client HTTP previent quand le refresh token est mort : on deconnecte.
  useEffect(() => {
    const onUnauthorized = () => {
      tokens.clear()
      setProfile(null)
    }
    window.addEventListener('pp:unauthorized', onUnauthorized)
    return () => window.removeEventListener('pp:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password)
      tokens.save({ access: data.access, refresh: data.refresh })
      setLoading(true)
      return refresh()
    },
    [refresh],
  )

  const register = useCallback((payload) => authApi.register(payload), [])

  const logout = useCallback(async () => {
    try {
      // Cote backend le blacklist n'est pas installe : l'echec est sans conseqence,
      // on nettoie les tokens locaux dans tous les cas.
      if (tokens.refresh) await authApi.logout(tokens.refresh)
    } catch {
      /* ignore */
    }
    tokens.clear()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      profile,
      user: profile?.user || null,
      account: profile?.account || null,
      kyc: profile?.kyc || null,
      notifications: profile?.notifications || [],
      unread: profile?.unread_notifications || 0,
      displayName: profile?.kyc?.full_name || profile?.user?.username || '',
      isAuthenticated: Boolean(profile),
      loading,
      login,
      register,
      logout,
      refresh,
    }),
    [profile, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
