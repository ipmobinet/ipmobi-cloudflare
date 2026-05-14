import type { Context, Next } from 'hono'
import type { Env } from '../types/index'
import { verifyToken } from '../utils/jwt'

// ─── JWT Auth Middleware ─────────────────────────────────────
export async function requireAuth(c: Context<Env>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // Check if token is blacklisted in sessions table
  const blacklisted = await c.env.IPMOBI_DB.prepare(
    'SELECT id FROM sessions WHERE token = ? AND expires_at > ?',
  ).bind(token, Math.floor(Date.now() / 1000)).first()

  if (blacklisted) {
    return c.json({ error: 'Token has been revoked' }, 401)
  }

  // Store user info in context variables
  c.set('userId', payload.user_id as string)
  c.set('userRole', payload.role as string)
  c.set('userEmail', payload.email as string)
  await next()
}

// ─── Role-based Authorization ────────────────────────────────
export function requireRole(...roles: string[]) {
  return async (c: Context<Env>, next: Next) => {
    const role = c.get('userRole') as string
    if (!role || !roles.includes(role)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }
    await next()
  }
}
