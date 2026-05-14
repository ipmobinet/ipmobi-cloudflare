import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { D1Database } from '@cloudflare/workers-types'
import { healthRouter } from './routes/health'
import { proxyRouter } from './routes/proxy'
import { authRouter } from './routes/auth'
import { DB } from './db'

// ─── Types ────────────────────────────────────────────────
export type Env = {
  Bindings: {
    ENVIRONMENT: string
    LOG_LEVEL: string
    CORS_ORIGIN: string
    SECRET_KEY: string
    JWT_SECRET: string
    DATABASE_URL: string
    COINBASE_API_KEY: string
    COINBASE_WEBHOOK_SECRET: string
    SENTRY_DSN: string
    RESEND_API_KEY: string
    OPENAI_API_KEY: string
    IPMOBI_DB: D1Database
  }
  Variables: {
    requestId: string
    startTime: number
    db: DB
    userId: string
    userRole: string
    userEmail: string
    secureHeadersNonce: string
  }
}

// ─── App ──────────────────────────────────────────────────
const app = new Hono<Env>()

// ─── Middleware ────────────────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN
      if (allowed === '*' || !origin) return '*'
      return allowed
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID'],
    maxAge: 86400,
  }),
)

// ─── Request ID + DB ─────────────────────────────────────
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  c.set('startTime', Date.now())
  c.set('db', new DB(c.env.IPMOBI_DB))
  c.header('X-Request-ID', c.get('requestId'))
  await next()
})

// ─── Routes ────────────────────────────────────────────────
app.route('/health', healthRouter)
app.route('/api/v1/proxy', proxyRouter)
app.route('/api/v1/auth', authRouter)

app.get('/', (c) => {
  return c.json({
    message: 'IPMOBI API v1',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
})

// ─── 404 ───────────────────────────────────────────────────
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      requestId: c.get('requestId'),
    },
    404,
  )
})

// ─── Error Handler ─────────────────────────────────────────
app.onError((err, c) => {
  const requestId = c.get('requestId')
  console.error(`[${requestId}] Unhandled error:`, err)

  const sentryDsn = c.env.SENTRY_DSN
  if (sentryDsn) {
    // TODO: send to Sentry via fetch
  }

  return c.json(
    {
      error: 'Internal Server Error',
      message: c.env.ENVIRONMENT === 'production' ? 'Something went wrong' : err.message,
      requestId,
    },
    500,
  )
})

export default app
