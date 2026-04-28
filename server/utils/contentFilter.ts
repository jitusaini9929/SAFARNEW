/**
 * Content filter: blocks explicitly abusive words in English, Hindi, and Hinglish.
 *
 * Design philosophy:
 * - Hard-block: sexual slang, sexual acts, genitalia words, slurs.
 * - Do not block: emotional venting, strong frustration, criticism, sarcasm.
 *
 * Hindi patterns cover:
 * - Direct Unicode Devanagari strings
 * - Common romanized Hinglish transliterations with common spelling variations
 */

const ROMANIZED_PATTERNS: RegExp[] = [
  /\b(la[a]?[dt]|laa[dt])\s*(kar[uo]|karunga|karuunga|karega|karegi|karna|karo)\b/i,
  /la[a]?[dt]\s*kar/i,
  /\b(lund|l[auo]nd|lawda|lauda|la[w]?d[a]?)\b/i,
  /\b(chu+t|choo+t|ch[uo]+t(?:iya|iye|iye|ia|iyo)?)\b/i,
  /\b(g[ae][ae]?nd|gaand|gandu|ga[a]?nd[uo]?)\b/i,
  /\b(bhosd?i(?:ke|ka|ki)?|bhosad(?:ike|ika|iki)?|bhosdi)\b/i,
  /\b(madar(?:chod|chod|chood)|mader(?:chod|chood|cho+d))\b/i,
  /\b(mc)\b/i,
  /\b(behen(?:chod|chood|cho+d)|bhen(?:chod|chood|cho+d))\b/i,
  /\b(bc)\b/i,
  /\b(rand[iy]|rand[iy]khana)\b/i,
  /\b(haram[iy]|haraamzad[aeo]?|haramzad[aeo]?)\b/i,
  /\b(kamin[aeo]y?)\b/i,
  /\b(chu+tiya|chu+tiyo|chutiye)\b/i,
  /\b(fuck|fucking|fucked|mf|motherfucker)\b/i,
  /\b(bitch|bitches)\b/i,
  /\b(asshole|bastard|slut|whore)\b/i,
  /\b(rape|raped|rapist|sexual\s+assault|molestation|molesting)\b/i,
  /\b(choda|chodna|chodu|chod\s+dunga|chodenge|chodoge)\b/i,
  /\b(choos|chuso|choosna|choosle)\b/i,
];

const HINDI_UNICODE_PATTERNS: RegExp[] = [
  /चूत/u,
  /चूतिया/u,
  /चुतिया/u,
  /मादरचोद/u,
  /बहनचोद/u,
  /भोसड़ी/u,
  /भोसड़ीके/u,
  /भोसड़ीका/u,
  /गांड/u,
  /गांडू/u,
  /लंड/u,
  /लौड/u,
  /रंडी/u,
  /कमीना/u,
  /हरामी/u,
  /हरामज़ादा/u,
  /चोदना/u,
  /चोद/u,
  /लाड़\s*करूंगा/u,
  /लाड़\s*कर/u,
  /लाड\s*कर/u,
  /बलात्कार/u,
];

export function validateBlockedWords(value: unknown): { isBlocked: boolean; match: string | null } {
  const text = String(value ?? '').trim();

  for (const pattern of ROMANIZED_PATTERNS) {
    if (pattern.test(text)) {
      return { isBlocked: true, match: pattern.source };
    }
  }

  for (const pattern of HINDI_UNICODE_PATTERNS) {
    if (pattern.test(text)) {
      return { isBlocked: true, match: pattern.source };
    }
  }

  return { isBlocked: false, match: null };
}
