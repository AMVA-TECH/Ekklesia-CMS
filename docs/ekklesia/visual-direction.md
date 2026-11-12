# Ekklesia visual direction

**Status:** Active (2026-11-11)  
**Goal image:** [visual-reference-dashboard-mockup.jpg](./visual-reference-dashboard-mockup.jpg)  
**Structural template:** `/Users/aamani/Desktop/Fundflow/frontend` (FundFlow)  
**Brand rules:** master UI/UX brief (white/ivory · charcoal · champagne gold)  
**RentFlow:** banned — do not use as reference

## North star

Church-cms flagship surfaces must **look and compose like the mockup**: charcoal admin rail, gold active nav, fish mark, welcome hero, tinted metric tiles, attendance + events; member featured worship card, pastel quick actions, daily verse, gold bottom nav.

Mockup numbers are composition reference only — bind live `/api/v1/*` (calm empties when empty).

## FundFlow pattern inventory → `_ekklesia`

| FundFlow | Map to church-cms | Take / leave |
|---|---|---|
| `components/layout/app-shell.tsx` | `AdminShell` / `MemberShell` | Take: skip-link → sidebar → header → main → content |
| `sidebar.tsx` + collapse store | `shell/sidebar.tsx` | Take: sticky rail, collapse; **recolour** charcoal |
| `sidebar-nav.tsx` / soft active chip | `NavLink` sidebar variant | Take: soft active pill behaviour; **gold gradient** on dark |
| `page-header.tsx` / `section-header.tsx` | `ui/page-header.tsx` | Take: page rhythm |
| `ui/*` (button, card, badge, dialog…) | `ui/*` | Improve in place; one primary CTA per row |
| `charts/metric-card.tsx` | `ui/metric.tsx` | Take: bordered KPI; tint with supporting softs |
| `dashboard/widgets/quick-action-card.tsx` | Member home quick actions | Take: verb-first tiles |
| `home/task-home.tsx` | Member home composition | Take: hero → actions → secondary panels |
| `globals.css` token contract | `_ekklesia/tokens.css` | Take shape; **Ekklesia palette** |
| Cyan / Inter / white sidebar | — | **Leave** |

## Dual logo

| Asset | Use |
|---|---|
| `ekklesia-mark.png` (squircle) | Favicon, PWA, archive |
| `ekklesia-mark-chrome.png` | Sidebar/header on dark chrome (`BrandMark variant="chrome"`) |

Do not redesign fish+cross geometry.

## Flagship scope

0. **Auth (started):** FundFlow split panel — charcoal brand story + ivory form; phone/email segment; shared by `/sign-in` and `/verify`
1. Admin shell (charcoal + gold active)  
2. Admin dashboard (hero, 4 tinted metrics, attendance panel, events, ministries CTA)  
3. Member home (featured card, Groups/Events/Giving/Sermons-style actions, verse, bottom nav)

List pages inherit shell tokens; deep restyle later.

## Anti-patterns

- Gold everywhere; fake KPIs/charts; FundFlow cyan/navy; RentFlow patterns; redesigning the fish; heavy glassmorphism
