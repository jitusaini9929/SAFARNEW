// ──────────────────────────────────────────────────────────────────────────────
// SAFAR Updates Data
// Saare patch notes, changelogs, aur feature releases yahan store hote hain.
// Naya update add karne ke liye: `updates` array ke starting mein naya object banayein.
// Sabse pehla entry hamesha "Latest" dikhayega.
// ──────────────────────────────────────────────────────────────────────────────

export type TagType =
  | "New Feature"
  | "Bug Fix"
  | "UX Improvement"
  | "Performance"
  | "Architecture";

export interface FeatureItem {
  title: string;
  description: string;
}

export interface PatchNote {
  id: string;           // e.g. "Patch 01"
  title: string;        // Short patch title
  issue: string;        // Kya problem thi
  correction: string;   // Kaise sahi kiya gaya
  tags: TagType[];
}

export interface UpdateEntry {
  version: string;      // e.g. "V2.0"
  name: string;         // e.g. "The Precision & Focus Update"
  date: string;         // e.g. "April 2026"
  summary: string;      // Card header par dikhne wala short description
  tags: TagType[];      // Tags pure release ke liye
  features: FeatureItem[];
  patches: PatchNote[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Update History (sabse naya pehle)
// ──────────────────────────────────────────────────────────────────────────────
export const updates: UpdateEntry[] = [
  {
    version: "V2.0",
    name: "The Precision & Focus Update",
    date: "April 2026",
    summary:
      "SAFAR ki architecture mein ek bohot bada badlav! Ab aapka study focus, analytics aur history bilkul sahi rahega bina kisi 'data drift' ke.",
    tags: ["New Feature", "Bug Fix", "Architecture", "UX Improvement"],
    features: [
      {
        title: "Safar Goals — Mission Control",
        description:
          "Ab Goals track karna aur bhi easy hai. Checklist, Duration, aur Count base tracking ke saath apne har ek mission ko pura kariye. Missed tasks ab automatically carry-forward honge.",
      },
      {
        title: "Ekagra Mode — 'One Source of Truth'",
        description:
          "Pura logic rebuild kiya gaya hai! Ab Timer, History, aur Analytics ek hi single source (FocusSession) se chalte hain. Iska matlab hai ki jo timer dikhayega, wahi analytics mein bhi aayega — bilkul accurate!",
      },
      {
        title: "Simplified Panels — Baaton Ka Safar",
        description:
          "Sessions aur History panels ko ab simple banaya gaya hai. Sirf wahi dikhega jo zaruri hai — active sessions, paused tasks aur aapka focus outcome (Completed vs Ended Early).",
      },
    ],
    patches: [
      {
        id: "Patch 01",
        title: "Goal Status aur Toggles ki Wapsi",
        issue: "Users ko progress mark karne mein mushkil ho rahi thi.",
        correction:
          "Goal Card par 'Primary Toggle' wapas aa gaya hai. Sath hi naya 'Status Selector' (In Progress, Partial, Completed) bhi add kiya gaya hai taaki aapka control pura rahe.",
        tags: ["Bug Fix", "UX Improvement"],
      },
      {
        id: "Patch 02",
        title: "Sahi Daily Study Hours Calculation",
        issue: "Technical error ki wajah se study hours galat dikh rahe the.",
        correction:
          "Ab logic local timer se hatakar 'Server-Side aggregation' par shift kar diya gaya hai. Aapke har ek session ke minutes ab 100% accurate count honge.",
        tags: ["Bug Fix", "Performance"],
      },
      {
        id: "Patch 03",
        title: "Faltu 'Ghost Sessions' ka Khatma",
        issue: "3m ya 10m ke faltu sessions automatically ban rahe the.",
        correction:
          "Sessions ab tabhi bante hain jab aap 5+ seconds tak focus karte hain. 'Freeze-on-Start' logic se timer pause karne par bhi analytics nahi bigdega. Sath hi 'Discard' option bhi ab sahi se kaam karta hai.",
        tags: ["Bug Fix", "Architecture"],
      },
      {
        id: "Patch 04",
        title: "Scrolling aur Layout ki Maat",
        issue: "Mobile aur chote laptops par users ko add task button tak scroll karne mein dikkat thi.",
        correction:
          "NishthaLayout ke 'overflow-hidden' bug ko fix kiya gaya hai. Ab saare modals aur pages full scroll support karte hain mobile par bhi.",
        tags: ["Bug Fix", "UX Improvement"],
      },
    ],
  },
];

export const latestUpdate = updates[0];
