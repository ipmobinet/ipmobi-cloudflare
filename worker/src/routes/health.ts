import { Hono } from 'hono'
import type { Env } from '../index'

export const healthRouter = new Hono<Env>()

// GET /health — Basic health check
healthRouter.get('/', async (c) => {
  const startTime = c.get('startTime')
  const uptime = startTime ? Date.now() - startTime : 0

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${uptime}ms`,
    environment: c.env.ENVIRONMENT,
    requestId: c.get('requestId'),
  })
})

// GET /health/db — Database health (real D1 ping)
healthRouter.get('/db', async (c) => {
  let dbStatus = 'disconnected'
  let latency: string | null = null

  try {
    const t0 = Date.now()
    const db = c.get('db')
    const ok = await db.ping()
    latency = `${Date.now() - t0}ms`
    dbStatus = ok ? 'connected' : 'error'
  } catch (err: any) {
    dbStatus = `error: ${err.message || 'unknown'}`
  }

  return c.json({
    status: dbStatus === 'connected' ? 'ok' : 'error',
    database: dbStatus,
    latency,
    requestId: c.get('requestId'),
  })
})

// GET /health/deps — External dependencies health
healthRouter.get('/deps', async (c) => {
  const checks: Record<string, string> = {}

  if (c.env.COINBASE_API_KEY) checks.coinbase = 'configured'
  else checks.coinbase = 'not-configured'

  if (c.env.RESEND_API_KEY) checks.resend = 'configured'
  else checks.resend = 'not-configured'

  if (c.env.OPENAI_API_KEY) checks.openai = 'configured'
  else checks.openai = 'not-configured'

  if (c.env.JWT_SECRET) checks.jwt = 'configured'
  else checks.jwt = 'not-configured'

  return c.json({
    status: 'ok',
    dependencies: checks,
    requestId: c.get('requestId'),
  })
})
