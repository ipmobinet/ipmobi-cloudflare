// ─── ID Generation ─────────────────────────────────────────

export function generateId(prefix: string = 'usr_'): string {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
