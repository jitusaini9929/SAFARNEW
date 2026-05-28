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

  // .env_open is committed and defines non-secret defaults (feature flags,
  // admin emails, etc.). Load WITHOUT override so Render-injected vars like
  // PORT are never stomped — but then explicitly merge ADMIN_EMAILS so the
  // committed admin list always supplements whatever the dashboard has.
  const envOpenPath = path.join(cwd, ".env_open");
  if (fs.existsSync(envOpenPath)) {
    const hostAdminEmails = process.env.ADMIN_EMAILS; // capture before dotenv touches it
    dotenv.config({ path: envOpenPath }); // no override — PORT etc. stay as Render set them
    // Merge: union of host-set emails + .env_open emails so neither source is lost
    const openAdminEmails = process.env.ADMIN_EMAILS;
    if (hostAdminEmails || openAdminEmails) {
      const merged = Array.from(
        new Set([
          ...(hostAdminEmails ?? "").split(","),
          ...(openAdminEmails ?? "").split(","),
        ])
      ).map((e) => e.trim()).filter(Boolean).join(",");
      process.env.ADMIN_EMAILS = merged;
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
