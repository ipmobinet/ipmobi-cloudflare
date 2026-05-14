-- ─── IPMOBI D1 Database Schema — Phase 2 ───────────────────────
-- Migration 0001: Initial schema (users, sessions, api_keys, 
--                 proxy_assignments, billing, audit_logs)

-- ─── 1. Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client_b'
    CHECK(role IN ('client_b', 'client_a', 'admin', 'superadmin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── 2. Sessions (refresh tokens) ──────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ─── 3. API Keys ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,          -- first 8 chars for display
  scopes TEXT NOT NULL DEFAULT 'read', -- comma-separated: read,write,admin
  last_used_at INTEGER,
  expires_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- ─── 4. Proxy Assignments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS proxy_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proxy_ip TEXT NOT NULL,
  proxy_port INTEGER NOT NULL DEFAULT 3128,
  country TEXT NOT NULL DEFAULT 'MY',
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'expired', 'suspended')),
  bandwidth_bytes INTEGER NOT NULL DEFAULT 0,
  assigned_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  released_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON proxy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON proxy_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_expires ON proxy_assignments(expires_at);

-- ─── 5. Billing / Invoices ─────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,      -- in US cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  description TEXT,
  payment_method TEXT,                 -- 'coinbase', 'manual', etc.
  payment_tx_id TEXT,                  -- coinbase charge ID
  paid_at INTEGER,
  due_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);

-- ─── 6. Audit Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,                        -- NULL for anonymous actions
  action TEXT NOT NULL,                -- 'login', 'register', 'proxy_assign', etc.
  resource_type TEXT,                  -- 'user', 'proxy', 'billing', etc.
  resource_id TEXT,                    -- ID of affected resource
  details TEXT,                        -- JSON blob
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ─── 7. Settings (key-value for system config) ─────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at INTEGER NOT NULL
);

-- ─── Seed: default settings ─────────────────────────────────
INSERT OR IGNORE INTO settings (key, value, description, updated_at)
VALUES 
  ('proxy_default_ttl_hours', '24', 'Default proxy assignment TTL in hours', 0),
  ('proxy_price_per_gb_cents', '27', 'Price per GB in US cents', 0),
  ('max_proxies_per_user', '50', 'Max concurrent proxy assignments per user', 0),
  ('jwt_access_ttl_minutes', '15', 'JWT access token lifetime in minutes', 0),
  ('jwt_refresh_ttl_days', '30', 'Refresh token lifetime in days', 0);
