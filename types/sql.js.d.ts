/**
 * Type definitions for sql.js
 *
 * Partial types for the most commonly used features
 * Full types: https://github.com/sql-js/sql.js
 */

declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface SqlJsConfig {
    locateFile?: (filename: string) => string
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null)

    run(sql: string, params?: unknown[]): Database
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    each(
      sql: string,
      params: unknown[],
      callback: (row: unknown) => void,
      done: () => void
    ): Database
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
    create_function(name: string, func: (...args: unknown[]) => unknown): Database
  }

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export interface Statement {
    bind(values?: unknown[]): boolean
    step(): boolean
    get(params?: unknown[]): unknown[]
    getColumnNames(): string[]
    getAsObject(params?: unknown[]): Record<string, unknown>
    run(values?: unknown[]): void
    reset(): void
    free(): void
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
