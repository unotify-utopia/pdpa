-- Migration Rollback: 002_account_lockout_down.sql
ALTER TABLE users
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS locked_until;

DROP INDEX IF EXISTS idx_users_locked_until;
