-- ─── Migration 0006: Standardize indexes per spec ─────────
-- Add missing idx_devices_serial_no, rename audit indexes.

-- Add serial_no index on devices
CREATE INDEX IF NOT EXISTS idx_devices_serial_no ON devices(serial_no);

-- Drop old audit_logs indexes and recreate with spec names
DROP INDEX IF EXISTS idx_audit_user_id;
DROP INDEX IF EXISTS idx_audit_action;
DROP INDEX IF EXISTS idx_audit_created;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
