import type { Migration } from './index'

export const migration002: Migration = {
  version: 2,
  name: 'workspace_last_opened',
  up: `ALTER TABLE workspaces ADD COLUMN last_opened_at INTEGER;`,
}
