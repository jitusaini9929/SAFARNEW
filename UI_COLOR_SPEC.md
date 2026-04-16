# Android Handoff: UI Color Codes (Hex)

Source pages reviewed:
- `client/pages/Typescript_for_Android/Emotional_Checkin.tsx`
- `client/pages/Achievements.tsx`
- `client/pages/Journal.tsx`
- `client/pages/Mehfil.tsx`
- `client/pages/Streaks.tsx`
- `client/pages/Suggestions.tsx`
- `client/pages/Analytics.tsx`
- `client/pages/Dashboard.tsx`
- `client/pages/Meditation.tsx`

## 1) Global Theme Tokens (Use First)
These are the core tokens used by most pages via `bg-background`, `bg-card`, `text-primary`, etc.

### Light Mode tokens
| Token | Hex |
|---|---|
| `background` | `#F8F6F2` |
| `foreground` | `#1B212D` |
| `card` | `#FDFDFB` |
| `card-foreground` | `#1B212D` |
| `primary` | `#2E3F9E` |
| `primary-foreground` | `#FFFFFF` |
| `secondary` | `#7B879D` |
| `secondary-foreground` | `#FFFFFF` |
| `muted` | `#F2EFE9` |
| `muted-foreground` | `#525C6F` |
| `border` | `#D7D3CC` |
| `ring` | `#2E3F9E` |

### Dark Mode tokens
| Token | Hex |
|---|---|
| `background` | `#0F1115` |
| `foreground` | `#E7EBEF` |
| `card` | `#181B20` |
| `card-foreground` | `#E7EBEF` |
| `primary` | `#1FE0BA` |
| `primary-foreground` | `#0F1115` |
| `secondary` | `#C1155D` |
| `secondary-foreground` | `#FFFFFF` |
| `muted` | `#272C35` |
| `muted-foreground` | `#8996A9` |
| `border` | `#272C35` |
| `ring` | `#1FE0BA` |

## 2) Shared Hardcoded Palette Used in These Pages
| Name | Hex |
|---|---|
| White | `#FFFFFF` |
| Black | `#000000` |
| Emerald 600 / 500 / 400 / 200 / 100 | `#059669`, `#10B981`, `#34D399`, `#A7F3D0`, `#D1FAE5` |
| Teal 700 / 600 / 500 / 400 / 300 / 200 / 50 | `#0F766E`, `#0D9488`, `#14B8A6`, `#2DD4BF`, `#5EEAD4`, `#99F6E4`, `#F0FDFA` |
| Amber 900 / 700 / 600 / 500 / 400 / 300 / 200 / 100 / 50 | `#78350F`, `#B45309`, `#D97706`, `#F59E0B`, `#FBBF24`, `#FCD34D`, `#FDE68A`, `#FEF3C7`, `#FFFBEB` |
| Orange 950 / 600 / 500 / 400 / 50 | `#431407`, `#EA580C`, `#F97316`, `#FB923C`, `#FFF7ED` |
| Rose 950 / 900 / 700 / 600 / 500 / 400 / 300 / 200 / 100 / 50 | `#4C0519`, `#881337`, `#BE123C`, `#E11D48`, `#F43F5E`, `#FB7185`, `#FDA4AF`, `#FECDD3`, `#FFE4E6`, `#FFF1F2` |
| Red 600 / 500 / 400 / 300 | `#DC2626`, `#EF4444`, `#F87171`, `#FCA5A5` |
| Indigo 950 / 900 / 700 / 600 / 500 / 400 / 300 / 200 / 100 / 50 | `#1E1B4B`, `#312E81`, `#4338CA`, `#4F46E5`, `#6366F1`, `#818CF8`, `#A5B4FC`, `#C7D2FE`, `#E0E7FF`, `#EEF2FF` |
| Violet 950 / 900 / 700 / 600 / 500 / 400 / 300 / 200 / 100 / 50 | `#2E1065`, `#4C1D95`, `#6D28D9`, `#7C3AED`, `#8B5CF6`, `#A78BFA`, `#C4B5FD`, `#DDD6FE`, `#EDE9FE`, `#F5F3FF` |
| Purple 950 / 500 | `#3B0764`, `#A855F7` |
| Blue 600 / 500 | `#2563EB`, `#3B82F6` |
| Cyan 500 / 400 / 300 / 50 | `#06B6D4`, `#22D3EE`, `#67E8F9`, `#ECFEFF` |
| Slate 950 / 900 / 800 / 700 / 600 / 500 / 400 / 300 / 200 / 100 / 50 | `#020617`, `#0F172A`, `#1E293B`, `#334155`, `#475569`, `#64748B`, `#94A3B8`, `#CBD5E1`, `#E2E8F0`, `#F1F5F9`, `#F8FAFC` |
| Gray 500 | `#6B7280` |
| Green 500 | `#22C55E` |
| Pink 500 / 400 | `#EC4899`, `#F472B6` |
| Yellow 600 / 500 / 400 | `#CA8A04`, `#EAB308`, `#FACC15` |
| Lime 500 | `#84CC16` |
| Zinc 500 | `#71717A` |
| Fuchsia 600 | `#C026D3` |

