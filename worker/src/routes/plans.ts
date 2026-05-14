import { Hono } from 'hono'
import type { Env } from '../types/index'
import { requireAuth } from '../middleware/auth'

export const planRouter = new Hono<Env>()

// GET /plans — 获取所有可用套餐
planRouter.get('/', async (c) => {
  const { results } = await c.env.IPMOBI_DB.prepare(
    'SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC',
  ).all<any>()
  return c.json({ plans: results || [] })
})

// GET /plans/:id — 获取单个套餐
planRouter.get('/:id', async (c) => {
  const plan = await c.env.IPMOBI_DB.prepare(
    'SELECT * FROM plans WHERE id = ? AND is_active = 1',
  ).bind(c.req.param('id')).first<any>()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)
  return c.json({ plan })
})
