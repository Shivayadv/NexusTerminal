export interface Workspace {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  layout_id: string | null
  last_opened_at: number | null
  created_at: number
  updated_at: number
}

export interface Session {
  id: string
  workspace_id: string | null
  name: string
  shell: string
  cwd: string | null
  env_overrides: string
  status: 'active' | 'idle' | 'closed'
  pid: number | null
  created_at: number
  updated_at: number
}

export interface Setting {
  key: string
  value: string
  updated_at: number
}

export interface Layout {
  id: string
  name: string
  config: string
  is_default: number
  created_at: number
  updated_at: number
}

export interface RecentProject {
  id: string
  path: string
  name: string
  last_opened_at: number
  open_count: number
}

export interface AppState {
  key: string
  value: string
  updated_at: number
}
