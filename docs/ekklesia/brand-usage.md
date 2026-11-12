# Ekklesia Brand Usage

Companion to `design-tokens.md`. Tokens say *what exists*; this says *how to mix them*.

## 1. Personality

Calm, warm, trustworthy, reverent but modern. Mostly ivory and white with charcoal structure; gold is a quiet accent, never a theme. Phones first, readable on slow connections and bright sun.

## 2. Colour distribution (per screen, by visual area)

| Family | Share | Typical use |
|---|---|---|
| Ivory + White | 65–72% | Page canvas (`bg-background`), cards (`bg-surface`) |
| Charcoal | 15–20% | Text, primary buttons, sidebar/inverse blocks |
| Gold | 5–8% | Active nav indicator, key highlight, one accent per view |
| Supporting (sage/sky/lavender/peach) | 8–12% | Icon chips, category tiles, soft badges |

Status colours are functional and sit outside the ratio; keep them small (badges, alerts, icons).

## 3. Mixing rules

1. Page = Ivory; cards/panels = White with `border-border` and optionally `shadow-card`. Do not put white on white without a border.
2. Primary action = Charcoal button (`bg-primary text-primary-foreground`). Secondary = White + border. **One** primary per view region.
3. Supporting tones appear as `tone-*` icon chips or soft badges. Use at most **two** supporting tones in one view region; keep the mapping stable (e.g. sage = growth/people, sky = events/info, lavender = ministries/care, peach = giving/hospitality; propose changes through Lead).
4. Text is always `text-foreground` or `text-muted-foreground`. Supporting and gold colours are never used for body text.
5. Status always pairs colour with an icon or word (never colour alone).

## 4. Gold: do / don't

**Do**
- Use `bg-brand-gold` / `bg-gold-gradient` for: a brand mark, a 2–4px active indicator, a single hero accent, a progress/achievement highlight, the empty-state illustration accent.
- Use `bg-brand-gold-tint` for a selected row or highlighted card background.
- Put **Charcoal** text/icons on gold fills (≈10:1).
- Use `text-brand-gold-ink` for gold-coloured text (≥ AA).
- Use `focus-ring` (gold-ink) for keyboard focus.

**Don't**
- Don't set text in `--brand-gold` or `--brand-gold-strong` on light backgrounds (fails contrast).
- Don't use the gradient on large surfaces, full-width bars, body text, borders of every card, or more than once per viewport region.
- Don't make every button gold; don't gold-tint shadows; don't combine gradient + shadow + border on one element.
- Don't use gold for status (success/warning). Warning has its own amber token.
- Don't use gold on the platform console unless/until its skin pass is approved.

## 5. Typography

| Role | Font | Size / weight | Tailwind |
|---|---|---|---|
| Display / page title | DM Sans | 30px / 600, tracking tight | `text-3xl font-semibold tracking-tight` |
| Section heading | DM Sans | 20px / 600 | `text-xl font-semibold` |
| Card title | DM Sans | 16px / 600 | `text-base font-semibold` |
| Body | DM Sans | 16px / 400 (min 16px on form inputs: prevents iOS zoom) | `text-base` |
| Secondary / table | DM Sans | 14px / 400–500 | `text-sm` |
| Caption / meta | DM Sans | 12–13px / 500, `text-muted-foreground` | `text-xs` |
| Numeric stats | DM Sans | 24–30px / 600, `tabular-nums` | `text-2xl font-semibold tabular-nums` |
| Scripture / devotional quote | **Fraunces** italic | 18–22px / 400, line-height 1.6 | `scripture text-lg` |
| Code / IDs | system mono | 13px | `font-mono text-[13px]` |

Rules: Fraunces is **only** for the scripture/devotional quote class, never nav, buttons, headings or labels. No Inter. Max two weights per view (400/500 and 600). Support Swahili: avoid truncating headings; allow wrapping.

## 6. Shape, depth, motion

- Controls 8px (`rounded-md`), cards 12px (`rounded-card`), dialogs 14px (`rounded-xl`).
- Depth: border first, `shadow-card` second, `shadow-pop` only for floating layers.
- Motion: 120–280ms with `ease-standard`; durations collapse automatically under reduced motion. Never animate gold gradients.
- Touch targets ≥ `--touch-target` (44px).

## 7. Logo

- **Status: production branding system (2026-11-11).** Approved fish + integrated cross. Geometry must not be redesigned or replaced with alternate Christian symbols.
- **Canonical assets:** `/branding/` — SVG symbol / horizontal / logo (dark + light) plus `favicon.svg`, `icon-192.png`, `icon-512.png`.
- **UI component:** `<BrandMark variant="symbol|logo" surface="light|dark|auto">`. Dark charcoal rails use `symbol` + `surface="dark"`; light headers/splash use `logo` + `surface="light"`. `surface="auto"` follows the `.dark` class.
- **Legacy:** `/brand/ekklesia-mark.png` and related rasters remain as masters / imagery companions. Do not use the old geometric “E” placeholders in product UI.
- Clear space: ≥ ½ mark height. Minimum size: 24px mark (16px only for favicon tile).
- Don't recolour, stretch, add shadows, or put on gold fills.
- Still missing: OG image (1200×630).

## 8. Accessibility minimums

- Body text ≥ 4.5:1; large text and UI glyphs ≥ 3:1 (see contrast table in `design-tokens.md` §9).
- Supporting-tone icons are decorative: always accompany with a label.
- Focus must be visible (`focus-ring`) on every interactive element.
