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
      "Ekagra aur Goals ka pura flow refine kiya gaya hai. Sessions, analytics aur goal linking ab zyada clear, faster aur reliable hai.",
    tags: ["New Feature", "Bug Fix", "UX Improvement", "Architecture"],
    features: [
      {
        title: "Focus Analytics Revamp",
        description:
          "Sessions ab Analytics tab me shift ho gaye hain, aur new Session Quality view me Completed vs Abandoned ka clear breakdown milta hai. Timer accuracy ke hisaab se completion decide hota hai (±25% tolerance).",
      },
      {
        title: "Ekagra Session Control",
        description:
          "Running aur Paused sessions ka UI simplify hua hai, End Session ka behavior fix hua hai, aur Delete session se clean removal milta hai. Progress bar ke niche checkpoints bhi add ho gaye hain.",
      },
      {
        title: "Goals + Ekagra Linking Update",
        description:
          "Time-based goals me linked focus sessions optional hain, aur one-time goals ke liye time/count tracking hide hota hai. Due date sirf reminder hai — timer imply nahi karta.",
      },
    ],
    patches: [
      {
        id: "Patch 01",
        title: "Session Completion Accuracy",
        issue: "Timer end aur manual end ke beech mismatch se analytics confusion ho raha tha.",
        correction:
          "Completion rule ab ±25% tolerance par based hai. Completed vs Ended Early clear hai, aur abandoned sessions goals ko auto-complete nahi karte.",
        tags: ["Bug Fix", "Architecture"],
      },
      {
        id: "Patch 02",
        title: "Sessions List Ab Analytics me",
        issue: "Task History me sessions list se screen clutter aur mismatch ho raha tha.",
        correction:
          "Session list ko Analytics ke Sessions tab me move kiya gaya. Task History ab sirf quick snapshot dikhata hai.",
        tags: ["UX Improvement"],
      },
      {
        id: "Patch 03",
        title: "End Session UI Response",
        issue: "End Session ke baad active session clear hone me delay aa raha tha.",
        correction:
          "End Session par UI ab instantly update hota hai, aur backend sync ke baad list refresh hoti hai.",
        tags: ["Bug Fix", "UX Improvement"],
      },
      {
        id: "Patch 04",
        title: "One-time Goals ka Clean UX",
        issue: "One-time goals me time/count tracking aur timer expectation confuse kar raha tha.",
        correction:
          "One-time goals ke liye tracking options limited hain (Done/Checklist). Due date sirf reminder hai, timer link nahi hota.",
        tags: ["UX Improvement"],
      },
    ],
  },
];

export const latestUpdate = updates[0];
