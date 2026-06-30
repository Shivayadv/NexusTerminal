import { randomUUID } from 'crypto'
import type { DatabaseService } from '../DatabaseService'

export abstract class BaseRepository {
  constructor(protected readonly db: DatabaseService) {}

  protected genId(): string {
    return randomUUID()
  }

  protected now(): number {
    return Math.floor(Date.now() / 1000)
  }
}
