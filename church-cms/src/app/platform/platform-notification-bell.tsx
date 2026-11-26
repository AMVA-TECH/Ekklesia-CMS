'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { cn } from '@/app/_ekklesia/ui/utils';
import { platformApi } from './platform-api';

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  tone: 'info' | 'warning' | 'danger';
};

type NotificationsPayload = {
  unreadCount: number;
  summary: {
    applicationsPending: number;
    provisioningFailed: number;
    incidentsOpen: number;
  };
  items: NotificationItem[];
};

const POLL_MS = 60_000;

function toneDot(tone: NotificationItem['tone']): string {
  if (tone === 'danger') return 'bg-[color:var(--danger)]';
  if (tone === 'warning') return 'bg-[color:var(--warning)]';
  return 'bg-[color:var(--sky)]';
}

/**
 * Platform topbar bell — alerts for KYC queue, failed provisioning, open incidents.
 */
export function PlatformNotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const panelId = `platform-notif-${reactId}`;

  const load = useCallback(async () => {
    try {
      const res = await platformApi<NotificationsPayload>(
        '/api/v1/platform/notifications',
      );
      setData(res);
    } catch {
      // Keep last good payload; empty on first failure.
      setData((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} needing attention`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
          'text-foreground hover:bg-surface-muted focus-ring',
        )}
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--danger)] px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Operator alerts"
          className="absolute right-0 top-full z-40 mt-1 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Alerts</p>
            {data?.summary.applicationsPending ? (
              <Link
                href="/platform/churches/applications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-[color:var(--brand-gold)] hover:underline"
              >
                Verification queue
              </Link>
            ) : null}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading && !data ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Checking for alerts…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing needs attention right now.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-3 py-2.5 hover:bg-surface-muted focus-ring"
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          toneDot(item.tone),
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-3 py-2">
            <Link
              href="/platform/churches/applications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Open application verification →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
