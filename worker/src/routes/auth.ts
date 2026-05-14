import { Hono } from 'hono'
import type { Env } from '../index'
import { hashPassword, verifyPassword, createToken, verifyToken, generateId, generateSessionId } from '../crypto'
import { requireAuth } from '../middleware/auth'

export const authRouter = new Hono<Env>()

// ─── POST /api/v1/auth/register ────────────────────────────
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string
      password: string
      full_name?: string
    }>()

    // Validation
    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }
    if (body.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400)
    }

    const db = c.get('db')

    // Check existing
    const existing = await db.findUserByEmail(body.email)
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    // Create user
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

    // Generate tokens
    const accessToken = await createToken(
      { sub: userId, email: body.email, role: 'client_b' },
      c.env.JWT_SECRET,
      15, // 15 min
    )
    const refreshToken = crypto.randomUUID()
    const refreshTokenHash = await hashPassword(refreshToken)

    await db.createSession({
      user_id: userId,
      token: refreshTokenHash,
      expires_at: now + 30 * 86400,
    })

    // Audit log
    await db.logAudit({
      user_id: userId,
      action: 'register',
      resource_type: 'user',
      resource_id: userId,
      details: JSON.stringify({ email: body.email }),
      ip_address: c.req.header('CF-Connecting-IP') || null,
      user_agent: c.req.header('user-agent') || null,
      created_at: now,
    })

    return c.json(
      {
        success: true,
        message: 'Registration successful',
        user: {
          id: userId,
          email: body.email,
          full_name: body.full_name || null,
          role: 'client_b',
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 min in seconds
      },
      201,
    )
  } catch (err) {
    console.error('Register error:', err)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// ─── POST /api/v1/auth/login ───────────────────────────────
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json<{
      email: string
      password: string
    }>()

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const db = c.get('db')
    const user = await db.findUserByEmail(body.email)

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }
    if (!user.is_active) {
      return c.json({ error: 'Account is disabled' }, 403)
    }

    const valid = await verifyPassword(body.password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Generate tokens
    const now = Math.floor(Date.now() / 1000)
    const refreshToken = crypto.randomUUID()

    // Test if createToken works
    let accessToken: string
    try {
      accessToken = await createToken(
        { sub: user.id, email: user.email, role: user.role },
        c.env.JWT_SECRET,
        15,
      )
    } catch (tokenErr: any) {
      console.error('createToken error:', tokenErr)
      return c.json({ error: 'Token generation failed' }, 500)
    }

    // Test if hashPassword for refresh token works
    let refreshTokenHash: string
    try {
      refreshTokenHash = await hashPassword(refreshToken)
    } catch (hashErr: any) {
      console.error('hashPassword error:', hashErr)
      return c.json({ error: 'Hash generation failed: ' + hashErr.message }, 500)
    }

    try {
      await db.createSession({
        user_id: user.id,
        token: refreshTokenHash,
        expires_at: now + 30 * 86400,
      })
    } catch (sessionErr: any) {
      console.error('createSession error:', sessionErr)
      return c.json({ error: 'Session creation failed: ' + sessionErr.message }, 500)
    }

    // Log audit
    try {
      await db.logAudit({
        user_id: user.id,
        action: 'login',
        resource_type: 'user',
        resource_id: user.id,
        details: '{}',
        ip_address: c.req.header('CF-Connecting-IP') || null,
        user_agent: c.req.header('user-agent') || null,
        created_at: now,
      })
    } catch (auditErr: any) {
      console.error('logAudit error:', auditErr)
      // Non-fatal - continue without audit log
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// ─── POST /api/v1/auth/refresh ─────────────────────────────
authRouter.post('/refresh', async (c) => {
  try {
    const body = await c.req.json<{ refresh_token: string }>()
    if (!body.refresh_token) {
      return c.json({ error: 'Refresh token required' }, 400)
    }

    const db = c.get('db')
    // Hash the provided refresh token and look it up
    // (In production we store sha256 hash for lookup, but for simplicity
    //  we iterate all active sessions — optimized with a real hash lookup)
    const { results: sessions } = await c.env.IPMOBI_DB.prepare(
      `SELECT s.*, u.email, u.role, u.is_active FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.revoked = 0 AND s.expires_at > ?`,
    ).bind(Math.floor(Date.now() / 1000)).all<any>()

    // Find matching session
    let matchedSession = null
    for (const s of (sessions as any[]) || []) {
      const valid = await verifyPassword(body.refresh_token, s.token_hash)
      if (valid) {
        matchedSession = s
        break
      }
    }

    if (!matchedSession || !matchedSession.is_active) {
      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    }

    // Revoke old session
    await db.revokeSession(matchedSession.token_hash)

    // Issue new tokens
    const now = Math.floor(Date.now() / 1000)
    const newAccessToken = await createToken(
      { sub: matchedSession.user_id, email: matchedSession.email, role: matchedSession.role },
      c.env.JWT_SECRET,
      15,
    )
    const newRefreshToken = crypto.randomUUID()
    const newRefreshHash = await hashPassword(newRefreshToken)

    await db.createSession({
      user_id: matchedSession.user_id,
        token: newRefreshHash,
      expires_at: now + 30 * 86400,
    })

    return c.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return c.json({ error: 'Token refresh failed' }, 500)
  }
})

// ─── POST /api/v1/auth/logout ──────────────────────────────
authRouter.post('/logout', requireAuth, async (c) => {
  try {
    const body = await c.req.json<{ refresh_token?: string }>().catch(() => ({}))
    const db = c.get('db')
    const userId = c.get('userId')

    if (body.refresh_token) {
      // Revoke specific session
      const { results: sessions } = await c.env.IPMOBI_DB.prepare(
        `SELECT * FROM sessions WHERE user_id = ? AND revoked = 0`,
      ).bind(userId).all<any>()

      for (const s of (sessions as any[]) || []) {
        const valid = await verifyPassword(body.refresh_token, s.token_hash)
        if (valid) {
          await db.revokeSession(s.token_hash)
          break
        }
      }
    } else {
      // Revoke ALL sessions
      await db.revokeAllUserSessions(userId)
    }

    return c.json({ success: true, message: 'Logged out' })
  } catch (err) {
    console.error('Logout error:', err)
    return c.json({ error: 'Logout failed' }, 500)
  }
})

// ─── GET /api/v1/auth/me ───────────────────────────────────
authRouter.get('/me', requireAuth, async (c) => {
  const db = c.get('db')
  const userId = c.get('userId')

  const user = await db.findUserById(userId)
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

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

// ─── PATCH /api/v1/auth/me ─────────────────────────────────
authRouter.patch('/me', requireAuth, async (c) => {
  try {
    const body = await c.req.json<{ full_name?: string }>()
    const db = c.get('db')
    const userId = c.get('userId')
    const now = Math.floor(Date.now() / 1000)

    if (body.full_name !== undefined) {
      await c.env.IPMOBI_DB.prepare(
        'UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?',
      ).bind(body.full_name, now, userId).run()
    }

    const user = await db.findUserById(userId)
    return c.json({
      success: true,
      user: {
        id: user!.id,
        email: user!.email,
        full_name: user!.full_name,
        role: user!.role,
      },
    })
  } catch (err) {
    console.error('Update error:', err)
    return c.json({ error: 'Update failed' }, 500)
  }
})
