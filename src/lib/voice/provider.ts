import { BolnaProvider } from './bolna/provider'
import { VapiProvider } from './vapi/provider'
import { CustomProvider } from './custom/provider'
import type { VoiceProvider } from './types'

let _cached: VoiceProvider | null = null

export function getVoiceProvider(): VoiceProvider {
  if (_cached) return _cached
  const name = (process.env.VOICE_PROVIDER ?? 'bolna').toLowerCase()
  switch (name) {
    case 'bolna':
      _cached = new BolnaProvider()
      break
    case 'vapi':
      _cached = new VapiProvider()
      break
    case 'custom':
      _cached = new CustomProvider()
      break
    default:
      throw new Error(`Unknown VOICE_PROVIDER: ${name}`)
  }
  return _cached
}

/** Test helper — reset cache so tests can swap providers. */
export function _resetVoiceProviderCache() {
  _cached = null
}
