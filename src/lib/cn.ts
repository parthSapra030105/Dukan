/** Minimal classnames helper — joins truthy strings with spaces. */
export function cn(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(' ')
}
