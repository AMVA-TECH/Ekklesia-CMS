# Member Portal — Business Requirements

## 1. Purpose

Provide members with a useful, accessible self-service experience connected to the church's administration records. The portal is not the future social network.

## 2. First-release member journeys

### Journey A — Access and profile
1. Member receives an invitation or uses an approved account-creation process.
2. Member authenticates.
3. Member views their own profile and membership information.
4. Member updates permitted fields.
5. Restricted changes are submitted for administrator review.
6. Member sees update outcome.

### Journey B — Discover and join a ministry/group
1. Member browses active, discoverable units.
2. Member reads purpose, schedule, eligibility and contact details.
3. Member requests to join.
4. Unit leader reviews.
5. Member receives approval/rejection/request-for-information.
6. Approved participation appears in the member's portal.

### Journey C — Events
1. Member views upcoming events.
2. Member opens event details.
3. Member registers if registration is enabled.
4. Member receives confirmation or waitlist outcome.
5. Member views/cancels registration according to policy.
6. After the event, attendance appears only when actual attendance is recorded.

### Journey D — Personal participation
1. Member views their attendance history.
2. Member views current ministry/group participation.
3. Member discovers projects and volunteer opportunities.
4. Member submits interest and receives an outcome.
5. Member can request correction of inaccurate personal information.

## 3. Functional requirements

- MP-001: Member can securely access their own portal.
- MP-002: Member can view permitted profile and membership fields.
- MP-003: Member can update fields configured as self-editable.
- MP-004: Member can submit a correction request for restricted fields.
- MP-005: Member can view permitted household relationships.
- MP-006: Member can browse active ministries/life groups marked discoverable.
- MP-007: Member can submit, withdraw and track participation requests where policy allows.
- MP-008: Member can browse published events.
- MP-009: Member can register/cancel within configured rules.
- MP-010: Member can view their own attendance history.
- MP-011: Member can browse open projects/volunteering opportunities.
- MP-012: Member can express interest and track volunteer requests.
- MP-013: Member can view announcements targeted to them.
- MP-014: Member can manage permitted communication preferences.
- MP-015: Member can request help/correction through an authorised process.

## 4. Explicit non-functional expectations

- Mobile-first responsive design.
- Simple navigation and low-friction tasks.
- Clear status labels and feedback.
- Accessible language and readable forms.
- Local timezone and configurable locale.
- Avoid exposing other members' personal information by default.
- Member portal actions must be authorised server-side, not only hidden in the UI.

## 5. Not included

No social feed, friend requests, direct messaging, group chat, stories, likes, comments, member posts or social media sharing in this release.
