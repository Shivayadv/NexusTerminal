import type { Migration } from './index'

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT,
      color       TEXT,
      icon        TEXT,
      layout_id   TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT    PRIMARY KEY,
      workspace_id  TEXT    REFERENCES workspaces(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      shell         TEXT    NOT NULL,
      cwd           TEXT,
      env_overrides TEXT    NOT NULL DEFAULT '{}',
      status        TEXT    NOT NULL DEFAULT 'closed'
                            CHECK (status IN ('active','idle','closed')),
      pid           INTEGER,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT    PRIMARY KEY,
      value      TEXT    NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS layouts (
      id         TEXT    PRIMARY KEY,
      name       TEXT    NOT NULL,
      config     TEXT    NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS recent_projects (
      id             TEXT    PRIMARY KEY,
      path           TEXT    NOT NULL UNIQUE,
      name           TEXT    NOT NULL,
      last_opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
      open_count     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key        TEXT    PRIMARY KEY,
      value      TEXT    NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `,
}
