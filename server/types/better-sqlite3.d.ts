declare module "better-sqlite3" {
  class Statement {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  }

  export default class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare(sql: string): Statement;
    close(): void;
  }
}
