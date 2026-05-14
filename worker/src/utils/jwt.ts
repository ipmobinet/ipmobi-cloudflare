// ─── JWT (HMAC-SHA256, no external deps) ────────────────────

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

function encodeText(s: string): Uint8Array {
  return new Uint8Array(new TextEncoder().encode(s))
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encodeText(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encodeText(payload))
  return b64url(new Uint8Array(sig))
}

const JWT_HEADER = b64url(encodeText(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))

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
