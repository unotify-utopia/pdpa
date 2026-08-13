CREATE TABLE IF NOT EXISTS workflow_states (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  label_th    VARCHAR(200) NOT NULL,
  label_en    VARCHAR(200) NOT NULL,
  color       VARCHAR(20) DEFAULT 'gray',
  is_terminal BOOLEAN DEFAULT FALSE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id               SERIAL PRIMARY KEY,
  from_state       VARCHAR(100) REFERENCES workflow_states(name),
  to_state         VARCHAR(100) REFERENCES workflow_states(name),
  allowed_roles    TEXT[],
  requires_comment BOOLEAN DEFAULT FALSE,
  auto_notify      BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP DEFAULT NOW()
);
