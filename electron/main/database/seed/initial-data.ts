export const SEED_WORKSPACES = [
  {
    id: 'ws-default',
    name: 'Default',
    description: 'Default workspace',
    color: '#6366f1',
    icon: 'terminal',
    layout_id: null as string | null,
  },
] as const

export const SEED_SETTINGS = [
  { key: 'theme', value: 'dark' },
  { key: 'fontSize', value: '14' },
  { key: 'fontFamily', value: 'JetBrains Mono' },
  { key: 'cursorStyle', value: 'block' },
  { key: 'scrollback', value: '10000' },
] as const

export const SEED_APP_STATE = [
  { key: 'onboarding.complete', value: 'false' },
  { key: 'lastOpenedWorkspace', value: 'ws-default' },
] as const
