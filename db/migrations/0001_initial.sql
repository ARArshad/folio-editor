CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  content TEXT NOT NULL CHECK(json_valid(content)),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX documents_owner_idx ON documents(owner_id);
CREATE TABLE document_shares (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(document_id, user_id)
);
CREATE INDEX shares_user_idx ON document_shares(user_id);
