'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/app/_ekklesia/ui/utils';
import {
  EKKLESIA_ASSETS,
  EKKLESIA_GOLD_PATHS,
  EKKLESIA_GOLD_STROKE_WIDTH,
  EKKLESIA_SYMBOL_VIEWBOX,
  EKKLESIA_WHITE_OPACITY,
  EKKLESIA_WHITE_PATHS,
  EKKLESIA_WHITE_STROKE_WIDTH,
  EKKLESIA_WHITE_TRANSFORM,
} from './symbol-paths';

export type EkklesiaBrandMarkMode = 'static' | 'draw' | 'complete';
export type EkklesiaBrandMarkTone = 'dark' | 'light';

export interface EkklesiaBrandMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  /**
   * `static` — official SVG image (no animation).
   * `draw` — inline SVG with stroke reveal (intro).
   * `complete` — inline SVG fully drawn (post-draw / reduced motion).
   */
  mode?: EkklesiaBrandMarkMode;
  /** Contrast surface for static assets. */
  tone?: EkklesiaBrandMarkTone;
  className?: string;
  /** Extra class on the SVG root when mode is draw/complete. */
  svgClassName?: string;
}

/**
 * Official Ekklesia symbol. Geometry matches `/public/branding/ekklesia-symbol-*.svg`.
 * Draw mode animates stroke-dashoffset only — paths and colours stay unchanged.
 */
export function EkklesiaBrandMark({
  size = 96,
  mode = 'static',
  tone = 'dark',
  className,
  svgClassName,
}: EkklesiaBrandMarkProps): React.ReactElement {
  const tc = useTranslations('Common');
  const uid = useId().replace(/:/g, '');
  const goldGradId = `ek-gold-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawArmed, setDrawArmed] = useState(mode !== 'draw');
  const brandName = tc('appName');

  useEffect(() => {
    if (mode !== 'draw' || !svgRef.current) {
      setDrawArmed(true);
      return;
    }
    const paths = svgRef.current.querySelectorAll<SVGPathElement>('path[data-ek-stroke]');
    paths.forEach((path, index) => {
      const length = Math.ceil(path.getTotalLength());
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.setProperty('--ek-delay', `${90 + index * 75}ms`);
    });
    // Arm CSS draw only after dash lengths are set (avoids invisible zero-length race).
    const arm = window.requestAnimationFrame(() => setDrawArmed(true));
    return () => window.cancelAnimationFrame(arm);
  }, [mode]);

  if (mode === 'static') {
    const src =
      tone === 'light' ? EKKLESIA_ASSETS.symbolLight : EKKLESIA_ASSETS.symbolDark;
    return (
      // Official SVG asset — next/image adds little for SVG.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn('block shrink-0', className)}
        decoding="async"
        draggable={false}
      />
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={EKKLESIA_SYMBOL_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={brandName}
      className={cn(
        'ek-brand-mark block shrink-0',
        mode === 'draw' && drawArmed && 'ek-brand-mark--draw',
        mode === 'complete' && 'ek-brand-mark--complete',
        mode === 'draw' && !drawArmed && 'ek-brand-mark--predraw',
        svgClassName,
        className,
      )}
    >
      <title>{brandName}</title>
      <defs>
        <linearGradient
          id={goldGradId}
          x1="80"
          y1="160"
          x2="420"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F7EFD8" />
          <stop offset="0.28" stopColor="#E8D4A0" />
          <stop offset="0.62" stopColor="#C9A55C" />
          <stop offset="1" stopColor="#A8863F" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke={`url(#${goldGradId})`} strokeWidth={EKKLESIA_GOLD_STROKE_WIDTH}>
          {EKKLESIA_GOLD_PATHS.map((d) => (
            <path key={`g-${d.slice(0, 24)}`} d={d} data-ek-stroke="gold" />
          ))}
        </g>
        <g
          stroke="#FFFFFF"
          strokeWidth={EKKLESIA_WHITE_STROKE_WIDTH}
          opacity={EKKLESIA_WHITE_OPACITY}
          transform={EKKLESIA_WHITE_TRANSFORM}
        >
          {EKKLESIA_WHITE_PATHS.map((d) => (
            <path key={`w-${d.slice(0, 24)}`} d={d} data-ek-stroke="white" />
          ))}
        </g>
      </g>
    </svg>
  );
}
