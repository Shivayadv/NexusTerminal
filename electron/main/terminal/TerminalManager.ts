import { randomUUID } from 'crypto'

import type { Logger } from '../core/logger/Logger'
import type { MainEventBus } from '../core/events/MainEventBus'
import type { TerminalCreateOptions, TerminalDto, ShellType } from '../../shared/terminal'
import { PtyManager } from './PtyManager'

type DataListener = (id: string, data: string) => void
type ExitListener = (id: string, code: number) => void

export class TerminalManager {
  private readonly pty: PtyManager
  private readonly dataListeners = new Set<DataListener>()
  private readonly exitListeners = new Set<ExitListener>()

  constructor(
    ptyManager: PtyManager,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {
    this.pty = ptyManager

    this.pty.onData((id, data) => {
      this.dataListeners.forEach((fn) => fn(id, data))
    })

    this.pty.onExit((id, code) => {
      this.exitListeners.forEach((fn) => fn(id, code))
      this.eventBus.emit('terminal:exited', { id, code })
      this.logger.debug('Terminal exited', { id, code })
    })
  }

  create(options?: TerminalCreateOptions): TerminalDto {
    const id = randomUUID()
    const { pid, cols, rows } = this.pty.spawn(id, options ?? {})
    const shellType = (options?.shellType ?? 'powershell') as ShellType
    const dto: TerminalDto = {
      id,
      shellType,
      pid,
      cols,
      rows,
      createdAt: Math.floor(Date.now() / 1000),
    }
    this.eventBus.emit('terminal:created', { id, pid, shellType })
    this.logger.info('Terminal created', { id, pid, shellType, cols, rows })
    return dto
  }

  kill(id: string): void {
    this.pty.kill(id)
    this.eventBus.emit('terminal:killed', { id })
  }

  input(id: string, data: string): void {
    this.pty.write(id, data)
  }

  resize(id: string, cols: number, rows: number): void {
    this.pty.resize(id, cols, rows)
  }

  list(): TerminalDto[] {
    return this.pty.listIds().map((id) => {
      const session = this.pty.getSession(id)!
      return {
        id,
        shellType: session.shellType,
        pid: session.pty.pid,
        cols: session.cols,
        rows: session.rows,
        createdAt: session.createdAt,
      }
    })
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener)
    return () => this.exitListeners.delete(listener)
  }

  destroy(): void {
    this.pty.killAll()
    this.dataListeners.clear()
    this.exitListeners.clear()
  }
}
