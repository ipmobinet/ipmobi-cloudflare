import type { D1Database } from '@cloudflare/workers-types'

// ─── Row Types ───────────────────────────────────────────────
export type UserRow = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  role: 'client_b' | 'client_a' | 'admin' | 'superadmin'
  is_active: number
  created_at: number
  updated_at: number
}

export type SessionRow = {
  id: string
  user_id: string
  token: string
  expires_at: number
  created_at: number
}

export type ApiKeyRow = {
  id: string
  user_id: string
  key_hash: string
  name: string
  last_used_at: number | null
  expires_at: number | null
  is_active: number
  created_at: number
}

export type ProxyAssignmentRow = {
  id: string
  user_id: string
  proxy_ip: string
  proxy_port: number
  country: string
  username: string
  password: string
  status: 'active' | 'expired' | 'suspended'
  bandwidth_bytes: number
  assigned_at: number
  expires_at: number
  released_at: number | null
}

export type BillingRow = {
  id: string
  user_id: string
  invoice_number: string
  amount_cents: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  description: string | null
  payment_method: string | null
  payment_tx_id: string | null
  paid_at: number | null
  due_at: number
  created_at: number
}

export type AuditLogRow = {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: number
}

export type DeviceRow = {
  id: string
  serial_no: string
  user_id: string | null
  firmware_version: string | null
  ip_address: string | null
  last_seen_at: number | null
  status: 'online' | 'offline' | 'maintenance'
  sim_usage_gb: number
  signal_strength: number | null
  created_at: number
}

// ─── D1 Helpers ──────────────────────────────────────────────
export class DB {
  private d1: D1Database

  constructor(d1: D1Database) {
    this.d1 = d1
  }

  // ── Users ──────────────────────────────────
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const res = await this.d1.prepare(
      'SELECT * FROM users WHERE email = ?',
    ).bind(email).first<UserRow>()
    return res || null
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const res = await this.d1.prepare(
      'SELECT * FROM users WHERE id = ?',
    ).bind(id).first<UserRow>()
    return res || null
  }

  async createUser(user: Omit<UserRow, 'updated_at'>): Promise<void> {
    await this.d1.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      user.id, user.email, user.password_hash, user.full_name,
      user.role, user.is_active, user.created_at, user.created_at,
    ).run()
  }

  // ── Sessions ───────────────────────────────
  async createSession(session: Omit<SessionRow, 'id' | 'created_at'> & { id?: string; created_at?: number }): Promise<void> {
    const id = session.id || crypto.randomUUID()
    const now = session.created_at || Math.floor(Date.now() / 1000)
    await this.d1.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, session.user_id, session.token, session.expires_at, now).run()
  }

  async findSessionByToken(token: string): Promise<(SessionRow & { email: string; role: string }) | null> {
    const res = await this.d1.prepare(
      `SELECT s.*, u.email, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    ).bind(token, Math.floor(Date.now() / 1000)).first<any>()
    return res || null
  }

  async revokeSession(token: string): Promise<void> {
    await this.d1.prepare(
      'DELETE FROM sessions WHERE token = ?',
    ).bind(token).run()
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.d1.prepare(
      'DELETE FROM sessions WHERE user_id = ?',
    ).bind(userId).run()
  }

  // ── API Keys ───────────────────────────────
  async createApiKey(key: Omit<ApiKeyRow, 'id' | 'created_at'> & { id?: string; created_at?: number }): Promise<void> {
    const id = key.id || crypto.randomUUID()
    const now = key.created_at || Math.floor(Date.now() / 1000)
    await this.d1.prepare(
      `INSERT INTO api_keys (id, user_id, name, key_hash, last_used_at, expires_at, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, key.user_id, key.name, key.key_hash, key.last_used_at,
      key.expires_at, key.is_active, now).run()
  }

  async findApiKeysByUserId(userId: string): Promise<ApiKeyRow[]> {
    const res = await this.d1.prepare(
      'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
    ).bind(userId).all<ApiKeyRow>()
    return res.results || []
  }

  async findApiKeyByHash(keyHash: string): Promise<(ApiKeyRow & { user_id: string; role: string }) | null> {
    const res = await this.d1.prepare(
      `SELECT ak.*, u.email, u.role FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = ? AND ak.is_active = 1
       AND (ak.expires_at IS NULL OR ak.expires_at > ?)`,
    ).bind(keyHash, Math.floor(Date.now() / 1000)).first<any>()
    return res || null
  }

  // ── Proxy Assignments ──────────────────────
  async getProxyStats(): Promise<{ activeProxies: number; totalBandwidth: string; activeUsers: number }> {
    const [proxies, bandwidth, users] = await Promise.all([
      this.d1.prepare(
        "SELECT COUNT(*) as count FROM proxy_assignments WHERE status = 'active'",
      ).first<{ count: number }>(),
      this.d1.prepare(
        'SELECT COALESCE(SUM(bandwidth_bytes), 0) as total FROM proxy_assignments',
      ).first<{ total: number }>(),
      this.d1.prepare(
        "SELECT COUNT(DISTINCT user_id) as count FROM proxy_assignments WHERE status = 'active'",
      ).first<{ count: number }>(),
    ])
    const gb = ((bandwidth?.total || 0) / 1_073_741_824).toFixed(2)
    return {
      activeProxies: proxies?.count || 0,
      totalBandwidth: `${gb} GB`,
      activeUsers: users?.count || 0,
    }
  }

  async createAssignment(a: Omit<ProxyAssignmentRow, 'id'> & { id?: string }): Promise<void> {
    const id = a.id || crypto.randomUUID()
    await this.d1.prepare(
      `INSERT INTO proxy_assignments (id, user_id, proxy_ip, proxy_port, country, username, password, status, bandwidth_bytes, assigned_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, a.user_id, a.proxy_ip, a.proxy_port, a.country,
      a.username, a.password, a.status, a.bandwidth_bytes, a.assigned_at, a.expires_at).run()
  }

  // ── Audit Log ──────────────────────────────
  async logAudit(entry: Omit<AuditLogRow, 'id'> & { id?: string }): Promise<void> {
    const id = entry.id || crypto.randomUUID()
    await this.d1.prepare(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, entry.user_id, entry.action, entry.resource_type,
      entry.resource_id, entry.details, entry.ip_address, entry.user_agent,
      entry.created_at || Math.floor(Date.now() / 1000)).run()
  }

  // ── Health ─────────────────────────────────
  async ping(): Promise<boolean> {
    try {
      await this.d1.prepare('SELECT 1').first()
      return true
    } catch {
      return false
    }
  }
}
