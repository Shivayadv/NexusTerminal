/** Utility: make selected keys required */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/** Utility: deep readonly */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/** Branded type helper for nominal typing */
export type Brand<T, B extends string> = T & { readonly __brand: B }

export type SessionId = Brand<string, 'SessionId'>
export type TerminalId = Brand<string, 'TerminalId'>
