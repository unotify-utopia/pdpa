CREATE TABLE IF NOT EXISTS cookie_consent_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  action VARCHAR(50) NOT NULL,
  preferences JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cookie_session_id ON cookie_consent_logs(session_id);
