import type { D1Database } from '@cloudflare/workers-types'

// ─── IPMOBI API — Type Definitions ─────────────────────────

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

export type AuditLogRow = {
  id: string
  user_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: number
}

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
    db: any
    userId: string
    userRole: string
    userEmail: string
    secureHeadersNonce: string
  }
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
