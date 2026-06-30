import { existsSync } from 'fs'

import { spawn } from 'node-pty'
import type { IPty } from 'node-pty'

import type { Logger } from '../core/logger/Logger'
import type { ShellType, TerminalCreateOptions } from '../../shared/terminal'

interface Session {
  pty: IPty
  shellType: ShellType
  cols: number
  rows: number
  createdAt: number
  disposers: (() => void)[]
}

type DataListener = (id: string, data: string) => void
type ExitListener = (id: string, code: number) => void

export class PtyManager {
  private readonly sessions = new Map<string, Session>()
  private readonly dataListeners = new Set<DataListener>()
  private readonly exitListeners = new Set<ExitListener>()

  constructor(private readonly logger: Logger) {}

  spawn(id: string, options: TerminalCreateOptions): { pid: number; cols: number; rows: number } {
    const shellType = options.shellType ?? 'powershell'
    const cols = options.cols ?? 80
    const rows = options.rows ?? 24
    const shell = PtyManager.resolveShell(shellType)
    const cwd = options.cwd ?? process.env['USERPROFILE'] ?? process.env['HOME'] ?? process.cwd()

    const ptyProcess = spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      useConpty: process.platform === 'win32',
    })

    const dataDisposer = ptyProcess.onData((data) => {
      this.dataListeners.forEach((fn) => fn(id, data))
    })

    const exitDisposer = ptyProcess.onExit(({ exitCode }) => {
      this.exitListeners.forEach((fn) => fn(id, exitCode ?? 0))
      this.sessions.delete(id)
    })

    this.sessions.set(id, {
      pty: ptyProcess,
      shellType,
      cols,
      rows,
      createdAt: Math.floor(Date.now() / 1000),
      disposers: [
        () => dataDisposer.dispose(),
        () => exitDisposer.dispose(),
      ],
    })

    this.logger.debug('PTY spawned', { id, shell, pid: ptyProcess.pid, cols, rows })
    return { pid: ptyProcess.pid, cols, rows }
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.pty.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id)
    if (!session) return
    session.pty.resize(cols, rows)
    session.cols = cols
    session.rows = rows
  }

  kill(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    session.disposers.forEach((d) => d())
    try {
      session.pty.kill()
    } catch {
      // process may have already exited
    }
    this.sessions.delete(id)
    this.logger.debug('PTY killed', { id })
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  listIds(): string[] {
    return Array.from(this.sessions.keys())
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.kill(id)
    }
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener)
    return () => this.exitListeners.delete(listener)
  }

  private static resolveShell(shellType: ShellType): string {
    switch (shellType) {
      case 'cmd':
        return 'cmd.exe'
      case 'gitbash': {
        const candidates = [
          'C:\\Program Files\\Git\\bin\\bash.exe',
          'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        ]
        return candidates.find((p) => existsSync(p)) ?? 'bash.exe'
      }
      case 'wsl':
        return 'wsl.exe'
      case 'powershell':
      default: {
        const pwsh = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
        return existsSync(pwsh) ? pwsh : 'powershell.exe'
      }
    }
  }
}
