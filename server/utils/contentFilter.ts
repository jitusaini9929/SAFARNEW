/**
 * Content filter: blocks explicitly abusive words in English and Hindi/Hinglish.
 * 
 * Design philosophy:
 * - Hard-block: sexual slang, sexual acts, genitalia words, slurs.
 * - Do NOT block: emotional venting, strong frustration, criticism, sarcasm.
 * 
 * Hindi patterns cover:
 * - Direct Unicode Devanagari strings
 * - Common romanized Hinglish transliterations with common spelling variations
 */

// ─── Romanized Hinglish patterns (case-insensitive word-boundary) ───────────
const ROMANIZED_PATTERNS: RegExp[] = [
  // Sexual slang — "laad/lad/lund" family (the word in the screenshot)
  /\b(la[a]?[dt]|laa[dt])\s*(kar[uo]|karunga|karuunga|karega|karegi|karna|karo)\b/i,
  // "laad karunga thaade" / "laad karunga thande" pattern
  /la[a]?[dt]\s*kar/i,
  // lund / lawda / lauda
  /\b(lund|l[auo]nd|lawda|lauda|la[w]?d[a]?)\b/i,
  // chut / choot family
  /\b(chu+t|choo+t|ch[uo]+t(?:iya|iye|iye|ia|iyo)?)\b/i,
  // gaand / gand family
  /\b(g[ae][ae]?nd|gaand|gandu|ga[a]?nd[uo]?)\b/i,
  // bhosad family
  /\b(bhosd?i(?:ke|ka|ki)?|bhosad(?:ike|ika|iki)?|bhosdi)\b/i,
  // madarchod / maderchod / mc
  /\b(madar(?:chod|chod|chood)|mader(?:chod|chood|cho+d))\b/i,
  /\b(mc)\b/i,
  // behenchod / bhenchod / bc
  /\b(behen(?:chod|chood|cho+d)|bhen(?:chod|chood|cho+d))\b/i,
  /\b(bc)\b/i,
  // randi / rand
  /\b(rand[iy]|rand[iy]khana)\b/i,
  // harami / haraamzada
  /\b(haram[iy]|haraamzad[aeo]?|haramzad[aeo]?)\b/i,
  // kamina / kamine / kaminey
  /\b(kamin[aeo]y?)\b/i,
  // chutiya family
  /\b(chu+tiya|chu+tiyo|chutiye)\b/i,
  // English ones not to miss
  /\b(fuck|fucking|fucked|mf|motherfucker)\b/i,
  /\b(bitch|bitches)\b/i,
  /\b(asshole|bastard|slut|whore)\b/i,
  // rape / sexual assault
  /\b(rape|raped|rapist|sexual\s+assault|molestation|molesting)\b/i,
  // explicit sexual acts in Hinglish
  /\b(choda|chodna|chodu|chod\s+dunga|chodenge|chodoge)\b/i,
  /\b(choos|chuso|choosna|choosle)\b/i,
  // "thade" alone is not offensive; "laad karunga thaade" is — covered by the laad pattern above
];

// ─── Unicode Devanagari patterns ─────────────────────────────────────────────
const HINDI_UNICODE_PATTERNS: RegExp[] = [
  /चूत/u,
  /चूतिया/u,
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
  /लाड़\s*करूंगा/u,   // the exact phrase in the screenshot
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
