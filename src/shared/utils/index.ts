/** Generate a short random ID (not cryptographically secure) */
export function generateId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 9)
  return prefix ? `${prefix}_${rand}` : rand
}

/** Type-safe Object.entries */
export function entries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

/** Exhaustive check helper for switch statements */
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`)
}
