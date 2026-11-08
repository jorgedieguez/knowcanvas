PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_issuer TEXT NOT NULL,
  google_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  UNIQUE (google_issuer, google_subject)
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  settings_json TEXT NOT NULL DEFAULT '{}',
  seed_key TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (owner_user_id, seed_key)
);

CREATE INDEX idx_projects_owner_updated
  ON projects(owner_user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE canvases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  composition_json TEXT NOT NULL DEFAULT '{"version":1,"sections":[]}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_canvases_project ON canvases(project_id) WHERE deleted_at IS NULL;

CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES nodes(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('container', 'canvas')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  position INTEGER NOT NULL CHECK (position >= 0),
  canvas_id TEXT UNIQUE REFERENCES canvases(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (
    (kind = 'container' AND canvas_id IS NULL) OR
    (kind = 'canvas' AND canvas_id IS NOT NULL)
  )
);

CREATE INDEX idx_nodes_project_parent_position
  ON nodes(project_id, parent_id, position)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_parent ON nodes(parent_id);

CREATE TABLE publications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL CHECK (version > 0),
  snapshot_json TEXT NOT NULL,
  manifest_json TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  retired_at TEXT,
  UNIQUE (project_id, version)
);

CREATE INDEX idx_publications_project ON publications(project_id, version DESC);

