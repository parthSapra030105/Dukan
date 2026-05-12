import { Fragment, type ReactNode } from 'react'

export type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' }

const HEADING_RX = /^(#{1,3}) (.*)/
const LIST_BULLET_RX = /^[-*] /
const LIST_NUM_RX = /^\d+\. /

/**
 * Tiny block-level Markdown parser. Recognises:
 *   - h1 / h2 / h3
 *   - unordered + ordered lists (single-level)
 *   - paragraphs
 *   - horizontal rules
 * Inline: **bold** and `inline code` — handled in `renderInline`.
 * Sufficient for the system prompt's structure.
 */
export function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const heading = HEADING_RX.exec(line)
    if (heading) {
      const depth = heading[1].length
      const type = depth === 1 ? 'h1' : depth === 2 ? 'h2' : 'h3'
      blocks.push({ type, text: heading[2].trim() })
      i++
      continue
    }
    if (line.trim() === '---') {
      blocks.push({ type: 'hr' })
      i++
      continue
    }
    if (LIST_BULLET_RX.test(line)) {
      const items: string[] = []
      while (i < lines.length && LIST_BULLET_RX.test(lines[i])) {
        items.push(lines[i].replace(LIST_BULLET_RX, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (LIST_NUM_RX.test(line)) {
      const items: string[] = []
      while (i < lines.length && LIST_NUM_RX.test(lines[i])) {
        items.push(lines[i].replace(LIST_NUM_RX, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }
    if (line.trim() === '') {
      i++
      continue
    }
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !HEADING_RX.test(lines[i]) &&
      !LIST_BULLET_RX.test(lines[i]) &&
      !LIST_NUM_RX.test(lines[i]) &&
      lines[i].trim() !== '---'
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', text: para.join(' ') })
  }
  return blocks
}

const INLINE_RX = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g

export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  let key = 0
  INLINE_RX.lastIndex = 0
  while ((m = INLINE_RX.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    if (m[1]) {
      parts.push(<strong key={key++}>{m[2]}</strong>)
    } else if (m[3]) {
      parts.push(
        <code
          key={key++}
          className="bg-stone-100 px-1 py-0.5 rounded text-[0.85em] font-mono text-stone-800"
        >
          {m[4]}
        </code>,
      )
    }
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return <Fragment>{parts}</Fragment>
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
