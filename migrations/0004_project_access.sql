ALTER TABLE projects ADD COLUMN access_level TEXT NOT NULL DEFAULT 'private'
  CHECK (access_level IN ('private', 'public_read', 'public_edit'));

CREATE INDEX idx_projects_public_updated
  ON projects(access_level, updated_at DESC)
  WHERE deleted_at IS NULL AND access_level != 'private';
