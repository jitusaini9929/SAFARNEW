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
    version: "V2.2",
    name: "Study Planner launch prep update",
    date: "April 2026",
    summary:
      "Wait khatam hone wali hai. Study Planner feature ready hai, final testing phase me hai, aur bahut jald launch hone wala hai. Saath hi landing aur updates experience me bhi kuch polished improvements laaye gaye hain.",
    tags: ["New Feature", "UX Improvement", "Performance"],
    features: [
      {
        title: "Study Planner is almost here",
        description:
          "Study Planner feature ab final testing phase me hai. Core experience ready hai, flows verify kiye ja rahe hain, aur launch ke liye last checks chal rahe hain.",
      },
      {
        title: "Cleaner landing page focus",
        description:
          "Hero section ko simplify kiya gaya hai taaki main call-to-action zyada clear lage. Extra clutter kam kiya gaya hai aur layout ko better balance diya gaya hai.",
      },
      {
        title: "Bigger and clearer primary action",
        description:
          "Start your Safar button ko bada aur better aligned kiya gaya hai, jisse landing page par main action aur noticeable aur easier to use ho gaya hai.",
      },
      {
        title: "Updates page refreshed",
        description:
          "Website updates section ko fresh announcement ke saath refresh kiya gaya hai, taaki ongoing progress aur upcoming launch status users tak clearly pahunch sake.",
      },
    ],
    patches: [
      {
        id: "Patch 01",
        title: "Hero CTA alignment polish",
        issue:
          "Secondary button hide hone ke baad primary hero CTA ki spacing aur alignment utni intentional nahi lag rahi thi.",
        correction:
          "CTA row ko re-balance kiya gaya aur primary button sizing adjust ki gayi, taaki layout single-action state me bhi clean aur polished lage.",
        tags: ["UX Improvement"],
      },
      {
        id: "Patch 02",
        title: "Landing page visual cleanup",
        issue:
          "Landing page par kuch sections me messaging scattered lag rahi thi, especially upcoming features ke context me.",
        correction:
          "Launch messaging ko clearer banaya gaya aur page focus ko core actions aur latest announcements ke around tighten kiya gaya.",
        tags: ["UX Improvement", "Performance"],
      },
    ],
  },
  {
    version: "V2.1",
    name: "Goals aur Focus update",
    date: "April 2026",
    summary:
      "Goals me future planning ka option aaya. Ekagra me bina session banaye bhi timer chala sakte ho. Aur ab focus time sahi se count hota hai analytics me.",
    tags: ["New Feature", "UX Improvement"],
    features: [
      {
        title: "Schedule Task — Goals me",
        description:
          "Ab tum aaj ki jagah future date ke liye bhi goal bana sakte ho. Ye goal pending list me tab hi aayega jab woh din aa jaaye. Purane goals ke beech clutter nahi hoga.",
      },
      {
        title: "Scheduled Tasks Section",
        description:
          "Goals page pe ek alag 'Scheduled Tasks' section hai jahan future goals dikhte hain. Collapse aur expand kar sakte ho.",
      },
      {
        title: "Quick Start Timer — Ekagra me",
        description:
          "Ab timer shuru karne ke liye session banana zaroori nahi. 'Just Start Timer' dabao aur seedha focus karo — koi naam, koi session record nahi.",
      },
    ],
    patches: [],
  },
];

export const latestUpdate = updates[0];
