import type { SVGProps } from 'react';
import { iconPaths, type IconName } from './icon-paths';

/** Props accepted by the `<Icon>` wrapper. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  /** Registered icon name — see `IconName` and `icon-paths.tsx`. */
  name: IconName;
  /**
   * Size in pixels (default 16). Also accepts a CSS length string
   * (e.g. `"1.25rem"`) or `null` to defer sizing to `className`.
   */
  size?: number | string | null;
  /**
   * Accessible label. If omitted the icon is treated as decorative
   * (`aria-hidden`) and screen readers skip it. Pair decorative icons
   * with a visible or sr-only text label elsewhere.
   */
  label?: string;
}

const DEFAULT_SIZE = 16;

/**
 * Inline SVG icon from the Ekklesia outline set.
 *
 * Decorative by default — supply `label` to expose it to assistive tech.
 * Colour follows `currentColor`, so wrap in `text-foreground`,
 * `text-brand-gold-ink`, a tone utility, etc. to recolour.
 */
export function Icon({
  name,
  size = DEFAULT_SIZE,
  label,
  className,
  strokeWidth = 1.75,
  width,
  height,
  ...rest
}: IconProps): React.ReactElement {
  const dimension = size === null ? undefined : size;
  const decorative = label === undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={width ?? dimension}
      height={height ?? dimension}
      className={className}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {iconPaths[name]}
    </svg>
  );
}
