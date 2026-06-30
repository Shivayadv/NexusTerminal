export type ErrorCode =
  | 'UNKNOWN'
  | 'SESSION_NOT_FOUND'
  | 'TERMINAL_INIT_FAILED'
  | 'IPC_ERROR'
  | 'CONFIG_INVALID'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }

  static from(cause: unknown, code: ErrorCode = 'UNKNOWN'): AppError {
    if (cause instanceof AppError) return cause
    const message = cause instanceof Error ? cause.message : String(cause)
    return new AppError(code, message, cause)
  }
}
