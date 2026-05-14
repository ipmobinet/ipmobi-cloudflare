import { Hono } from 'hono'
import type { Env } from '../types/index'
import { hashPassword, verifyPassword } from '../utils/crypto'
import { createToken, verifyToken } from '../utils/jwt'
import { generateId } from '../utils/id'
import { requireAuth } from '../middleware/auth'

export const authRouter = new Hono<Env>()

// ─── POST /auth/register ──────────────────────────────────
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string
      password: string
      full_name?: string
    }>()

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }
    if (body.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400)
    }

    const db = c.get('db')
    const existing = await db.findUserByEmail(body.email)
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const userId = generateId()
    const passwordHash = await hashPassword(body.password)
    const now = Math.floor(Date.now() / 1000)

    await db.createUser({
      id: userId,
      email: body.email,
      password_hash: passwordHash,
      full_name: body.full_name || null,
      role: 'client_b',
      is_active: 1,
      created_at: now,
    })

    await db.logAudit({
      user_id: userId,
      action: 'register',
      target_type: 'user',
      target_id: userId,
      ip_address: c.req.header('CF-Connecting-IP') || null,
      user_agent: c.req.header('user-agent') || null,
      created_at: now,
    })

    return c.json(
      {
        id: userId,
        email: body.email,
        full_name: body.full_name || null,
        role: 'client_b',
      },
      201,
    )
  } catch (err) {
    console.error('Register error:', err)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// ─── POST /auth/login ─────────────────────────────────────
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>()
    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const db = c.get('db')
    const user = await db.findUserByEmail(body.email)
    if (!user) return c.json({ error: 'Invalid email or password' }, 401)
    if (!user.is_active) return c.json({ error: 'Account is disabled' }, 403)

    const valid = await verifyPassword(body.password, user.password_hash)
    if (!valid) return c.json({ error: 'Invalid email or password' }, 401)

    // Generate JWT (7 day expiry)
    const token = await createToken(
      { user_id: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET,
      7 * 24 * 60, // 7 days in minutes
    )

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// ─── POST /auth/logout ────────────────────────────────────
authRouter.post('/logout', requireAuth, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const now = Math.floor(Date.now() / 1000)

    // Blacklist the JWT by storing it in sessions table
    await c.env.IPMOBI_DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      c.get('userId'),
      token,
      now + 7 * 86400, // match JWT expiry
      now,
    ).run()

    return c.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    return c.json({ error: 'Logout failed' }, 500)
  }
})

// ─── GET /auth/me ─────────────────────────────────────────
authRouter.get('/me', requireAuth, async (c) => {
  const db = c.get('db')
  const userId = c.get('userId')

  const user = await db.findUserById(userId)
  if (!user) return c.json({ error: 'User not found' }, 404)

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: !!user.is_active,
      created_at: user.created_at,
    },
  })
})

// ─── POST /auth/refresh ───────────────────────────────────
authRouter.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || ''
    const oldToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!oldToken) return c.json({ error: 'JWT required' }, 401)

    // Verify old JWT is valid (not expired)
    const payload = await verifyToken(oldToken, c.env.JWT_SECRET)
    if (!payload) return c.json({ error: 'Invalid or expired JWT' }, 401)

    const now = Math.floor(Date.now() / 1000)

    // Blacklist old JWT
    await c.env.IPMOBI_DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      payload.user_id as string,
      oldToken,
      now + 7 * 86400,
      now,
    ).run()

    // Issue new JWT
    const newToken = await createToken(
      { user_id: payload.user_id, email: payload.email, role: payload.role },
      c.env.JWT_SECRET,
      7 * 24 * 60,
    )

    return c.json({ token: newToken })
  } catch (err) {
    console.error('Refresh error:', err)
    return c.json({ error: 'Token refresh failed' }, 500)
  }
})
