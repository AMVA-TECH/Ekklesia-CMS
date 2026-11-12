# Ekklesia Shared Components — Contract

**Owner:** Agent 3 (Shared UI Components) · **Phase:** 3 · **Status:** Delivered, awaiting Checkpoint C
**Source of truth:** `church-cms/src/app/_ekklesia/{ui,shell,icons,session}/**`
**Live preview (internal only):** `/ui-preview` (mounted via the `(internal)` route group; not linked from product nav).
**Companions:** `design-tokens.md` · `brand-usage.md` · `ui-architecture-audit.md` §9–10.

> Agents 4 (admin) and 5 (member) must consume these exports and must NOT
> duplicate or fork them. New product styles belong here first, then flow
> downstream — never the other way around.

## 1. Consumer rules

1. Import primitives via the barrel:
   - `import { Button, Card, Metric, … } from '@/app/_ekklesia/ui';`
   - `import { Icon, type IconName } from '@/app/_ekklesia/icons';`
   - `import { AdminShell, MemberShell, type NavGroup } from '@/app/_ekklesia/shell';`
   - `import { apiFetch, SessionProvider, useSession, useRole } from '@/app/_ekklesia/session';`
2. **Do not read `--ek-*` raw brand values from components.** Use semantic
   tokens / Tailwind utilities (`bg-primary`, `tone-sage`, `text-brand-gold-ink`,
   `var(--danger)` only where no utility exists).
3. **Named exports only.** Every type that crosses a module boundary is
   re-exported alongside its component.
4. **`'use client'`** is only declared where interaction or `useEffect` demands
   it. Static primitives (`Button`, `Card`, `Badge`, `Icon`, `PageHeader`,
   `Panel`, `EmptyState`, `Avatar`, `BrandMark`, `SkipLink`, `Metric`,
   `Status/Pill`, `Skeleton`, `Spinner`, `AppFooter`, `RoleNav`) remain
   server-safe.
5. **No raw hex in new feature code.** Use the token utilities exposed by the
   library and documented here. (SVG `currentColor` inside `Icon` glyphs is the
   only exception.)
6. **Dev identity**: feature code must call `apiFetch()` — never attach
   `x-dev-*` headers by hand. See §5.
7. **Dialog/menu/popover focus**: Checkpoint A Q10 permits Radix only when
   justified. This library ships in-house `Dialog` and `Menu` that cover the
   current needs (focus trap, Escape, return-focus, arrow-key roving). Choose
   Radix only when a future surface genuinely needs a feature the in-house
   version lacks; log the justification in the commit that adds the dep.

## 2. Inventory

### 2.1 UI primitives — `_ekklesia/ui/*`

