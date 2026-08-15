-- Migration: 002_account_lockout.sql
-- Security: Add account lockout columns to users table (VULN-04)
-- failed_login_attempts: tracks consecutive password failures
-- locked_until: timestamp when the account will automatically unlock

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Index for lockout check on login
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until)
  WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN users.failed_login_attempts IS 'Consecutive failed login attempts. Resets to 0 on successful login.';
COMMENT ON COLUMN users.locked_until IS 'Account is locked until this timestamp. NULL means not locked.';
