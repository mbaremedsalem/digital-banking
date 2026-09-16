/**
 * Client HTTP pour l'API Django.
 *
 * - injecte le token JWT (Authorization: Bearer ...)
 * - rejoue automatiquement la requete apres un refresh quand l'access token
 *   a expire (il ne vit que 5 minutes cote backend)
 * - normalise les erreurs DRF en un message lisible
 */

export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

const ACCESS_KEY = 'pp_access'
const REFRESH_KEY = 'pp_refresh'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  save({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Transforme une reponse d'erreur DRF en une phrase affichable. */
function readError(data, status) {
  if (!data) return `Erreur ${status}`
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.error) return data.error
  if (data.Message) return data.Message
  const first = Object.entries(data)[0]
  if (first) {
    const [field, value] = first
    const text = Array.isArray(value) ? value[0] : value
    return field === 'non_field_errors' ? String(text) : `${field} : ${text}`
  }
  return `Erreur ${status}`
}

let refreshing = null

async function refreshAccessToken() {
  if (!tokens.refresh) return null
  // Un seul refresh en vol, meme si plusieurs requetes echouent en meme temps.
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/user/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError('Session expiree', res.status, null)
        const data = await res.json()
        tokens.save({ access: data.access, refresh: data.refresh })
        return data.access
      })
      .catch(() => {
        tokens.clear()
        return null
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

async function parse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * @param {string} path      chemin commencant par "/"
 * @param {object} options   { method, body, auth, signal }
 */
export async function request(path, { method = 'GET', body, auth = true, signal, retry = true } = {}) {
  const headers = { Accept: 'application/json' }
  let payload

  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload, signal })

  if (res.status === 401 && auth && retry && tokens.refresh) {
    const fresh = await refreshAccessToken()
    if (fresh) return request(path, { method, body, auth, signal, retry: false })
    window.dispatchEvent(new CustomEvent('pp:unauthorized'))
  }

  const data = await parse(res)
  if (!res.ok) throw new ApiError(readError(data, res.status), res.status, data)
  return data
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
