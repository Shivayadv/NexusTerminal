/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron-renderer/electron-env" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_DEV_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
