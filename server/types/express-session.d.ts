declare module "express-session" {
  export interface SessionData {
    userId?: string;
    [key: string]: unknown;
  }

  export interface Session extends SessionData {
    cookie?: {
      expires?: Date | string;
      maxAge?: number;
      [key: string]: unknown;
    };
    destroy(callback: (err?: unknown) => void): void;
  }

  export interface SessionOptions {
    store?: unknown;
    secret?: string | string[];
    resave?: boolean;
    saveUninitialized?: boolean;
    name?: string;
    cookie?: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: boolean | "lax" | "strict" | "none";
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  const session: (options?: SessionOptions) => unknown;
  export default session;
}

declare global {
  namespace Express {
    interface Request {
      session?: import("express-session").Session;
    }
  }
}

export {};