## 3) Page-by-Page Handoff (Canvas, Cards, Buttons)
Notes:
- Values like `/10`, `/20`, `/50` in code mean alpha over the base color.
- If exact ARGB is needed, convert as: `AA + RRGGBB` (e.g. 20% alpha = `33`).

---

### A) Emotional_Checkin (`Typescript_for_Android/Emotional_Checkin.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`)
- Cards: `card` (`#FDFDFB`), muted surfaces `#F2EFE9`
- Primary button: `#059669` (hover `#10B981`), text `#FFFFFF`
- Accent/indicators: `primary` (`#2E3F9E`), mood gradients use teal/yellow/slate/green/rose/blue/red/purple/gray families listed above

Dark mode:
- Canvas: `background` (`#0F1115`)
- Cards: `card` (`#181B20`), muted surfaces `#272C35`
- Primary button: `#059669` (hover `#10B981`), text `#FFFFFF`
- Accent/indicators: `primary` (`#1FE0BA`) + same mood palette colors

---

### B) Achievements (`Achievements.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`) with radial overlays using `primary` and gold tint
- Cards: `card` (`#FDFDFB`), title card `#000000`, modal `#FFFFFF`
- Buttons/chips:
  - Filter tabs: `#F43F5E` (mood), `#F59E0B` (consistency), `#14B8A6` (productivity), default `primary` (`#2E3F9E`)
  - Equip button hover: `#14B8A6` text `#FFFFFF`
  - Close CTA gradient: `#14B8A6` -> `#10B981`

Dark mode:
- Canvas: `background` (`#0F1115`)
- Cards: `card` (`#181B20`), title card `#000000` (or `#000000` with alpha), modal `#1A1A1A`
- Buttons/chips:
  - Same semantic accents (`#F43F5E`, `#F59E0B`, `#14B8A6`)
  - Default accent token switches to `primary` (`#1FE0BA`)

---

### C) Journal (`Journal.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`) + glow accents `#10B981` and `#3B82F6` at low alpha
- Cards: `card` (`#FDFDFB`), muted blocks `#F2EFE9`
- Buttons:
  - Main save: `#059669` (hover `#10B981`), text `#FFFFFF`
  - Prompt CTA: `#7C3AED` (hover `#8B5CF6`), text `#FFFFFF`
  - Secondary actions: muted token + emerald accents (`#10B981`/`#059669`)

Dark mode:
- Canvas: `background` (`#0F1115`) + same glow accents with low alpha
- Cards: `card` (`#181B20`), muted blocks `#272C35`
- Buttons:
  - Main save and prompt CTA remain emerald/violet as above
  - Text and borders switch to dark tokens (`foreground`, `border`, `muted-foreground`)

---

### D) Mehfil (`Mehfil.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`)
- Cards: `card` (`#FDFDFB`)
- Buttons: none in this file (this page delegates full UI to `components/mehfil/Mehfil`)

Dark mode:
- Canvas: `background` (`#0F1115`)
- Cards: `card` (`#181B20`)
- Buttons: none in this file

---

### E) Streaks (`Streaks.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`)
- Cards:
  - Check-in streak card: emerald tint (`#10B981` family)
  - Login streak card: orange tint (`#F97316` family)
  - Calendar card: `card` (`#FDFDFB`)
- Buttons/interactive:
  - Flame badge: `#F97316`
  - Active day: `#10B981` text `#FFFFFF`
  - Year chip: emerald tint + emerald text (`#10B981`)

Dark mode:
- Canvas: `background` (`#0F1115`)
- Cards: token `card` (`#181B20`) + same emerald/orange tints
- Buttons/interactive:
  - Same emerald/orange accents
  - Token text/border switch to dark values

---