| Component | Variants / props worth knowing | Notes |
|---|---|---|
| `Button` | `variant: primary \| secondary \| ghost \| destructive \| gold`, `size: sm \| md \| lg`, `iconLeft`, `iconRight`, `loading`, `block` | Primary is **charcoal** (brand-usage §3). `gold` reserved for hero accents. `buttonClassName()` helper re-skins `<Link>`. |
| `Input` | `dense`, native `type`, forwarded ref | 16px min font avoids iOS zoom. `aria-invalid` auto-applies danger border. |
| `Textarea` | `rows`, `field-sizing: content` auto-grow | Same visual contract as `Input`. |
| `Select` | `dense` | Keeps the native `<select>` for mobile UX + i18n; renders a custom chevron overlay. |
| `Field` | `label`, `hint`, `error`, `required`, `labelAccessory`, `htmlFor` | Auto-wires `id`/`aria-describedby`/`aria-invalid` onto the single child control. |
| `Card` + `CardHeader` + `CardTitle` + `CardSubtitle` | `padding: none \| sm \| md \| lg`, `interactive`, `shadow` | 12px radius, border-first. |
| `Panel` | `title`, `subtitle`, `linkHref`, `actions`, `flush` | `<section>` + `aria-labelledby`; `flush` lets a `<Table>` sit edge-to-edge. |
| `PageHeader` | `title`, `lede`, `eyebrow`, `actions` | The only `<h1>` on a page. |
| `Metric` | `label`, `value`, `unit`, `icon`, `tone: sage \| sky \| lavender \| peach \| gold \| neutral`, `href`, `change`, `changeDirection` | Tone chips consume `tone-*` utilities. Clickable when `href` set. |
| `Badge` | `tone: neutral \| gold \| sage \| sky \| lavender \| peach \| success \| warning \| danger \| info`, `solid` | Soft by default; use for categories/counts. |
| `StatusPill` | `tone: neutral \| success \| warning \| danger \| info \| pending`, `hideDot` | Always pairs colour with text (WCAG 1.4.1). |
| `EmptyState` | `icon`, `tone`, `title`, `description`, `action` | Dashed border — distinct from a loaded card. |
| `Dialog` + `DialogFooter` | `open`, `onClose`, `title`, `description`, `size: sm \| md \| lg`, `sheetOnMobile`, `hideCloseButton` | Portaled, body-scroll locked, focus-trapped, returns focus. Mobile sheet behaviour by default. `data-autofocus` on a descendant focuses it on open. |
| `Menu` + `MenuItem` + `MenuSeparator` + `MenuLabel` | Trigger element injected with `aria-haspopup`/`aria-controls`. `align: start \| end`. | Arrow-key roving, Escape closes, outside-click closes. Non-portaled. |
| `Tabs` + `TabList` + `Tab` + `TabPanel` | `value`/`defaultValue`/`onValueChange`, `orientation` | ARIA tabs pattern; home/end + arrow keys. Active tab shows the gold underline. |
| `TableWrap` + `Table` + `THead` + `TBody` + `TR` + `TH` + `TD` | `TR` has `selected` + `noHover` | Sticky head by default; `TableWrap` provides horizontal scroll. |
| `NavLink` | `href`, `icon`, `hint`, `endSlot`, `active`, `matchMode: exact \| startsWith`, `variant: sidebar \| bottom \| topbar` | Auto-active via `usePathname`. Gold bar / dot / underline per variant. |
| `SkipLink` | `targetId` (default `main-content`) | First child of every shell. |
| `Avatar` | `name`, `size: xs..xl`, `tone: auto \| brand \| charcoal`, `ring`, `decorative` | Initials-only, deterministic tone from the name. No uploads. |
| `SearchField` | `label`, `dense`, `onClear`, `value` | Visually hidden label, inline search glyph, optional clear control. |
| `Spinner` | `size: xs..lg`, `label` | Honours `prefers-reduced-motion`. |
| `Skeleton` | `size: line \| heading \| block`, `radius` | Subtle pulse, muted surface — no coloured washes. |
| `Pagination` | `page`, `totalPages?`, `onPageChange`, `disabled` | Prev / position / Next. Deliberately no numeric window. |
| `ToastProvider` + `useToast()` | Push `{ tone, title?, message, duration? }`; `duration: 0` is sticky | Portaled region, bottom-centre on phones, bottom-right on desktop. `role="status"` per toast, polite live region. Mount once per shell. |
| `BrandMark` | `size`, `withWordmark`, `subline`, `href`, `compact` | Uses the official `/brand/ekklesia-mark.png`. Never the deprecated SVG. |
| `cn`, `initialsFromName`, `stableIndex` | Utilities | `cn` joins class values with conditionals; the other two back `Avatar`. |

### 2.2 Icons — `_ekklesia/icons/*`

- `Icon` wrapper: `<Icon name="users" size={18} label="Members" />`.
- `size` is a pixel value or CSS length; default 16. Pass `size={null}` to let
  `className` control dimensions (avoid dynamic Tailwind classes — Tailwind v4
  JIT will not pick them up).
- Icons are **decorative by default** — supply `label` to expose them to
  assistive tech.
- Colour follows `currentColor`.
- Catalogue: `home`, `menu`, `close`, `chevron-left/right/up/down`,
  `arrow-left/right`, `external-link`, `more-horizontal/vertical`,
  `plus`, `minus`, `check`, `search`, `filter`, `download`, `upload`, `edit`,
  `trash`, `refresh`, `user`, `users`, `user-plus`, `church`, `building`,
  `heart`, `hand`, `calendar`, `calendar-check`, `bell`, `mail`, `inbox`,
  `chat`, `phone`, `book`, `bookmark`, `file`, `image`, `paperclip`, `alert`,
  `alert-circle`, `info`, `check-circle`, `shield`, `lock`, `key`, `eye`,
  `eye-off`, `settings`, `logout`, `globe`, `moon`, `sun`, `wallet`, `card`,
  `coin`, `trending-up`, `trending-down`, `chart`, `pin`, `map`, `wrench`,
  `briefcase`, `star`, `clock`, `tag`, `loader`.
- Adding a new glyph requires an entry in `icon-paths.tsx` and a line here.

### 2.3 Shells — `_ekklesia/shell/*`

