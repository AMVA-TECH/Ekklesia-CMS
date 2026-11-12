# Ekklesia Member Navigation

**Owner:** Agent 5 (Member + Auth Experience) · **Phase:** 4b · **Status:** Delivered
**Source of truth:** `church-cms/src/app/(member)/member-shell-mount.tsx`
**Companions:** `components.md` §2.3 (shells) · `brand-usage.md` §2 (colour ratios)

> Admin equivalent: Agent 4 owns the admin navigation under `(admin)/**`.

## 1. Philosophy

The member home is a **welcoming church home**, not a simplified admin dashboard.
A member should be able to get to the four things they do weekly in one tap,
and the rest in two:

1. See what is happening this week → **Home**
2. Join / belong → **Community**
3. Register for / check an event → **Events**
4. Keep their own details & preferences correct → **Profile**

Giving (and the quieter screens: attendance, notifications) live in the
hamburger drawer so the bottom bar stays legible on a ~360 px phone.

## 2. Bottom navigation (phones, `< md`)

Four items — the gold dot indicator sits above the active glyph. Order is
fixed; no role-based visibility (every pilot role sees the same four tabs).

| Order | Label      | Href        | Icon      | Notes                                    |
| ----- | ---------- | ----------- | --------- | ---------------------------------------- |
| 1     | Home       | `/home`     | `home`    | Personal week-in-review                  |
| 2     | Community  | `/community`| `users`   | Ministries, groups, directory            |
| 3     | Events     | `/events`   | `calendar`| Services + gatherings; registrations     |
| 4     | Profile    | `/profile`  | `user`    | Contact details + privacy + preferences  |

Giving deliberately does **not** take the 5th slot. Reasons:

- A 5-tab bottom nav on 360 px phones shrinks each target below 44 px once
  padding, labels, and the gold dot are drawn.
- Giving is weekly-at-most for most members; the drawer is the right home.
- A contextual "Review giving" prompt surfaces on Home when the member has
  unpaid pledges, so the path is never truly hidden.

## 3. Drawer navigation (`<lg`, via the topbar hamburger)

Groups are shallow and labelled. Same `NavGroup[]` contract Agent 3 exports
from `@/app/_ekklesia/shell` so the drawer reuses the shared primitive.

### Group: Me

| Label           | Href           | Icon              | Hint                              |
| --------------- | -------------- | ----------------- | --------------------------------- |
| Home            | `/home`        | `home`            | What is happening this week       |
| My profile      | `/profile`     | `user`            | Contact details & preferences     |
| My attendance   | `/attendance`  | `calendar-check`  | Sundays and services              |

### Group: Participation

| Label      | Href         | Icon       | Hint                       |
| ---------- | ------------ | ---------- | -------------------------- |
| Events     | `/events`    | `calendar` | Browse and register        |
| Community  | `/community` | `users`    | Ministries & groups        |
| Giving     | `/giving`    | `hand`     | Pledges & offerings        |

### Group: Settings

| Label         | Href             | Icon   | Hint             |
| ------------- | ---------------- | ------ | ---------------- |
| Notifications | `/notifications` | `bell` | How we reach you |

The account menu (sign out, profile shortcut) lives in the topbar on the
right, not in the drawer — otherwise phones carry two sign-out buttons.

## 4. Topbar

- Phones + tablets (`<lg`): hamburger (drawer) · brand mark · bell shortcut · account avatar menu
- Desktop (`lg+`): no hamburger · brand mark via drawer button hidden · church name chip (optional) · bell shortcut · account menu

The bell links directly to `/notifications` (preferences). We do not ship an
inbox badge yet — the Phrase-4b API surface only covers preferences, not an
unread stream. When a push/inbox feed lands, put a count badge on this icon
via the `BottomNavItem.endSlot` + topbar sibling pattern.

## 5. Colour associations (Home + beyond)

Taken from the Phase 4b brief; applied consistently across member screens
so members build muscle-memory for the visual categories.

| Category                   | Tone     | Where it shows                              |
| -------------------------- | -------- | ------------------------------------------- |
| Groups / people / ministry | sage     | Community, "Your ministries" rows           |
| Events / gatherings        | sky      | Events list, hero poster chip               |
| Giving / pledges           | gold     | Giving overview, pledge nudge card          |
| Devotionals / reflection   | lavender | Daily devotional card (Fraunces quote)      |
| Announcements / warmth     | peach    | "Latest from the church" rows               |

Icons use the tone colour against the matching `*-soft` tile. Body text and
labels stay in `text-foreground` / `text-muted-foreground` — never in the
tone colour itself (contrast). See `brand-usage.md` §3.

## 6. Scripture / Fraunces

Fraunces italic appears in exactly **one** place on the member surface:
the daily devotional quote on `/home`, via the `scripture` utility. Any
other use (nav, headings, body, buttons) is a bug.

## 7. Auth entry/exit

| Event                              | Destination                                                 |
| ---------------------------------- | ----------------------------------------------------------- |
| Unauthenticated hit on `(member)/…`| `router.replace('/sign-in?redirect=<path>')`                |
| Sign-in success (member)           | `router.push('/home')` or `redirect` query                  |
| Sign-in success (admin + MFA)      | `router.push('/verify?redirect=<path>')`                    |
| MFA verify success                 | `router.push(redirect ?? '/home')`                          |
| Sign-out from account menu         | `POST /api/v1/auth/logout` then `router.push('/sign-in')`   |

The auth routes `(auth)/*` have their own thin branded layout; they do **not**
mount `MemberShell`. Sign-in forms use `apiFetch({ skipDevAuth: true })`
because the dev-header shortcut exists to **impersonate** an already-known
identity, not to bypass authentication.

## 8. Admin coordination

Admins who sign in still land on `/home` by default. Jumping into the admin
experience is Agent 4's responsibility — their shell handles the first
visit to `/admin/*`. We deliberately do not surface an admin shortcut on the
member shell to keep the two experiences distinct (Checkpoint A Q1).
