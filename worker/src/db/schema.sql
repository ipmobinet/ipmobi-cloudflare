     1|-- ─── IPMOBI — Complete D1 Database Schema ─────────────────
     2|
     3|-- 1. Users
     4|CREATE TABLE IF NOT EXISTS users (
     5|  id TEXT PRIMARY KEY,
     6|  email TEXT UNIQUE NOT NULL,
     7|  password_hash TEXT NOT NULL,
     8|  full_name TEXT,
     9|  role TEXT NOT NULL DEFAULT 'client_b'
    10|    CHECK(role IN ('client_b', 'client_a', 'admin', 'superadmin')),
    11|  is_active INTEGER NOT NULL DEFAULT 1,
    12|  created_at INTEGER NOT NULL,
    13|  updated_at INTEGER NOT NULL
    14|);
    15|
    16|-- 2. Sessions (JWT blacklist)
    17|CREATE TABLE IF NOT EXISTS sessions (
    18|  id TEXT PRIMARY KEY,
    19|  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    20|  token TEXT UNIQUE NOT NULL,
    21|  expires_at INTEGER NOT NULL,
    22|  created_at INTEGER NOT NULL
    23|);
    24|
    25|-- 3. API Keys
    26|CREATE TABLE IF NOT EXISTS api_keys (
    27|  id TEXT PRIMARY KEY,
    28|  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    29|  key_hash TEXT UNIQUE NOT NULL,
    30|  name TEXT NOT NULL,
    31|  last_used_at INTEGER,
    32|  expires_at INTEGER,
    33|  is_active INTEGER DEFAULT 1,
    34|  created_at INTEGER NOT NULL
    35|);
    36|
    37|-- 4. Proxy Assignments
    38|CREATE TABLE IF NOT EXISTS proxy_assignments (
    39|  id TEXT PRIMARY KEY,
    40|  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    41|  proxy_ip TEXT NOT NULL,
    42|  proxy_port INTEGER NOT NULL DEFAULT 3128,
    43|  country TEXT NOT NULL DEFAULT 'MY',
    44|  username TEXT NOT NULL,
    45|  password TEXT NOT NULL,
    46|  status TEXT NOT NULL DEFAULT 'active'
    47|    CHECK(status IN ('active', 'expired', 'suspended')),
    48|  bandwidth_bytes INTEGER NOT NULL DEFAULT 0,
    49|  assigned_at INTEGER NOT NULL,
    50|  expires_at INTEGER NOT NULL,
    51|  released_at INTEGER
    52|);
    53|
    54|-- 5. Billing / Invoices
    55|CREATE TABLE IF NOT EXISTS billing (
    56|  id TEXT PRIMARY KEY,
    57|  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    58|  invoice_number TEXT NOT NULL UNIQUE,
    59|  amount_cents INTEGER NOT NULL,
    60|  currency TEXT NOT NULL DEFAULT 'USD',
    61|  status TEXT NOT NULL DEFAULT 'pending'
    62|    CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
    63|  description TEXT,
    64|  payment_method TEXT,
    65|  payment_tx_id TEXT,
    66|  paid_at INTEGER,
    67|  due_at INTEGER NOT NULL,
    68|  created_at INTEGER NOT NULL
    69|);
    70|
    71|-- 6. Devices (5G modems)
    72|CREATE TABLE IF NOT EXISTS devices (
    73|  id TEXT PRIMARY KEY,
    74|  serial_no TEXT UNIQUE NOT NULL,
    75|  user_id TEXT,
    76|  firmware_version TEXT,
    77|  ip_address TEXT,
    78|  last_seen_at INTEGER,
    79|  status TEXT DEFAULT 'offline'
    80|    CHECK(status IN ('online', 'offline', 'maintenance')),
    81|  sim_usage_gb REAL DEFAULT 0,
    82|  signal_strength INTEGER,
    83|  created_at INTEGER NOT NULL,
    84|  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    85|);
    86|
    87|-- 7. Audit Logs
    88|CREATE TABLE IF NOT EXISTS audit_logs (
    89|  id TEXT PRIMARY KEY,
    90|  user_id TEXT,
    91|  action TEXT NOT NULL,
    92|  target_type TEXT,
    93|  target_id TEXT,
    94|  ip_address TEXT,
    95|  user_agent TEXT,
    96|  created_at INTEGER NOT NULL
    97|);
    98|
    99|-- 8. System Settings
   100|CREATE TABLE IF NOT EXISTS settings (
   101|  key TEXT PRIMARY KEY,
   102|  value TEXT NOT NULL,
   103|  description TEXT,
   104|  updated_at INTEGER NOT NULL
   105|);
   106|
   107|-- ─── Indexes ───────────────────────────────────────────────
   108|CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   109|CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
   110|CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
   111|CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
   112|CREATE INDEX IF NOT EXISTS idx_devices_serial_no ON devices(serial_no);
   113|CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
   114|CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
   115|CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
   116|
   117|-- 9. Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, traffic_gb INTEGER NOT NULL,
  requests_limit INTEGER NOT NULL, price_rm INTEGER NOT NULL, price_usdt INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);

-- 10. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','expired','cancelled')),
  start_at INTEGER, end_at INTEGER, traffic_used_gb REAL DEFAULT 0, requests_used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);

-- 11. Payments (Coinbase Commerce)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT REFERENCES subscriptions(id), plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_rm INTEGER NOT NULL, coinbase_charge_id TEXT UNIQUE, coinbase_hosted_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','expired')),
  paid_at INTEGER, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);

-- 12. Proxy Endpoints
CREATE TABLE IF NOT EXISTS proxy_endpoints (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  host TEXT NOT NULL, port INTEGER NOT NULL DEFAULT 3128,
  username TEXT NOT NULL, password TEXT NOT NULL, country TEXT NOT NULL DEFAULT 'MY',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','suspended','released')),
  assigned_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, released_at INTEGER
);

-- 13. Usage Records
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  endpoint_id TEXT REFERENCES proxy_endpoints(id),
  bytes INTEGER NOT NULL DEFAULT 0, requests INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL, created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge ON payments(coinbase_charge_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_user ON proxy_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_sub ON proxy_endpoints(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_sub ON usage_records(subscription_id);

-- ─── Default Settings ──────────────────────────────────────
   118|INSERT OR IGNORE INTO settings (key, value, description, updated_at)
   119|VALUES
   120|  ('proxy_default_ttl_hours', '24', 'Default proxy assignment TTL in hours', 0),
   121|  ('proxy_price_per_gb_cents', '27', 'Price per GB in US cents', 0),
   122|  ('max_proxies_per_user', '50', 'Max concurrent proxy assignments per user', 0),
   123|  ('jwt_access_ttl_minutes', '15', 'JWT access token lifetime in minutes', 0),
   124|  ('jwt_refresh_ttl_days', '30', 'Refresh token lifetime in days', 0);
   125|