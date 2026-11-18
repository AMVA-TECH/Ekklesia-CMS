'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/app/_ekklesia/ui/utils';
import { EkklesiaBrandMark } from './ekklesia-brand-mark';
import {
  hasSeenEkklesiaIntro,
  markEkklesiaIntroSeen,
} from './intro-session';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import './brand-motion.css';

export interface EkklesiaIntroProps {
  /** Called when the intro finishes or is skipped. */
  onComplete: () => void;
  /** Force-play even if already seen this session (tests / demos). */
  force?: boolean;
  className?: string;
}

type IntroPhase = 'play' | 'exit';

/** Full cinematic sequence before exit (~3.8s). */
const INTRO_MS = 3800;
const EXIT_MS = 520;
const REDUCED_HOLD_MS = 800;

/** Optional override via `?introHold=ms` (with `?intro=force`) for demos. */
function resolveIntroHoldMs(reduced: boolean): number {
  if (reduced) return REDUCED_HOLD_MS;
  try {
    const raw = new URLSearchParams(window.location.search).get('introHold');
    if (raw) {
      const ms = Number.parseInt(raw, 10);
      if (Number.isFinite(ms) && ms >= 800 && ms <= 20000) return ms;
    }
  } catch {
    // ignore
  }
  return INTRO_MS;
}

/**
 * Cinematic full-viewport Ekklesia logo reveal.
 * Plays once per browser session; respects reduced-motion and skip.
 * Uses the official branding SVG (no geometry changes).
 */
export function EkklesiaIntro({
  onComplete,
  force = false,
  className,
}: EkklesiaIntroProps): React.ReactElement | null {
  const tc = useTranslations('Common');
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<IntroPhase>('play');
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markEkklesiaIntroSeen();
    setVisible(false);
    onComplete();
  }, [onComplete]);

  const beginExit = useCallback(() => {
    setPhase((current) => (current === 'exit' ? current : 'exit'));
    if (exitTimerRef.current != null) return;
    exitTimerRef.current = window.setTimeout(finish, EXIT_MS);
  }, [finish]);

  useEffect(() => {
    if (!force && hasSeenEkklesiaIntro()) {
      finish();
      return;
    }

    const hold = resolveIntroHoldMs(reduced);
    const timer = window.setTimeout(beginExit, hold);
    return () => {
      window.clearTimeout(timer);
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
    // Run once per mount; force/reduced captured at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        beginExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beginExit]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'ek-intro',
        phase === 'exit' && 'ek-intro--exit',
        reduced && 'ek-intro--reduced',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={tc('brandWelcomeAria')}
    >
      <div className="ek-intro-veil" aria-hidden="true" />
      <div className="ek-intro-light" aria-hidden="true" />

      <div className="ek-intro-stage">
        <div className="ek-intro-mark-wrap">
          <div className="ek-intro-bloom" aria-hidden="true" />
          <div className="ek-intro-sweep" aria-hidden="true" />
          {/* Official SVG asset — reveal via CSS, geometry untouched. */}
          <EkklesiaBrandMark
            size={168}
            mode="static"
            tone="dark"
            className="ek-intro-mark"
          />
        </div>

        <p className="ek-intro-wordmark">{tc('appName')}</p>
      </div>

      <button type="button" className="ek-intro-skip" onClick={beginExit}>
        {tc('skip')}
      </button>
    </div>
  );
}
