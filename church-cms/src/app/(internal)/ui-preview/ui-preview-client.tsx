'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  BrandMark,
  Button,
  Card,
  CardHeader,
  CardSubtitle,
  CardTitle,
  Dialog,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Metric,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Select,
  Skeleton,
  Spinner,
  StatusPill,
  Tab,
  TabList,
  TabPanel,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  ToastProvider,
  TR,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import {
  AdminShell,
  type NavGroup,
  MemberShell,
  type BottomNavItem,
} from '@/app/_ekklesia/shell';

const ADMIN_GROUPS: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/ui-preview', hint: 'Attention queue', icon: 'home' },
      { label: 'Notices', href: '/ui-preview/notices', hint: 'Church-wide alerts', icon: 'bell' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'People', href: '/ui-preview/people', hint: 'Members & visitors', icon: 'users' },
      { label: 'Households', href: '/ui-preview/households', icon: 'user' },
      { label: 'Memberships', href: '/ui-preview/memberships', icon: 'shield' },
    ],
  },
  {
    label: 'Ministry',
    items: [
      { label: 'Events', href: '/ui-preview/events', icon: 'calendar' },
      { label: 'Attendance', href: '/ui-preview/attendance', icon: 'check-circle' },
      { label: 'Ministries', href: '/ui-preview/ministries', icon: 'heart' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Offerings', href: '/ui-preview/offerings', icon: 'wallet' },
      { label: 'Pledges', href: '/ui-preview/pledges', icon: 'hand' },
      { label: 'Expenses', href: '/ui-preview/expenses', icon: 'card' },
    ],
  },
  {
    label: 'Settings',
    items: [{ label: 'Settings', href: '/ui-preview/settings', icon: 'settings' }],
  },
];

