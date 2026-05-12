/** Format paise as ₹X (no decimals — kirana cents don't matter for display). */
export function formatRupees(paise: number | null | undefined): string {
  if (paise == null) return '₹0'
  const rupees = Math.round(paise / 100)
  return `₹${rupees.toLocaleString('en-IN')}`
}

/** Format E.164 phone as `+91 98765 43210`. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

/** "5 min ago" / "2 h ago" / "12 May" relative time. */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return ''
  const d = typeof input === 'string' ? new Date(input) : input
  const ms = Date.now() - d.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Mm:ss for a duration in seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '–'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
