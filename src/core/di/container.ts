type Factory<T> = () => T

interface Registration<T> {
  factory: Factory<T>
  singleton: boolean
  instance?: T
}

/**
 * Minimal, zero-dependency DI container.
 *
 * Usage:
 *   container.register(TOKENS.EventBus, () => new EventBus(), { singleton: true })
 *   const bus = container.resolve<EventBus>(TOKENS.EventBus)
 */
class Container {
  private readonly registry = new Map<symbol, Registration<unknown>>()

  register<T>(token: symbol, factory: Factory<T>, options: { singleton?: boolean } = {}): void {
    this.registry.set(token, {
      factory: factory as Factory<unknown>,
      singleton: options.singleton ?? true,
    })
  }

  resolve<T>(token: symbol): T {
    const registration = this.registry.get(token)
    if (!registration) {
      throw new Error(`[DI] No registration found for token: ${token.toString()}`)
    }
    if (registration.singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory()
      }
      return registration.instance as T
    }
    return registration.factory() as T
  }

  has(token: symbol): boolean {
    return this.registry.has(token)
  }

  reset(): void {
    this.registry.clear()
  }
}

export const container = new Container()
