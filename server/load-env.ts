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

  // Shared runtime defaults. This is intentionally loaded before .env so
  // deployed builds can rely on .env_open for feature-specific settings.
  dotenv.config({ path: path.join(cwd, ".env_open") });
  // Private env fills in values that are not already provided by host env or .env_open.
  dotenv.config({ path: path.join(cwd, ".env") });
  // Render dev server defaults (only when running on Render).
  if (isRender) {
    const renderDevPath = path.join(cwd, ".env.render-dev");
    if (fs.existsSync(renderDevPath)) {
      dotenv.config({ path: renderDevPath });
    }
  }
}

loadEnv();
