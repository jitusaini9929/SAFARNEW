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

  // .env_open is committed and defines the canonical admin email list and
  // feature flags. Use override:true so the committed list always wins over
  // values injected by the hosting platform dashboard (e.g. Render) for keys
  // like ADMIN_EMAILS — this prevents stale dashboard values from blocking
  // admins.
  const envOpenPath = path.join(cwd, ".env_open");
  if (fs.existsSync(envOpenPath)) {
    const existingAdminEmails = process.env.ADMIN_EMAILS;
    dotenv.config({ path: envOpenPath, override: true });
    if (existingAdminEmails && process.env.ADMIN_EMAILS) {
      const mergedEmails = Array.from(
        new Set([...existingAdminEmails.split(","), ...process.env.ADMIN_EMAILS.split(",")])
      ).filter(Boolean).join(",");
      process.env.ADMIN_EMAILS = mergedEmails;
    }
  }

  // Private env fills in secrets (DB, JWT, etc.) that are NOT already
  // provided by the host env. Do NOT use override here so secrets set in the
  // hosting dashboard are not accidentally replaced.
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
