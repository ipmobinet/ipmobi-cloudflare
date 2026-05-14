import { Hono } from 'hono'
import type { Env } from '../types/index'

export const payRouter = new Hono<Env>()

// POST /payments/coinbase/webhook — Coinbase Commerce 支付回调
payRouter.post('/coinbase/webhook', async (c) => {
  try {
    const body: any = await c.req.json()
    const event = body.event
    if (!event) return c.json({ error: 'Invalid event' }, 400)

    // Only process charges
    if (event.type !== 'charge:confirmed' && event.type !== 'charge:failed') {
      return c.json({ received: true })
    }

    const chargeId = event.data?.id
    const metadata = event.data?.metadata || {}
    const payId = metadata.payment_id
    if (!chargeId || !payId) return c.json({ error: 'Missing data' }, 400)

    const now = Math.floor(Date.now() / 1000)

    if (event.type === 'charge:confirmed') {
      // Mark payment completed
      await c.env.IPMOBI_DB.prepare(
        `UPDATE payments SET status = 'completed', coinbase_charge_id = ?, paid_at = ? WHERE id = ? AND status = 'pending'`,
      ).bind(chargeId, now, payId).run()

      // Activate subscription
      const payment = await c.env.IPMOBI_DB.prepare(
        'SELECT * FROM payments WHERE id = ?',
      ).bind(payId).first<any>()

      if (payment && payment.subscription_id) {
        await c.env.IPMOBI_DB.prepare(
          `UPDATE subscriptions SET status = 'active', start_at = ?, end_at = ?, updated_at = ? WHERE id = ?`,
        ).bind(now, now + 30 * 86400, now, payment.subscription_id).run()

        // Assign proxy endpoint
        const endpointId = 'ep_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        await c.env.IPMOBI_DB.prepare(
          `INSERT INTO proxy_endpoints (id, user_id, subscription_id, host, port, username, password, country, status, assigned_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'MY', 'active', ?, ?)`,
        ).bind(endpointId, payment.user_id, payment.subscription_id,
          'my.proxy.ipmobi.net', 3128,
          'user_' + payment.user_id.slice(-8),
          crypto.randomUUID().replace(/-/g, '').slice(0, 12),
          now, now + 30 * 86400).run()
      }
    } else {
      // Payment failed
      await c.env.IPMOBI_DB.prepare(
        "UPDATE payments SET status = 'failed', coinbase_charge_id = ? WHERE id = ?",
      ).bind(chargeId, payId).run()
    }

    return c.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// GET /payments — 当前用户支付记录
payRouter.get('/', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  const { verifyToken } = await import('../utils/jwt')
  const payload = await verifyToken(authHeader.slice(7), c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { results } = await c.env.IPMOBI_DB.prepare(
    `SELECT pay.*, pl.name as plan_name FROM payments pay
     JOIN plans pl ON pl.id = pay.plan_id
     WHERE pay.user_id = ? ORDER BY pay.created_at DESC`,
  ).bind(payload.user_id as string).all<any>()

  return c.json({ payments: results || [] })
})
