const BLOCKED_WORD_PATTERNS: RegExp[] = [
  /\b(fuck|fucking|fucked|mf|motherfucker)\b/i,
  /\b(bitch|bitches)\b/i,
  /\b(asshole|bastard|slut|whore)\b/i,
  /\b(chutiya|chu+tiya|bc|behenchod|bhenchod)\b/i,
  /\b(mc|madarchod|maderchod)\b/i,
  /\b(bhosdike|bhosdika|bhosadi(?:ke|ka)?)\b/i,
  /\b(gaand|gandu|lund|lawda|lauda)\b/i,
  /\b(randi|randi(?:khana)?)\b/i,
  /\b(harami|kamina|kaminey?)\b/i,
  /चूतिया/u,
  /मादरचोद/u,
  /बहनचोद/u,
  /भोसड़ीके/u,
  /भोसड़ीका/u,
  /गांडू/u,
  /कमीना/u,
  /हरामी/u,
  /रंडी/u,
];

export function validateBlockedWords(value: unknown) {
  const text = String(value ?? "").trim();
  const match = BLOCKED_WORD_PATTERNS.find((pattern) => pattern.test(text));

  return {
    isBlocked: Boolean(match),
    match: match?.source ?? null,
  };
}
