import dotenv from "dotenv";
import path from "path";

let hasLoadedEnv = false;

export function loadEnv() {
  if (hasLoadedEnv) return;
  hasLoadedEnv = true;

  const cwd = process.cwd();

  // Private env takes priority when present.
  dotenv.config({ path: path.join(cwd, ".env") });
  // Public, commit-safe defaults for non-sensitive config.
  dotenv.config({ path: path.join(cwd, ".env_open") });
}

loadEnv();
