import fs from 'fs'
import path from 'path'

import type { LogLevel } from '../../../shared/config-schema'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

export class Logger {
  // --- Static file-logging state shared across all Logger instances ---
  private static logFilePath: string | null = null
  private static pendingLines: string[] = []
  private static minLevel: LogLevel = 'debug'

  constructor(private readonly context: string) {}

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data)
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data)
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data)
  }

  error(message: string, data?: unknown): void {
    this.write('error', message, data)
  }

  /** Create a child logger that prefixes its context with this one's */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`)
  }

  // ---------------------------------------------------------------------------

  private write(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[Logger.minLevel]) return

    const ts = new Date().toISOString()
    const dataStr = data !== undefined ? ' ' + JSON.stringify(data) : ''
    const plain = `[${ts}] [${level.toUpperCase().padEnd(5)}] [${this.context}] ${message}${dataStr}`

    // Console — colorized
    const color = LEVEL_COLOR[level]
    console.error(
      `${DIM}${ts}${RESET} ${color}${level.toUpperCase().padEnd(5)}${RESET} ${DIM}[${this.context}]${RESET} ${message}${dataStr}`,
    )

    // File
    if (Logger.logFilePath) {
      try {
        fs.appendFileSync(Logger.logFilePath, plain + '\n', 'utf8')
      } catch {
        // Swallow — we cannot log the log failure recursively
      }
    } else {
      Logger.pendingLines.push(plain)
    }
  }

  // ---------------------------------------------------------------------------
  // Static lifecycle methods — called by bootstrap, not by individual services

  static initFileLogging(logDir: string): void {
    const date = new Date().toISOString().slice(0, 10)
    Logger.logFilePath = path.join(logDir, `nexus-${date}.log`)

    try {
      fs.mkdirSync(logDir, { recursive: true })
      if (Logger.pendingLines.length > 0) {
        fs.appendFileSync(Logger.logFilePath, Logger.pendingLines.join('\n') + '\n', 'utf8')
        Logger.pendingLines = []
      }
    } catch {
      Logger.logFilePath = null
    }
  }

  static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level
  }

  static getLogFilePath(): string | null {
    return Logger.logFilePath
  }
}
