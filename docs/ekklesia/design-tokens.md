# Ekklesia Design Tokens — Contract

**Owner:** Agent 2 (Design System) · **Phase:** 2 · **Status:** Delivered, awaiting Checkpoint B
**Source of truth:** `church-cms/src/app/_ekklesia/tokens.css` (imported by `src/app/globals.css`)
**Companion:** `brand-usage.md` (when/how to use them)

## 1. Rules for consumers

1. Use **semantic** tokens or their Tailwind utilities (`bg-surface`, `text-muted-foreground`, `border-border`). Never raw hex in components.
2. Raw brand values (`--ek-*`) exist only inside `tokens.css`. Do not reference them from components.
3. Tokens never target `.platform-console`; the platform console keeps its own `--p-*` tokens.
4. `border-border` must be written explicitly. There is **no** global `* { border-color }` reset (it would change platform/events borders).
5. Dark mode is **class-based** (`<html class="dark">`), not `prefers-color-scheme`.

## 2. Architecture

```
globals.css
 ├─ @import "tailwindcss"
 ├─ @import "./_ekklesia/tokens.css"
 │    1. :root  --ek-*            raw brand palette
 │    2. :root  semantic tokens   light theme (default)
 │    3. .dark  semantic tokens   dark stubs
 │    4. @theme inline            colours + fonts → Tailwind utilities (follow .dark)
 │       @theme static            radius / shadow / easing
 │    5. @utility                 bg-gold-gradient, tone-*, focus-ring, scripture
 ├─ @custom-variant dark          (class-based)
 └─ @layer base { body }          background, colour, font
```

## 3. Colour tokens

### 3.1 Canvas, surface, text

| Token | Light | Dark stub | Utility |
|---|---|---|---|
| `--background` | Soft Ivory `#F7F8F6` | Charcoal `#171717` | `bg-background` |
| `--foreground` | Charcoal `#171717` | Ivory `#F7F8F6` | `text-foreground` |
| `--surface` | White `#FFFFFF` | Deep Charcoal `#242424` | `bg-surface` |
| `--surface-foreground` | Charcoal | Ivory | `text-surface-foreground` |
| `--surface-muted` | Soft Grey `#F4F5F7` | `#2E2E2E` (derived) | `bg-surface-muted` |
| `--surface-inverse` / `-foreground` | Charcoal / Ivory | Ivory / Charcoal | `bg-surface-inverse` |
| `--muted-foreground` | Slate `#6B7280` | `#A3A9B3` (derived) | `text-muted-foreground` |
| `--border` | `#E6E8EB` | `#3A3A3A` (derived) | `border-border` |

### 3.2 Actions and gold

| Token | Light | Dark stub | Notes |
|---|---|---|---|
| `--primary` / `-hover` / `-foreground` | Charcoal / Deep Charcoal / White | Ivory / White / Charcoal | Primary buttons are **charcoal**, not gold |
| `--accent` / `-foreground` | Champagne `#DCC47B` / Charcoal | same | Selective emphasis |
| `--brand-gold` | Champagne Gold `#DCC47B` | same | Fills, rules, active indicators |
| `--brand-gold-strong` | Antique Gold `#B99545` | same | Hover/pressed fills, borders. **Not for text** |
| `--brand-gold-soft` | Warm Champagne `#F3E6B7` | `#4A4126` (derived) | Highlight backgrounds |
| `--brand-gold-tint` | Light Champagne `#F8F1DF` | `#34301F` (derived) | Subtle selected/info backgrounds |
| `--brand-gold-ink` | `#8A6A24` (**derived**) | Champagne | Gold-coloured **text**; AA on white |
| `--ring` | = `--brand-gold-ink` | Champagne | Focus ring |
| `--gradient-gold` | `linear-gradient(110deg, #F3E6B7 0%, #DCC47B 35%, #B99545 70%, #E9D69B 100%)` | same | Via `bg-gold-gradient` only |

### 3.3 Supporting tones

Each tone = **soft** tile background + **icon** colour (plain name). The plain colour is for glyphs/accents only, never body text.

| Tone | Plain (icon) | Soft (bg) | Utilities |
|---|---|---|---|
| Sage | `--sage` `#6B7F6B` | `--sage-soft` `#EAF0E9` | `text-sage` `bg-sage-soft` `tone-sage` |
| Sky | `--sky` `#8CA9C7` | `--sky-soft` `#EAF2F9` | `tone-sky` |
| Lavender | `--lavender` `#9583BD` | `--lavender-soft` `#EEEAF7` | `tone-lavender` |
| Peach | `--peach` `#B77D55` (icon) | `--peach-soft` `#F5E5D8` | `tone-peach` |
| Gold | `--brand-gold-ink` | `--brand-gold-tint` | `tone-gold` |

### 3.4 Status

| Status | Fill / icon (brand) | Text-safe ink (derived) | Soft bg (derived) |
|---|---|---|---|
| Success | `--success` `#26865B` | `--success-ink` `#1E6B49` | `--success-soft` `#E7F3EC` |
| Warning | `--warning` `#D99A36` | `--warning-ink` `#8A5A0B` | `--warning-soft` `#FBF1DE` |
| Danger | `--danger` `#D9534F` | `--danger-ink` `#B23B37` | `--danger-soft` `#FBEAE9` |
| Info | `--info` `#4788B9` | `--info-ink` `#2F6A97` | `--info-soft` `#E8F1F8` |

Utilities follow the pattern `bg-success`, `text-success-ink`, `bg-success-soft`, etc.

