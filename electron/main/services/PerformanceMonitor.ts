import type { Logger } from '../core/logger/Logger'

interface MemSnapshot {
  heapUsedMb: number
  heapTotalMb: number
  rssMb: number
  externalMb: number
}

const MB = 1024 * 1024

export class PerformanceMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly heapWarnThresholdMb: number
  private lastSnapshot: MemSnapshot | null = null

  constructor(
    private readonly logger: Logger,
    private readonly intervalMs = 60_000,   // check every minute
    heapWarnThresholdMb = 512,              // warn above 512 MB
  ) {
    this.heapWarnThresholdMb = heapWarnThresholdMb
  }

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => { this.sample() }, this.intervalMs)
    // Allow the process to exit even if this interval is running
    this.intervalId.unref?.()
    this.logger.debug('PerformanceMonitor started', {
      intervalMs: this.intervalMs,
      heapWarnThresholdMb: this.heapWarnThresholdMb,
    })
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getLastSnapshot(): MemSnapshot | null {
    return this.lastSnapshot
  }

  private sample(): void {
    const usage = process.memoryUsage()
    const snap: MemSnapshot = {
      heapUsedMb: Math.round(usage.heapUsed / MB),
      heapTotalMb: Math.round(usage.heapTotal / MB),
      rssMb: Math.round(usage.rss / MB),
      externalMb: Math.round(usage.external / MB),
    }
    this.lastSnapshot = snap

    if (snap.heapUsedMb > this.heapWarnThresholdMb) {
      this.logger.warn('High heap usage', snap)
    } else {
      this.logger.debug('Memory snapshot', snap)
    }
  }
}
