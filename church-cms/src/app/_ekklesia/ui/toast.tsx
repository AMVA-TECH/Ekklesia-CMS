'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';
import { cn } from './utils';

/** Available toast tones. */
export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** A toast scheduled for display. */
export interface Toast {
  id: string;
  title?: ReactNode;
  message: ReactNode;
  tone?: ToastTone;
  /** Milliseconds to auto-dismiss (0 = sticky). Default 5000. */
  duration?: number;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  toasts: readonly Toast[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Provider that owns the toast queue + mounts the toast region.
 * Mount once per experience (admin shell, member shell).
 */
export function ToastProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastContextValue['push']>((input) => {
    const id =
      input.id ??
      `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const next: Toast = {
      duration: 5000,
      tone: 'neutral',
      ...input,
      id,
    };
    setToasts((current) => [...current, next]);
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ push, dismiss, toasts }),
    [push, dismiss, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Hook for dispatching toasts. Returns `{ push, dismiss }`. */
export function useToast(): { push: ToastContextValue['push']; dismiss: ToastContextValue['dismiss'] } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() must be used inside <ToastProvider>.');
  }
  return { push: ctx.push, dismiss: ctx.dismiss };
}

const TONE_CLASSES: Record<ToastTone, string> = {
  neutral: 'border-border bg-surface text-foreground',
  success:
    'border-[color:var(--success-soft)] bg-[color:var(--success-soft)] text-[color:var(--success-ink)]',
  warning:
    'border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] text-[color:var(--warning-ink)]',
  danger:
    'border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] text-[color:var(--danger-ink)]',
  info:
    'border-[color:var(--info-soft)] bg-[color:var(--info-soft)] text-[color:var(--info-ink)]',
};

const TONE_ICON: Record<ToastTone, Parameters<typeof Icon>[0]['name']> = {
  neutral: 'info',
  success: 'check-circle',
  warning: 'alert',
  danger: 'alert-circle',
  info: 'info',
};

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: string) => void;
}): React.ReactElement | null {
  // Defer portal until after mount so SSR and the first client paint match
  // (avoids `typeof document` hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end sm:p-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}): React.ReactElement {
  const duration = toast.duration ?? 5000;
  useEffect(() => {
    if (!duration) return;
    const id = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(id);
  }, [duration, onDismiss, toast.id]);

  const tone = toast.tone ?? 'neutral';
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border p-3 shadow-pop',
        TONE_CLASSES[tone],
      )}
    >
      <Icon name={TONE_ICON[tone]} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {toast.title ? (
          <p className="text-sm font-semibold">{toast.title}</p>
        ) : null}
        <p className="text-sm">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-sm text-current/80 hover:text-current focus-ring"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
