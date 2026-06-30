type EventMap = Record<string, unknown>
type Listener<T> = (payload: T) => void

/**
 * Typed in-process event bus for decoupled cross-feature communication.
 */
export class EventBus<Events extends EventMap = EventMap> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown>>>()

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>)
    return () => this.off(event, listener)
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload))
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const unsubscribe = this.on(event, (payload) => {
      listener(payload)
      unsubscribe()
    })
  }
}
