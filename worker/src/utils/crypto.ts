// ─── Password Hashing (SHA-256) ───────────────────────────
// Uses Web Crypto API (Works runtime compatible).

const SALT_LENGTH = 16

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].toString(16)
    out += b.length === 1 ? '0' + b : b
  }
  return out
}

function encodeText(s: string): Uint8Array {
  return new Uint8Array(new TextEncoder().encode(s))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const combined = new Uint8Array(SALT_LENGTH + password.length)
  combined.set(salt)
  combined.set(encodeText(password), SALT_LENGTH)
  const hash = await crypto.subtle.digest('SHA-256', combined)
  return 'sha256$' + toHex(salt) + '$' + toHex(new Uint8Array(hash))
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('sha256$')) return false
  const body = stored.slice(7)
  const sep = body.indexOf('$')
  if (sep === -1) return false
  const saltHex = body.slice(0, sep)
  const keyHex = body.slice(sep + 1)
  const salt = new Uint8Array(saltHex.length / 2)
  for (let i = 0; i < saltHex.length; i += 2) {
    salt[i / 2] = parseInt(saltHex.substring(i, i + 2), 16)
  }
  const combined = new Uint8Array(SALT_LENGTH + password.length)
  combined.set(salt)
  combined.set(encodeText(password), SALT_LENGTH)
  const hash = await crypto.subtle.digest('SHA-256', combined)
  return toHex(new Uint8Array(hash)) === keyHex
}
