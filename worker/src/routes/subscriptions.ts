import { Hono } from 'hono'
import type { Env } from '../types/index'
import { requireAuth } from '../middleware/auth'

export const subRouter = new Hono<Env>()

// POST /subscriptions — 创建订阅（发起支付）
subRouter.post('/', requireAuth, async (c) => {
  try {
    const body = await c.req.json<{ plan_id: string }>()
    if (!body.plan_id) return c.json({ error: 'plan_id required' }, 400)

    const db = c.get('db')
    const userId = c.get('userId')
    const now = Math.floor(Date.now() / 1000)

    // Verify plan exists and is active
    const plan = await c.env.IPMOBI_DB.prepare(
      'SELECT * FROM plans WHERE id = ? AND is_active = 1',
    ).bind(body.plan_id).first<any>()
    if (!plan) return c.json({ error: 'Invalid plan' }, 400)

    // Create subscription (pending until payment)
    const subId = 'sub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    await c.env.IPMOBI_DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
    ).bind(subId, userId, body.plan_id, now, now).run()

    // Create payment record
    const payId = 'pay_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    await c.env.IPMOBI_DB.prepare(
      `INSERT INTO payments (id, user_id, subscription_id, plan_id, amount_rm, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).bind(payId, userId, subId, body.plan_id, plan.price_rm, now + 3600, now).run()

    // Generate Coinbase Commerce charge URL
    const coinbaseUrl = await createCoinbaseCharge(
      c.env.COINBASE_API_KEY,
      payId,
      plan.name,
      plan.price_usdt,
      userId,
    )

    if (coinbaseUrl) {
      await c.env.IPMOBI_DB.prepare(
        'UPDATE payments SET coinbase_hosted_url = ? WHERE id = ?',
      ).bind(coinbaseUrl, payId).run()
    }

    await db.logAudit({
      user_id: userId, action: 'sub_create', target_type: 'subscription',
      target_id: subId, ip_address: c.req.header('CF-Connecting-IP') || null,
      user_agent: c.req.header('user-agent') || null, created_at: now,
    })

    return c.json({
      subscription: { id: subId, plan_id: body.plan_id, status: 'pending' },
      payment: { id: payId, amount_rm: plan.price_rm, hosted_url: coinbaseUrl || null },
    }, 201)
  } catch (err) {
    console.error('Sub create error:', err)
    return c.json({ error: 'Failed to create subscription' }, 500)
  }
})

// GET /subscriptions — 当前用户订阅列表
subRouter.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.IPMOBI_DB.prepare(
    `SELECT s.*, p.name as plan_name, p.traffic_gb, p.requests_limit
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ? ORDER BY s.created_at DESC`,
  ).bind(userId).all<any>()
  return c.json({ subscriptions: results || [] })
})

// GET /subscriptions/:id — 单条订阅详情
subRouter.get('/:id', requireAuth, async (c) => {
  const sub = await c.env.IPMOBI_DB.prepare(
    `SELECT s.*, p.name as plan_name, p.traffic_gb, p.requests_limit
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.id = ? AND s.user_id = ?`,
  ).bind(c.req.param('id'), c.get('userId')).first<any>()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)
  return c.json({ subscription: sub })
})

// ─── Coinbase Commerce helpers ──────────────────────────────
async function createCoinbaseCharge(
  apiKey: string, payId: string, planName: string,
  amountUsdt: number, userId: string,
): Promise<string | null> {
  if (!apiKey) return null
  try {
    const resp = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `IPMOBI ${planName} Plan`,
        description: `IPMOBI proxy subscription - ${planName}`,
        pricing_type: 'fixed_price',
        local_price: { amount: String(amountUsdt), currency: 'USDT' },
        metadata: { payment_id: payId, user_id: userId },
        redirect_url: 'https://portal.ipmobi.net/billing?success=1',
        cancel_url: 'https://portal.ipmobi.net/billing?cancelled=1',
      }),
    })
    const data: any = await resp.json()
    return data?.data?.hosted_url || null
  } catch (err) {
    console.error('Coinbase charge error:', err)
    return null
  }
}
