const LANGUAGE_TOGGLE_ALLOWED_EMAILS = new Set([
  "steve123@example.com",
  "safarparmar0@gmail.com",
  "shashank181002@gmail.com",
]);

export const canAccessLanguageToggle = (email?: string | null) =>
  !!email && LANGUAGE_TOGGLE_ALLOWED_EMAILS.has(String(email).trim().toLowerCase());

