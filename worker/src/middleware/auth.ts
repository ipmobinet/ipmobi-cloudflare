import type { Context, Next } from 'hono'
import type { Env } from '../index'
import { verifyToken } from '../crypto'
import type { UserRow } from '../db'

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

  // Store user info in context variables
  c.set('userId', payload.sub as string)
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

// ─── Optional Auth (attaches user if token present) ─────────
export async function optionalAuth(c: Context<Env>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    if (payload) {
      c.set('userId', payload.sub as string)
      c.set('userRole', payload.role as string)
      c.set('userEmail', payload.email as string)
    }
  }
  await next()
}
