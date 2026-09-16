/** Helpers d'affichage partages par toutes les pages. */

export const CURRENCY = import.meta.env.VITE_CURRENCY || 'MRU'

export function money(value, { sign = '' } = {}) {
  const n = Number(value ?? 0)
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)
  return `${sign}${formatted} ${CURRENCY}`
}

export function dateLong(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dateShort(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

/** Regroupe les transactions par jour ("Aujourd'hui", "Hier", puis la date). */
export function dayLabel(value) {
  if (!value) return ''
  const d = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return "Aujourd'hui"
  if (same(d, yesterday)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || 'U'
}

export function maskCard(number) {
  const s = String(number ?? '')
  const last = s.slice(-4).padStart(4, '0')
  return `•••• •••• •••• ${last}`
}

const STATUS_LABELS = {
  completed: 'Terminé',
  pending: 'En attente',
  processing: 'En cours',
  failed: 'Échoué',
  request_sent: 'Demande envoyée',
  request_settled: 'Demande réglée',
  request_processing: 'Demande en cours',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '-'
}

export function statusClass(status) {
  if (['completed', 'request_settled'].includes(status)) return 'badge badge-success'
  if (['failed'].includes(status)) return 'badge badge-danger'
  if (['pending', 'processing', 'request_processing'].includes(status)) return 'badge badge-warning'
  if (['request_sent'].includes(status)) return 'badge badge-brand'
  return 'badge'
}

export function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(text))
  return Promise.reject(new Error('Presse-papiers indisponible'))
}
