import { BrowserWindow, shell } from 'electron'

import type { WindowState } from '../../shared/config-schema'
import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'
import type { ConfigService } from './ConfigService'
import type { EnvironmentManager } from './EnvironmentManager'

export interface CreateWindowOptions {
  label?: string
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
}

interface ManagedWindow {
  window: BrowserWindow
  label: string
}

export class WindowManager {
  private readonly windows = new Map<number, ManagedWindow>()

  constructor(
    private readonly env: EnvironmentManager,
    private readonly config: ConfigService,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {}

  // ---------------------------------------------------------------------------

  createMainWindow(options: CreateWindowOptions = {}): BrowserWindow {
    const savedState = this.config.get('window')
    const label = options.label ?? 'main'

    const win = new BrowserWindow({
      width: options.width ?? savedState.width,
      height: options.height ?? savedState.height,
      minWidth: options.minWidth ?? 800,
      minHeight: options.minHeight ?? 600,
      ...(savedState.x !== null && savedState.y !== null
        ? { x: savedState.x, y: savedState.y }
        : {}),
      show: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0d0d0d',
        symbolColor: '#ffffff',
        height: 32,
      },
      backgroundColor: '#0d0d0d',
      webPreferences: {
        preload: this.env.getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    })

    this.registerWindowEvents(win, label)
    this.loadContent(win)

    if (savedState.isMaximized) {
      win.maximize()
    }

    this.logger.info(`Window created [${label}] id=${win.id}`)
    return win
  }

  getWindow(id: number): BrowserWindow | null {
    return this.windows.get(id)?.window ?? null
  }

  getMainWindow(): BrowserWindow | null {
    for (const { window, label } of this.windows.values()) {
      if (label === 'main') return window
    }
    return null
  }

  getAllWindows(): BrowserWindow[] {
    return [...this.windows.values()].map((m) => m.window)
  }

  closeAll(): void {
    for (const { window } of this.windows.values()) {
      window.destroy()
    }
    this.windows.clear()
  }

  // ---------------------------------------------------------------------------

  private loadContent(win: BrowserWindow): void {
    if (this.env.devServerUrl) {
      void win.loadURL(this.env.devServerUrl)
    } else {
      void win.loadFile(this.env.getRendererPath())
    }
  }

  private registerWindowEvents(win: BrowserWindow, label: string): void {
    const id = win.id

    this.windows.set(id, { window: win, label })
    this.eventBus.emit('window:created', { id, label })

    win.once('ready-to-show', () => {
      win.show()
      if (this.env.isDev) win.webContents.openDevTools()
    })

    win.on('closed', () => {
      this.windows.delete(id)
      this.eventBus.emit('window:closed', { id })
      this.logger.info(`Window closed [${label}] id=${id}`)
    })

    win.on('focus', () => this.eventBus.emit('window:focused', { id }))
    win.on('blur', () => this.eventBus.emit('window:blurred', { id }))

    win.on('maximize', () => {
      this.eventBus.emit('window:maximized', { id })
      win.webContents.send('window:push-maximized')
    })

    win.on('unmaximize', () => {
      this.eventBus.emit('window:unmaximized', { id })
      win.webContents.send('window:push-unmaximized')
    })

    win.on('resize', () => {
      const { width, height } = win.getBounds()
      this.eventBus.emit('window:resized', { id, width, height })
    })

    win.on('moved', () => {
      const { x, y } = win.getBounds()
      this.eventBus.emit('window:moved', { id, x, y })
    })

    // Persist window state on close
    win.on('close', () => {
      if (!win.isDestroyed()) {
        this.persistWindowState(win)
      }
    })

    // Open external links in the system browser
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    })
  }

  private persistWindowState(win: BrowserWindow): void {
    const isMaximized = win.isMaximized()
    const bounds = win.getNormalBounds()
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
    }
    this.config.set('window', state)
  }
}