| Export | Purpose |
|---|---|
| `AdminShell` | Desktop-dense layout: `Sidebar` (collapsible, `localStorage` state) + `Topbar` + `main` + `AppFooter` + `MobileDrawer`. |
| `MemberShell` | Phone-first layout: `Topbar` + scrolling `main` with bottom-safe padding + `BottomNav` + desktop `AppFooter` + `MobileDrawer`. |
| `Sidebar` | Sticky desktop rail with brand mark, `RoleNav`, optional footer slot, collapse toggle. |
| `Topbar` | Sticky top header with mobile menu button, mobile brand, centre slot, end slot. `variant: admin \| member`. |
| `MobileDrawer` | Off-canvas sidebar replacement for `< lg` viewports. Focus trap, Escape, body scroll lock, auto-closes on link activation. |
| `AppFooter` | Thin bottom footer. Shared between shells. |
| `BottomNav` + `BottomNavItem` | Phone-only tab bar (member shell). Gold dot indicator for the active tab. |
| `RoleNav` + `NavGroup` + `NavItem` | Data-driven grouped nav (same contract both shells + both viewports). |

Example admin mount (will live in `src/app/(admin)/layout.tsx`):

```tsx
'use server';
import { AdminShell, type NavGroup } from '@/app/_ekklesia/shell';
import { SessionProvider } from '@/app/_ekklesia/session';
import { fetchSession } from '@/app/_lib/session-ssr'; // Agent 4

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchSession();
  const groups: NavGroup[] = buildAdminGroups(session); // Agent 4 data factory
  return (
    <SessionProvider session={session}>
      <AdminShell
        groups={groups}
        churchName={session?.church?.name}
        topbarEnd={<AdminTopbarEnd />} // Agent 4 composes account menu + notifications
      >
        {children}
      </AdminShell>
    </SessionProvider>
  );
}
```

### 2.4 Session helpers — `_ekklesia/session/*`

| Export | Purpose |
|---|---|
| `apiFetch(path, options)` | Single JSON fetch helper. `credentials: 'include'` always. Attaches `x-dev-*` headers only when `NEXT_PUBLIC_ALLOW_DEV_AUTH === '1'`, from `localStorage[ek-dev-headers]`. Unwraps `{ data }` envelopes. Throws `ApiError` on non-2xx with the backend's `error`/`message`. |
| `ApiError` | Rich error class: `status`, parsed `body`. |
| `readDevHeaders()` / `writeDevHeaders()` / `isDevAuthAllowed()` | For dev tools. Not called by product code. |
| `SessionProvider` | Context provider; feed from a server component via `/api/v1/auth/me`. |
| `useSession()` | `{ session, user, church, loading, isAuthenticated }`. |
| `useRole()` | `{ roles, permissions, hasRole, hasAnyRole, can, isPlatformOperator, isChurchAdministrator, isFinanceOfficer, isMember }`. |
| `ROLE_CODES` | Known role code constants (not exhaustive — unknown backend codes remain valid). |
| `Session`, `SessionUser`, `SessionChurch`, `SessionRole`, `RoleCode`, `ExperienceShell` | Types. |

## 3. Composition examples (for Agents 4 & 5)

### 3.1 Admin dashboard scaffold

```tsx
import { PageHeader, Metric, Panel, EmptyState, Button } from '@/app/_ekklesia/ui';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="This Sunday"
        lede="A quick snapshot of attendance, giving, and open follow-ups."
        actions={<Button iconLeft="plus">Record attendance</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active members" value="412" icon="users" tone="sage" />
        <Metric label="Attendance" value="283" icon="calendar-check" tone="sky" />
        <Metric label="Pledges" value="TZS 2.4M" icon="hand" tone="peach" />
        <Metric label="Prayer requests" value="27" icon="heart" tone="lavender" href="/prayer" />
      </div>
      <Panel title="Needs your attention" linkHref="/attention">
        <EmptyState title="Inbox zero" description="No reviews are waiting." icon="check-circle" tone="sage" />
      </Panel>
    </div>
  );
}
```

### 3.2 Member home snippet

```tsx
<PageHeader title="Welcome, Ada" lede="Here's what your church is doing this week." />

<Panel title="Your next step">
  <p className="text-sm text-muted-foreground">
    Your household profile is nearly complete — add a preferred contact method.
  </p>
  <div className="mt-3"><Button size="sm" iconLeft="user-plus">Complete profile</Button></div>
</Panel>
```

### 3.3 Form row

```tsx
<Field label="Phone" required hint="We'll send a verification code." error={errors.phone}>
  <Input type="tel" placeholder="+255 7XX XXX XXX" {...register('phone')} />
</Field>
```

### 3.4 Confirm dialog

```tsx
const [open, setOpen] = useState(false);

<Button variant="destructive" iconLeft="trash" onClick={() => setOpen(true)}>Remove</Button>
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Remove this household?"
  description="This is reversible from the archive."
  footer={
    <DialogFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={doRemove}>Remove</Button>
    </DialogFooter>
  }
>
  <p className="text-sm text-muted-foreground">Members in this household will stay in the people list.</p>
</Dialog>
```

