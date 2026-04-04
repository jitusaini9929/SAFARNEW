import dotenv from "dotenv";
import path from "path";
import fs from "fs";

let hasLoadedEnv = false;

export function loadEnv() {
  if (hasLoadedEnv) return;
  hasLoadedEnv = true;

  const cwd = process.cwd();
  const isRender =
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.RENDER_INSTANCE_ID) ||
    Boolean(process.env.RENDER_EXTERNAL_URL);

  // Private env takes priority when present.
  dotenv.config({ path: path.join(cwd, ".env") });
  // Public, commit-safe defaults for non-sensitive config.
  dotenv.config({ path: path.join(cwd, ".env_open") });
  // Render dev server defaults (only when running on Render).
  if (isRender) {
    const renderDevPath = path.join(cwd, ".env.render-dev");
    if (fs.existsSync(renderDevPath)) {
      dotenv.config({ path: renderDevPath });
    }
  }
}

loadEnv();
