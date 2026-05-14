-- ─── Migration 0007: Plans, subscriptions, payments, endpoints, usage ──

-- 1. Plans (套餐)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  traffic_gb INTEGER NOT NULL,
  requests_limit INTEGER NOT NULL,
  price_rm INTEGER NOT NULL,
  price_usdt INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 2. Subscriptions (用户订阅)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'active', 'expired', 'cancelled')),
  start_at INTEGER,
  end_at INTEGER,
  traffic_used_gb REAL DEFAULT 0,
  requests_used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);

-- 3. Payments (Coinbase Commerce)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_rm INTEGER NOT NULL,
  coinbase_charge_id TEXT UNIQUE,
  coinbase_hosted_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'completed', 'failed', 'expired')),
  paid_at INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge ON payments(coinbase_charge_id);

-- 4. Proxy Endpoints (代理端点)
CREATE TABLE IF NOT EXISTS proxy_endpoints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 3128,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'MY',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'expired', 'suspended', 'released')),
  assigned_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  released_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_endpoints_user ON proxy_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_sub ON proxy_endpoints(subscription_id);

-- 5. Usage Records (用量记录)
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  endpoint_id TEXT REFERENCES proxy_endpoints(id),
  bytes INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_sub ON usage_records(subscription_id);

-- 6. Seed plans
INSERT OR IGNORE INTO plans (id, name, traffic_gb, requests_limit, price_rm, price_usdt, is_active, sort_order, created_at)
VALUES
  ('plan_basic', 'Basic',   10,   50000,  29,  7, 1, 1, 0),
  ('plan_pro',  'Pro',     100,  500000, 99,  24, 1, 2, 0),
  ('plan_enterprise', 'Enterprise', 1000, 5000000, 499, 120, 1, 3, 0);
