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
