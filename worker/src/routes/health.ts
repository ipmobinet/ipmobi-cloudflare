import { Hono } from 'hono'
import type { Env } from '../index'

export const healthRouter = new Hono<Env>()

// GET /health — Basic health check
healthRouter.get('/', (c) => {
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

// GET /health/db — Database health (placeholder)
healthRouter.get('/db', async (c) => {
  // TODO: actual DB ping
  return c.json({
    status: 'ok',
    database: 'disconnected',
    message: 'Database check not yet implemented',
  })
})

// GET /health/deps — External dependencies health
healthRouter.get('/deps', async (c) => {
  const checks: Record<string, string> = {}

  // Coinbase
  if (c.env.COINBASE_API_KEY) {
    checks.coinbase = 'configured'
  } else {
    checks.coinbase = 'not-configured'
  }

  // Resend (email)
  if (c.env.RESEND_API_KEY) {
    checks.resend = 'configured'
  } else {
    checks.resend = 'not-configured'
  }

  // OpenAI
  if (c.env.OPENAI_API_KEY) {
    checks.openai = 'configured'
  } else {
    checks.openai = 'not-configured'
  }

  return c.json({
    status: 'ok',
    dependencies: checks,
    requestId: c.get('requestId'),
  })
})
