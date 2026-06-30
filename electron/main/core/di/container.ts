type Factory<T> = () => T

interface Registration<T> {
  factory: Factory<T>
  singleton: boolean
  instance?: T
}

/**
 * Zero-dependency DI container for the Electron main process.
 * Identical in behaviour to the renderer container but intentionally
 * kept separate — main and renderer are independent process boundaries.
 */
class MainContainer {
  private readonly registry = new Map<symbol, Registration<unknown>>()

  register<T>(token: symbol, factory: Factory<T>, options: { singleton?: boolean } = {}): this {
    this.registry.set(token, {
      factory: factory as Factory<unknown>,
      singleton: options.singleton ?? true,
    })
    return this
  }

  resolve<T>(token: symbol): T {
    const reg = this.registry.get(token)
    if (!reg) {
      throw new Error(`[MainDI] No registration for token: ${token.toString()}`)
    }
    if (reg.singleton) {
      if (reg.instance === undefined) {
        reg.instance = reg.factory()
      }
      return reg.instance as T
    }
    return reg.factory() as T
  }

  has(token: symbol): boolean {
    return this.registry.has(token)
  }

  /** Wipe all registrations — used in tests or full restarts */
  reset(): void {
    this.registry.clear()
  }
}

export const mainContainer = new MainContainer()
