-- ─── Migration 0004: Devices table (5G modems) ────────────
-- Tracks physical 5G modems in the proxy farm.

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

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