const MEMBER_DRAWER_GROUPS: readonly NavGroup[] = [
  {
    label: 'My church',
    items: [
      { label: 'Directory', href: '/ui-preview/m/directory', icon: 'users' },
      { label: 'Devotional', href: '/ui-preview/m/devotional', icon: 'book' },
      { label: 'Notices', href: '/ui-preview/m/notices', icon: 'bell' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/ui-preview/m/settings', icon: 'settings' },
      { label: 'Sign out', href: '/ui-preview/m/signout', icon: 'logout' },
    ],
  },
];

const MEMBER_BOTTOM: readonly BottomNavItem[] = [
  { label: 'Home', href: '/ui-preview', icon: 'home' },
  { label: 'Community', href: '/ui-preview/m/directory', icon: 'users' },
  { label: 'Events', href: '/ui-preview/m/events', icon: 'calendar' },
  { label: 'Giving', href: '/ui-preview/m/giving', icon: 'hand' },
  { label: 'Profile', href: '/ui-preview/m/profile', icon: 'user' },
];

export function UiPreviewClient(): React.ReactElement {
  const [shell, setShell] = useState<'admin' | 'member'>('admin');
  const content = <PreviewSections />;

  if (shell === 'member') {
    return (
      <ToastProvider>
        <MemberShell
          drawerGroups={MEMBER_DRAWER_GROUPS}
          bottomItems={MEMBER_BOTTOM}
          churchName="CrossLife · Dar es Salaam"
          topbarEnd={<ShellSwitcher shell={shell} onChange={setShell} />}
        >
          {content}
        </MemberShell>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AdminShell
        groups={ADMIN_GROUPS}
        churchName="CrossLife · Dar es Salaam"
        topbarCenter={
          <SearchField className="max-w-md" placeholder="Search people, events, ministries…" />
        }
        topbarEnd={<ShellSwitcher shell={shell} onChange={setShell} />}
      >
        {content}
      </AdminShell>
    </ToastProvider>
  );
}

function ShellSwitcher({
  shell,
  onChange,
}: {
  shell: 'admin' | 'member';
  onChange: (next: 'admin' | 'member') => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:inline-flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => onChange('admin')}
          className={`rounded-sm px-2.5 py-1 text-xs font-medium focus-ring ${
            shell === 'admin' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'
          }`}
        >
          Admin shell
        </button>
        <button
          type="button"
          onClick={() => onChange('member')}
          className={`rounded-sm px-2.5 py-1 text-xs font-medium focus-ring ${
            shell === 'member' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'
          }`}
        >
          Member shell
        </button>
      </div>
      <Menu
        trigger={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted focus-ring"
          >
            <Avatar name="Ada Noah" size="sm" />
            <span className="hidden text-sm font-medium sm:inline">Ada Noah</span>
            <Icon name="chevron-down" size={14} className="text-muted-foreground" />
          </button>
        }
      >
        <MenuLabel>Signed in</MenuLabel>
        <MenuItem icon="user">Profile</MenuItem>
        <MenuItem icon="settings">Settings</MenuItem>
        <MenuSeparator />
        <MenuItem icon="logout" destructive>
          Sign out
        </MenuItem>
      </Menu>
    </div>
  );
}

function PreviewSections(): React.ReactElement {
  const { push } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('overview');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Ekklesia · Phase 3"
        title="Shared component library"
        lede="Every primitive Agents 4 and 5 will consume. Tokens come from docs/ekklesia/design-tokens.md. Switch between admin and member shells in the top-right to compare densities."
        actions={
          <>
            <Button variant="secondary" iconLeft="download">
              Export tokens
            </Button>
            <Button iconLeft="plus">New record</Button>
          </>
        }
      />

      <section aria-label="Brand mark" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Brand mark</h2>
        <div className="flex flex-wrap items-center gap-6 rounded-card border border-border bg-surface p-5">
          <BrandMark size={48} variant="logo" surface="light" subline="CrossLife · Dar es Salaam" />
          <BrandMark size={32} variant="logo" surface="light" withWordmark={false} />
          <BrandMark size={32} variant="symbol" surface="light" />
          <span className="scripture text-lg text-foreground/80">
            “Let the little children come to me.” — Mark 10:14
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 rounded-card border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-background)] p-5">
          <BrandMark size={48} variant="symbol" surface="dark" subline="CrossLife · Dar es Salaam" />
          <BrandMark size={28} variant="symbol" surface="dark" withWordmark={false} />
          <BrandMark size={32} variant="logo" surface="dark" withWordmark={false} />
        </div>
      </section>

      <section aria-label="Buttons" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive" iconLeft="trash">
              Delete
            </Button>
            <Button variant="gold" iconLeft="star">
              Celebrate
            </Button>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="sm" iconLeft="plus">
              Small
            </Button>
            <Button size="md" iconRight="chevron-right">
              Medium
            </Button>
            <Button size="lg" iconLeft="check">
              Large
            </Button>
          </div>
        </Card>
      </section>

      <section aria-label="Metrics" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Metrics / KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Active members"
            value="412"
            icon="users"
            tone="sage"
            change="+8 this month"
            changeDirection="up"
          />
          <Metric
            label="Sunday attendance"
            value="283"
            icon="calendar-check"
            tone="sky"
            hint="4-week average"
          />
          <Metric
            label="Pledges received"
            value="TZS 2.4M"
            icon="hand"
            tone="peach"
            change="−3% vs last month"
            changeDirection="down"
          />
          <Metric
            label="Prayer requests"
            value="27"
            icon="heart"
            tone="lavender"
            hint="Open follow-ups"
            href="#"
          />
        </div>
      </section>

      <section aria-label="Panels and tables" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Panels + tables</h2>
        <Panel
          title="Recent membership applications"
          subtitle="Awaiting a church administrator review"
          linkHref="#"
          flush
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Name</TH>
                  <TH>Household</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Submitted</TH>
                </TR>
              </THead>
              <TBody>
                <TR>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Ada Noah" size="sm" />
                      <span className="font-medium">Ada Noah</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">Noah household</TD>
                  <TD>
                    <StatusPill tone="pending">Pending review</StatusPill>
                  </TD>
                  <TD className="text-right text-muted-foreground tabular-nums">2 days ago</TD>
                </TR>
                <TR selected>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Baraka Mwangi" size="sm" />
                      <span className="font-medium">Baraka Mwangi</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">Mwangi household</TD>
                  <TD>
                    <StatusPill tone="success">Approved</StatusPill>
                  </TD>
                  <TD className="text-right text-muted-foreground tabular-nums">5 days ago</TD>
                </TR>
                <TR>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Catherine Juma" size="sm" />
                      <span className="font-medium">Catherine Juma</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">Juma household</TD>
                  <TD>
                    <StatusPill tone="warning">Needs info</StatusPill>
                  </TD>
                  <TD className="text-right text-muted-foreground tabular-nums">1 week ago</TD>
                </TR>
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      </section>

      <section aria-label="Forms" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Forms</h2>
        <Card>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" hint="As it appears on your church records" required>
              <Input placeholder="Ada Noah" />
            </Field>
            <Field label="Email" hint="We'll send a sign-in link" required>
              <Input type="email" placeholder="ada@example.org" />
            </Field>
            <Field label="Household role">
              <Select defaultValue="">
                <option value="" disabled>
                  Select a role
                </option>
                <option value="head">Head of household</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field
              label="Preferred phone"
              error="Please enter a valid phone number in international format."
            >
              <Input placeholder="+255 7XX XXX XXX" defaultValue="+255" />
            </Field>
            <Field label="Testimony" className="md:col-span-2">
              <Textarea
                placeholder="A short note from the new member (optional)"
                defaultValue=""
              />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button iconLeft="check">Save changes</Button>
          </div>
        </Card>
      </section>

      <section aria-label="Badges and statuses" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Badges + statuses</h2>
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="gold">Gold</Badge>
            <Badge tone="sage">Sage</Badge>
            <Badge tone="sky">Sky</Badge>
            <Badge tone="lavender">Lavender</Badge>
            <Badge tone="peach">Peach</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="gold" solid>
              Solid gold
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone="neutral">Draft</StatusPill>
            <StatusPill tone="success">Published</StatusPill>
            <StatusPill tone="pending">Awaiting approval</StatusPill>
            <StatusPill tone="warning">Needs info</StatusPill>
            <StatusPill tone="danger">Overdue</StatusPill>
            <StatusPill tone="info">In review</StatusPill>
          </div>
        </Card>
      </section>

      <section aria-label="Tabs" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tabs</h2>
        <Card>
          <Tabs value={tab} onValueChange={setTab}>
            <TabList>
              <Tab value="overview">Overview</Tab>
              <Tab value="roster">Roster</Tab>
              <Tab value="finance">Finance</Tab>
            </TabList>
            <TabPanel value="overview">
              <p className="pt-4 text-sm text-muted-foreground">
                Attendance is up 4% versus last quarter. Follow-ups needed on 27 prayer
                requests.
              </p>
            </TabPanel>
            <TabPanel value="roster">
              <p className="pt-4 text-sm text-muted-foreground">
                412 active members across 134 households.
              </p>
            </TabPanel>
            <TabPanel value="finance">
              <p className="pt-4 text-sm text-muted-foreground">
                TZS 2.4M received this period across pledges and offerings.
              </p>
            </TabPanel>
          </Tabs>
        </Card>
      </section>

      <section aria-label="Empty states" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Empty states + skeletons</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="none">
            <EmptyState
              icon="hand"
              tone="peach"
              title="No pledges yet this period"
              description="When members submit pledges, you'll see them here with their fulfilment status."
              action={<Button iconLeft="plus">Record a pledge</Button>}
            />
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Loading member profile</CardTitle>
                <CardSubtitle>Simulated skeleton state</CardSubtitle>
              </div>
            </CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton size="block" className="h-12 w-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton size="heading" />
                <Skeleton size="line" className="w-5/6" />
                <Skeleton size="line" className="w-3/4" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>Fetching this household&rsquo;s attendance history…</span>
            </div>
          </Card>
        </div>
      </section>

      <section aria-label="Dialog and toast" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Dialog + toast</h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button
              variant="ghost"
              iconLeft="bell"
              onClick={() =>
                push({
                  tone: 'success',
                  title: 'Attendance recorded',
                  message: '283 members marked present at Sunday service.',
                })
              }
            >
              Trigger toast
            </Button>
            <Button
              variant="ghost"
              iconLeft="alert"
              onClick={() =>
                push({
                  tone: 'warning',
                  title: 'Unverified contact',
                  message: 'Ada Noah has no verified phone — follow-up may be delayed.',
                })
              }
            >
              Warning toast
            </Button>
          </div>
        </Card>
      </section>

      <section aria-label="Pagination" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pagination</h2>
        <Card>
          <Pagination page={page} totalPages={8} onPageChange={setPage} />
        </Card>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add a new member"
        description="This creates a membership record; the person does not yet receive an invitation."
        footer={
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                push({ tone: 'success', message: 'Member added.' });
              }}
            >
              Add member
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Full name" required>
            <Input placeholder="Ada Noah" data-autofocus />
          </Field>
          <Field label="Household">
            <Select defaultValue="">
              <option value="" disabled>
                Choose a household
              </option>
              <option>Noah household</option>
              <option>Mwangi household</option>
              <option>Juma household</option>
            </Select>
          </Field>
          <Field label="Role" hint="Role in the active church — not permissions.">
            <Select defaultValue="member">
              <option value="member">Member</option>
              <option value="visitor">Visitor</option>
              <option value="guest">Guest</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
