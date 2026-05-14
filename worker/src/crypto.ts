// ─── Password Hashing (SHA-256) ───────────────────────────
// Cloudflare Workers Web Crypto API compatible.
// Upgrade to bcrypt/PBKDF2 when Workers adds better support.

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
  // salt + password -> SHA-256
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

// ─── JWT (HMAC-SHA256) ─────────────────────────────────────
function b64url(buf: Uint8Array): string {
  let s = ''
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const s = atob(str)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encodeText(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encodeText(payload))
  return b64url(new Uint8Array(sig))
}

export const JWT_HEADER = b64url(encodeText(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))

export async function createToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresInMinutes: number = 15,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInMinutes * 60,
    jti: crypto.randomUUID().slice(0, 12),
  }
  const encoded = b64url(encodeText(JSON.stringify(fullPayload)))
  const sig = await hmacSign(`${JWT_HEADER}.${encoded}`, secret)
  return `${JWT_HEADER}.${encoded}.${sig}`
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, encodedPayload, signature] = parts
  const expected = await hmacSign(`${header}.${encodedPayload}`, secret)
  if (signature !== expected) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encodedPayload)))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// ─── Utilities ─────────────────────────────────────────────
export function generateId(): string {
  return 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
