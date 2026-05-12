/**
 * Transcript normaliser.
 *
 * Bolna stores transcripts inconsistently depending on call mode:
 *   - Real outbound call:   array of { role: 'assistant'|'user', content: string }
 *   - Chat-mode / older:    multi-line string "assistant: …\nuser: …"
 *   - Webhook flake:        null / undefined / object
 *
 * Normalise once at the boundary so every consumer (order detail, snippet
 * extractor, dashboard feed) sees the same shape.
 */

export interface Turn {
  speaker: 'agent' | 'customer'
  text: string
}

const AGENT_ROLES = new Set(['assistant', 'agent', 'bot', 'system'])
const CUSTOMER_ROLES = new Set(['user', 'customer', 'human', 'caller'])

export function normaliseTranscript(input: unknown): Turn[] {
  if (input == null) return []

  // Case 1: array of turn objects (Bolna real-call shape)
  if (Array.isArray(input)) {
    const turns: Turn[] = []
    for (const item of input) {
      if (typeof item !== 'object' || !item) continue
      const obj = item as Record<string, unknown>
      const role = String(obj.role ?? obj.speaker ?? obj.from ?? '').toLowerCase().trim()
      const text = String(obj.content ?? obj.text ?? obj.message ?? '').trim()
      if (!text) continue
      if (AGENT_ROLES.has(role) || role.includes('assist')) {
        turns.push({ speaker: 'agent', text })
      } else if (CUSTOMER_ROLES.has(role)) {
        turns.push({ speaker: 'customer', text })
      }
      // Unknown role → skip (don't crash)
    }
    return turns
  }

  // Case 2: multi-line "assistant: …\nuser: …" string
  if (typeof input === 'string') {
    return input
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        if (line.startsWith('assistant:')) return { speaker: 'agent' as const, text: line.slice('assistant:'.length).trim() }
        if (line.startsWith('user:')) return { speaker: 'customer' as const, text: line.slice('user:'.length).trim() }
        return null
      })
      .filter((t): t is Turn => t !== null && t.text.length > 0)
  }

  // Case 3: object that wraps a transcript field (defensive)
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>
    if (Array.isArray(obj.transcript)) return normaliseTranscript(obj.transcript)
    if (typeof obj.transcript === 'string') return normaliseTranscript(obj.transcript)
  }

  return []
}

/** First customer utterance, for card snippets. */
export function firstCustomerLine(input: unknown): string | null {
  const turns = normaliseTranscript(input)
  const first = turns.find(t => t.speaker === 'customer')
  return first?.text ?? null
}
