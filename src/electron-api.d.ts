// Declares the shape of window.electron exposed by the contextBridge in preload/index.ts.
import type { ElectronAPI } from '../electron/preload'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
