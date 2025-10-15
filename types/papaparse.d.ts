declare module 'papaparse' {
  export interface UnparseConfig {
    readonly quotes?: boolean | boolean[]
    readonly quoteChar?: string
    readonly escapeChar?: string
    readonly delimiter?: string
    readonly header?: boolean
    readonly newline?: string
  }

  export function unparse(
    data:
      | unknown[]
      | Record<string, unknown>
      | { fields?: readonly string[]; data: readonly unknown[][] },
    config?: UnparseConfig
  ): string
}
