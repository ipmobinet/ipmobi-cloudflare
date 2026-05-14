import { Hono } from 'hono'
import type { Env } from '../index'

export const authRouter = new Hono<Env>()

// POST /api/v1/auth/login — Authenticate user
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json<{
      email: string
      password: string
    }>()

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    // TODO: verify credentials against DB
    // TODO: generate JWT
    return c.json({
      success: true,
      token: 'placeholder-jwt-token',
      user: {
        id: 'usr_xxx',
        email: body.email,
        role: 'customer',
      },
      requestId: c.get('requestId'),
    })
  } catch {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// POST /api/v1/auth/register — Register new user
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string
      password: string
      name: string
    }>()

    if (!body.email || !body.password || !body.name) {
      return c.json({ error: 'Email, password, and name required' }, 400)
    }

    // TODO: create user in DB
    // TODO: send welcome email via Resend
    return c.json(
      {
        success: true,
        message: 'Registration successful',
        user: {
          id: 'usr_xxx',
          email: body.email,
          name: body.name,
        },
        requestId: c.get('requestId'),
      },
      201,
    )
  } catch {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// GET /api/v1/auth/me — Get current user
authRouter.get('/me', async (c) => {
  // TODO: extract user from JWT
  return c.json({
    user: null,
    message: 'Authentication not yet implemented',
    requestId: c.get('requestId'),
  })
})
