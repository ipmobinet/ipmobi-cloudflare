-- ─── IPMOBI — Complete D1 Database Schema ─────────────────

-- 1. Users
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

-- 2. Sessions (JWT blacklist)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 3. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 4. Proxy Assignments
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

-- 5. Billing / Invoices
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  description TEXT,
  payment_method TEXT,
  payment_tx_id TEXT,
  paid_at INTEGER,
  due_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 6. Devices (5G modems)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  serial_no TEXT UNIQUE NOT NULL,
  user_id TEXT,
  firmware_version TEXT,
  ip_address TEXT,
  last_seen_at INTEGER,
  status TEXT DEFAULT 'offline'
    CHECK(status IN ('online', 'offline', 'maintenance')),
  sim_usage_gb REAL DEFAULT 0,
  signal_strength INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- 8. System Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at INTEGER NOT NULL
);

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial_no ON devices(serial_no);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ─── Default Settings ──────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value, description, updated_at)
VALUES
  ('proxy_default_ttl_hours', '24', 'Default proxy assignment TTL in hours', 0),
  ('proxy_price_per_gb_cents', '27', 'Price per GB in US cents', 0),
  ('max_proxies_per_user', '50', 'Max concurrent proxy assignments per user', 0),
  ('jwt_access_ttl_minutes', '15', 'JWT access token lifetime in minutes', 0),
  ('jwt_refresh_ttl_days', '30', 'Refresh token lifetime in days', 0);