### F) Suggestions (`Suggestions.tsx`)
Light mode:
- Canvas: page uses light surfaces (`#FFFFFF`, slate scale) with soft gradients
- Cards:
  - Primary cards: `#FFFFFF` to `#F8FAFC` gradients, borders `#E2E8F0`
  - SOS card: rose gradients (`#FFF1F2` -> `#FFF7ED`)
  - Challenge card: amber/orange gradients (`#FFFBEB` -> `#FFF7ED`)
  - Focus card: indigo/violet gradients (`#EEF2FF` -> `#F5F3FF`)
- Buttons/chips:
  - Difficulty chips: easy emerald, medium amber, hard rose
  - Link/CTA accents: indigo (`#4F46E5`/`#6366F1`)

Dark mode:
- Canvas: dark translucent overlays (`white/5`, dark indigo/rose/fuchsia glow accents)
- Cards:
  - Dark card surfaces via `white/[0.02..0.10]` on dark base
  - SOS/challenge/focus cards use `950` shades (rose/amber/indigo/purple families) with alpha
- Buttons/chips:
  - Difficulty chips become dark tinted versions with emerald/amber/rose text
  - CTA accents remain indigo/violet family

---

### G) Analytics (`Analytics.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`)
- Cards: mostly `card` (`#FDFDFB`) with muted panels (`#F2EFE9`)
- Buttons:
  - Main action: `primary` (`#2E3F9E`) text `#FFFFFF`
  - Secondary: `background`/muted with primary border accents
  - Metric accents: amber `#F59E0B`, emerald `#10B981`, blue `#3B82F6`, rose `#F43F5E`, indigo `#6366F1`

Dark mode:
- Canvas: `background` (`#0F1115`)
- Cards: `card` (`#181B20`)
- Buttons:
  - Main action: `primary` (`#1FE0BA`) text `#0F1115`
  - Same metric accents as light mode; token neutrals switch to dark values

---

### H) Dashboard (`Dashboard.tsx`)
Light mode:
- Canvas: `background` (`#F8F6F2`) at ~95% opacity
- Cards:
  - Main glass panel: white gradient (`#FFFFFF` family)
  - Achievement spotlight: yellow/amber palette (`#FACC15`, `#FDE68A` tints)
  - Modal card: `#FFFFFF`
- Buttons:
  - Primary CTA: `primary` (`#2E3F9E`) text `#FFFFFF`
  - Secondary muted buttons with blue/primary text accents
  - Confirm CTA gradient: `#14B8A6` -> `#10B981`

Dark mode:
- Canvas: `background` (`#0F1115`) at ~95% opacity
- Cards:
  - Main glass panel dark gradient: `#1A1A20` -> `#15151A` -> `#0F0F12`
  - Spotlight card dark shades (`#121A16`, `#1A1E1A`, `#0A0F0D`)
  - Modal card: `#1A1A1A`
- Buttons:
  - Primary CTA: `primary` (`#1FE0BA`) text `#0F1115`
  - Confirm CTA gradient stays `#14B8A6` -> `#10B981`

---

### I) Meditation (`Meditation.tsx`)
Light mode:
- Canvas:
  - Standard: `background` (`#F8F6F2`)
  - Immersive session canvas: `#FFFDF8` -> `#F4EDE1` with radial blue tint
- Cards: `card` (`#FDFDFB`) + muted panels (`#F2EFE9`)
- Buttons:
  - Primary token buttons: `primary` (`#2E3F9E`) with `primary-foreground` (`#FFFFFF`)
  - Breath control gradient buttons: `#94AAFF` -> `#9C8FFF`, text `#000000`
  - Play/pause special: active amber `#F59E0B`, idle primary

Dark mode:
- Canvas:
  - Standard: `background` (`#0F1115`)
  - Immersive session canvas: `#0B1012` -> `#09090B` with emerald radial tint
- Cards: `card` (`#181B20`) + muted panels (`#272C35`)
- Buttons:
  - Primary token buttons: `primary` (`#1FE0BA`) with `primary-foreground` (`#0F1115`)
  - Breath control gradient remains `#94AAFF` -> `#9C8FFF`
  - Dark utility buttons include `#1C2735`, `#32455F`, text `#D4E6FF`

## 4) Canvas Color Codes (Quick Answer)
If Android team needs one app-wide base canvas:
- Light canvas: `#F8F6F2`
- Dark canvas: `#0F1115`

If they need meditation immersive canvas too:
- Meditation immersive light: `#FFFDF8` -> `#F4EDE1`
- Meditation immersive dark: `#0B1012` -> `#09090B`