## 4. Accessibility notes

- Every interactive primitive carries the `focus-ring` utility (gold-ink ring,
  AA on light). Never remove it.
- Touch targets ≥ 44px: `Button md`/`lg`, `Input`/`Select` default, `NavLink`
  all satisfy this.
- Icons ship decorative (`aria-hidden`). Give them `label` only when the icon
  is the sole label (e.g. icon-only buttons).
- `Dialog` + `MobileDrawer` share one focus-trap implementation: Tab/Shift+Tab
  wrap inside, Escape closes, focus returns to the invoker.
- `Menu` uses `role="menu"` with full roving arrow keys; Tab closes the menu
  but preserves the page's natural focus flow.
- `StatusPill` always renders colour + text (never colour alone).
- `Toast` region is `aria-live="polite"`, `role="status"` per toast. Sticky
  toasts (`duration: 0`) should be rare; prefer inline errors inside forms.
- `prefers-reduced-motion` collapses transitions via tokens and
  `motion-reduce:` utilities on spinner, skeleton, nav-link.
- Scripture quotes should use the `scripture` utility (Fraunces italic) —
  never for chrome text.

## 5. `apiFetch` usage contract

- `const data = await apiFetch<Person[]>('/api/v1/people');` — unwrapped
  from `{ data: Person[] }`.
- `apiFetch('/…', { method: 'POST', json: payload })` sets the `Content-Type`
  automatically.
- Errors: `try { … } catch (e) { if (e instanceof ApiError) show(e.status, e.message); }`.
- Dev identity: set the fake user once from the browser console for each
  pilot session, e.g.
  ```js
  writeDevHeaders({
    'x-dev-user-id': '…',
    'x-dev-church-id': '…',
    'x-dev-person-id': '…',
    'x-dev-permissions': 'events:read,events:write',
  });
  ```
  and only when `NEXT_PUBLIC_ALLOW_DEV_AUTH=1` — otherwise the headers are
  ignored.
- **Do not** paste UUIDs into feature pages. The `/events` + `/platform`
  surfaces that still do so are legacy and will be migrated by Agents 4–5.

## 6. What Agents 4 and 5 must consume

### Agent 4 (Admin) — minimum imports

- `AdminShell`, `NavGroup`, `NavItem`, `SkipLink`
- `PageHeader`, `Panel`, `Card`, `CardHeader`, `CardTitle`
- `Table*` (via `<Panel flush>`)
- `Metric`, `Badge`, `StatusPill`, `EmptyState`
- `Button`, `Field`, `Input`, `Textarea`, `Select`, `SearchField`
- `Dialog`, `DialogFooter`, `Menu`, `MenuItem`, `MenuSeparator`
- `Tabs`, `TabList`, `Tab`, `TabPanel`
- `Avatar`, `Pagination`, `Skeleton`, `Spinner`
- `ToastProvider` (once per shell mount) + `useToast`
- `SessionProvider`, `useSession`, `useRole`, `apiFetch`

Admin groups should be built from the session via a server-side factory
(`buildAdminGroups(session)`) so the sidebar reacts to role changes.

### Agent 5 (Member + Auth) — minimum imports

- `MemberShell`, `BottomNavItem`, `NavGroup`
- Same primitives as admin, plus:
  - `scripture` utility (via `<span className="scripture">…</span>`) for
    devotional quotes on the home.
  - `BrandMark` on the sign-in / verify / pin screens (`(auth)/*`).
- Keep forms vertical on phones; two-column grids only from `md:` upwards.
- Reserve the top-right notifications slot for push-safety (Phase 4b).

## 7. Preview

- `/ui-preview` renders every primitive inside a shell switcher
  (admin ↔ member). Not linked from product navigation; safe to delete after
  Checkpoint D if the inventory moves into Storybook or similar.

## 8. Known deferrals

| Area | Status | Reason |
|---|---|---|
| Language switcher UI | Deferred to Phase 4/5 | Day-one i18n keys land with the feature pages; the switcher needs a backend write (`PATCH /api/v1/people/me/locale`) that is not in scope here. |
| Dark mode audit | Deferred | Tokens ship stubs but no `.dark` toggle exists. Agent 6 audits in Phase 5. |
| Rich data table (sort, filter, column hide) | Deferred | Per-module needs vary; Agents 4–5 build on top of the table primitives. |
| Platform console skin pass | Out of scope here (Checkpoint A Q3) | `.platform-*` keeps its own CSS. |
| OG image / 1200×630 | Owned by Agent 2 followup | Not a UI-primitive concern. |
