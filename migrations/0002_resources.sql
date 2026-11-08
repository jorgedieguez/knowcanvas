CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 180),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_resources_owner_created
  ON resources(owner_user_id, created_at DESC)
  WHERE deleted_at IS NULL;