## 4. Typography tokens

| Token / utility | Value | Use |
|---|---|---|
| `--font-sans` / `font-sans` | DM Sans (`--font-dm-sans`) → system sans | **All UI.** Applied to `<body>` |
| `--font-scripture` / `font-scripture` | Fraunces (`--font-fraunces`) → Georgia | **Scripture/devotional quotes only** |
| `scripture` (utility) | Fraunces italic 400, line-height 1.6 | Quote block; never headings/nav/buttons |
| `font-mono` | Tailwind default system mono | Code/IDs. No webfont loaded |

Fonts are loaded in `src/app/layout.tsx` via `next/font/google` (self-hosted at build time). Fraunces is `preload: false` so it costs nothing on pages without quotes. **No Inter.** The old `body { font-family: Arial }` override is removed.
Tailwind's default `text-*` size scale is retained; the recommended mapping is in `brand-usage.md`.

## 5. Radius, shadow, spacing, motion

| Token | Value | Utility |
|---|---|---|
| `--radius-sm` | 6px | `rounded-sm` (chips, small inputs) |
| `--radius-md` | 8px | `rounded-md` (buttons, inputs) |
| `--radius-lg` / `--radius-card` | 12px | `rounded-lg` / `rounded-card` (cards, panels) |
| `--radius-xl` | 14px | `rounded-xl` (dialogs, hero cards) |
| `--shadow-card` | 1px/2px charcoal @4–6% | `shadow-card` |
| `--shadow-pop` | 24px blur charcoal @12% | `shadow-pop` (menus, dialogs only) |
| Spacing | Tailwind default 4px base (`--spacing`) | `p-4`, `gap-6` … |
| `--layout-sidebar-width` | 16rem | for shells |
| `--layout-topbar-height` | 3.5rem | for shells |
| `--layout-content-max` | 80rem | for shells |
| `--touch-target` | 2.75rem (44px) | min hit area, phones first |
| `--duration-fast/base/slow` | 120 / 180 / 280ms (→ 1ms under `prefers-reduced-motion`) | use `duration-[var(--duration-base)]` or CSS |
| `--ease-standard` / `--ease-exit` | `cubic-bezier(.2,0,0,1)` / `(.4,0,1,1)` | `ease-standard` |

Note: `--radius-sm…xl` override Tailwind's default values of the same names (global effect).

## 6. Utilities

| Utility | Effect |
|---|---|
| `bg-gold-gradient` | Gold gradient background image (selective use) |
| `tone-sage` / `tone-sky` / `tone-lavender` / `tone-peach` / `tone-gold` | Soft bg + icon colour pair |
| `focus-ring` | `:focus-visible` 2px `--ring` outline, 2px offset |
| `scripture` | Scripture quote typography |

## 7. Platform console and legacy surfaces

- `platform.css` is untouched. `.platform-console` sets its own background/colour, so the light `body` tokens do not leak onto it.
- `platform.css` reads `--font-geist-sans`; Geist is no longer loaded, so tokens define the **compat alias** `--font-geist-sans: var(--font-dm-sans)`. Net effect: the platform console now renders in DM Sans (otherwise it would fall to Segoe UI). Remove the alias when platform.css is reskinned.
- `src/app/events/events-admin.tsx` keeps its inline `--ink/--paper/…` tokens and runtime Google Fonts import until Agent 4 migrates it.
- `src/app/page.tsx` (scaffold) still uses `dark:` utilities; they now respond to `.dark` rather than the OS setting.

## 8. Dark-mode caveats

- Stubs only: nothing sets `.dark` yet, no toggle exists, no component has been audited in dark.
- Supporting `*-soft` tiles in dark are computed with `color-mix` (22% tone over Deep Charcoal); verify per component.
- Dark `--primary` flips to Ivory (inverse button). Gold-on-charcoal contrast is high (~10:1), but the gradient on light text is untested.
- Platform console is always dark-styled via `--p-*`; it ignores `.dark`.

## 9. Contrast reference (WCAG, computed against stated surface)

| Pair | Ratio | Verdict |
|---|---|---|
| Charcoal on White / Ivory | ≥ 16:1 | AAA |
| Slate `#6B7280` on White | ≈ 4.8:1 | AA text. On Soft Grey ≈ 4.4:1: use only for ≥ 18px/bold or on white/ivory |
| Antique Gold `#B99545` on White | ≈ 2.8:1 | **Fails** text and focus (3:1). Fill/border/decoration only |
| Champagne `#DCC47B` on White | ≈ 1.7:1 | Fill only; text on it must be Charcoal (≈ 10:1) |
| `--brand-gold-ink` `#8A6A24` on White | ≈ 5.0:1 | AA text and focus ring |
| Success `#26865B` on White | ≈ 4.5:1 | Borderline AA; use `-ink` for small text |
| Warning `#D99A36` / Danger `#D9534F` / Info `#4788B9` on White | ≈ 2.4 / 4.0 / 3.8 | Fill/icon only; use `-ink` for text |
| Sage / Sky / Lavender / Peach icon on its soft bg | ≈ 2–3.7:1 | Decorative glyphs only; **always pair with a text label** |

Ratios are hand-computed estimates; Agent 6 should re-verify with tooling at Checkpoint D.

## 10. Derived tokens (not in the brand sheet)

Added purely for accessibility/state: `--brand-gold-ink`, `--*-ink`, `--*-soft` (status), `--surface-muted` dark value, and all dark-theme values. Lead may veto at Checkpoint B.
