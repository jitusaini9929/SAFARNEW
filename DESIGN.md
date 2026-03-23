# Design System Strategy: The Horizon Narrative

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Scenic Path."** 

Unlike traditional "boxed-in" corporate interfaces, this system treats the digital viewport as a continuous landscape. We move away from rigid, modular grids toward a high-end editorial experience that feels organic and aspirational. By leveraging the winding movement of the reference landscape, we utilize intentional asymmetry—placing content in "rolling" sequences that guide the eye naturally. The goal is to evoke the peaceful, steady progression of a journey toward a bright horizon, using sophisticated layering and tonal depth to replace heavy structural lines.

## 2. Colors: Tonal Landscapes
Our palette is rooted in the natural world: sage and forest greens represent stability, navy blue provides a deep, professional foundation (the road), and sun-yellow acts as the high-contrast beacon for action.

*   **Primary (Forest Green):** Used for core brand moments and primary actions.
*   **Secondary (Deep Navy):** Represents the "winding road"—authoritative and grounding.
*   **Tertiary (Sun Yellow):** Our "Solar Accent," used sparingly for high-visibility CTAs and critical notifications.

### The "No-Line" Rule
To maintain the "peaceful" aesthetic, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or subtle tonal transitions. For example, a main content area using `surface` might transition into a footer using `surface-container-low`.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper.
*   **Level 0:** `surface` (The foundation)
*   **Level 1:** `surface-container-low` (Subtle recessed areas)
*   **Level 2:** `surface-container-highest` (Prominent elevated cards)
Use these tiers to create "nested" depth. An inner container should always be at a different tier than its parent to define its importance without needing a stroke.

### The "Glass & Gradient" Rule
Floating elements (navigation bars, modal overlays) should utilize **Glassmorphism**. Use semi-transparent surface colors with a `backdrop-blur` effect.
*   **Signature Textures:** Apply subtle linear gradients—transitioning from `primary` (#34602c) to `primary_container` (#4c7a43)—on large buttons and hero headers. This mimics the light play found in a forest canopy.

## 3. Typography: Editorial Authority
The typography pairing balances the "peaceful" and "professional" tones.

*   **Display & Headlines (Manrope):** We use Manrope for its geometric yet warm character. Large `display-lg` (3.5rem) settings should be used with tight letter-spacing to create a bold, editorial look that feels like a magazine header.
*   **Body & Labels (Inter):** Inter is the workhorse. It provides maximum legibility at smaller scales (`body-md`, `label-sm`), ensuring the "professional" side of the brand remains intact.

**Hierarchy Strategy:** Use `tertiary` (Sun Yellow) for `label-md` or `title-sm` accents to draw the eye to specific metadata, while keeping the main narrative in `on_surface` (Dark Teal-Grey) for calm readability.

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container` (#eceeec) background. This creates a crisp, natural lift.
*   **Ambient Shadows:** If a shadow is required for a floating action button or a modal, use an extra-diffused shadow:
    *   *Blur:* 32px - 64px
    *   *Opacity:* 4% - 6%
    *   *Color:* A tinted version of `on_surface` (never pure black).
*   **The "Ghost Border" Fallback:** For high-density data where separation is critical, use a "Ghost Border": `outline-variant` at 15% opacity. 

## 5. Components

### Buttons
*   **Primary:** A gradient from `primary` to `primary_container` with a `lg` (1rem) corner radius. Typography: `title-sm` (Inter, Bold).
*   **Secondary:** Ghost style using `secondary` text and a subtle `secondary_container` background on hover. No border.
*   **Tertiary (Solar):** `tertiary` (#725000) background with `on_tertiary` (#ffffff) text. Reserved for "The Final Step" in a user flow.

### Cards & Lists
*   **Forbid Divider Lines:** Use the Spacing Scale (specifically `8` or `10`) to create "Islands of Content." 
*   **Card Style:** `xl` (1.5rem) corner radius. Use `surface-container-lowest` with a subtle 4% ambient shadow.

### Input Fields
*   **Unfocused:** `surface-container-high` background, no border.
*   **Focused:** `surface-container-lowest` background with a 2px `primary` bottom-bar only. This mimics the "flat road" perspective of the landscape.

### Chips
*   **Filter Chips:** Use `secondary_fixed_dim` with `on_secondary_fixed_variant` text. Corner radius: `full`.

### Custom Navigation: The "Horizon" Bar
A top-navigation bar that uses Glassmorphism (70% opacity `surface` with 20px blur). It should have no bottom border, appearing to "float" over the scrolling landscape of the content.

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a `display-lg` headline on the left and a `body-lg` paragraph slightly offset to the right.
*   **Embrace Negative Space:** Use the `16` (5.5rem) and `20` (7rem) spacing tokens between major sections to let the design "breathe."
*   **Tint Your Neutrals:** Ensure all surface colors have the slight green/grey tint of `surface` (#f8faf8) to keep the "forest" vibe consistent.

### Don't:
*   **Don't use 100% Black:** Even for text. Always use `on_surface` (#191c1b) for a softer, premium feel.
*   **Don't use Sharp Corners:** Avoid `none` or `sm` roundedness tokens. The minimum should be `md` (0.75rem) to reflect the "rolling hills" concept.
*   **Don't Overuse the Sun:** Use the yellow `tertiary` tokens only for 1-2 elements per screen. Too much yellow breaks the "peaceful" atmosphere.