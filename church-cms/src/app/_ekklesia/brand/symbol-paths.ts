/**
 * Official Ekklesia symbol geometry from `/public/branding/ekklesia-symbol-dark.svg`.
 * Do not redesign — keep path data, stroke widths and colour treatment identical.
 */

export const EKKLESIA_SYMBOL_VIEWBOX = '0 0 512 512';

/** Gold stroke paths (fish arcs + cross). */
export const EKKLESIA_GOLD_PATHS = [
  'M78 255 C88.7 241.7 98 226.2 110 215 C122 203.8 135 195.2 150 188 C165 180.8 181.7 174.2 200 172 C218.3 169.8 240 171.3 260 175 C280 178.7 303.3 185.8 320 194 C336.7 202.2 349.2 215 360 224 C370.8 233 376.7 247 385 248 C393.3 249 402.2 238.2 410 230 C417.8 221.8 424.7 209.3 432 199',
  'M78 255 C88.7 267.3 98 281.2 110 292 C122 302.8 138 313.7 150 320 C162 326.3 171.3 326.7 182 330',
  'M208 338 C225.3 337.7 241.3 340.8 260 337 C278.7 333.2 303.3 323.3 320 315 C336.7 306.7 349.2 294.8 360 287 C370.8 279.2 376.7 269.3 385 268 C393.3 266.7 402.2 271.7 410 279 C417.8 286.3 424.7 301 432 312',
  'M180.5 214 V328 M150 244 H224',
] as const;

/** White highlight paths (same geometry, thinner stroke). */
export const EKKLESIA_WHITE_PATHS = EKKLESIA_GOLD_PATHS;

export const EKKLESIA_GOLD_STROKE_WIDTH = 9.5;
export const EKKLESIA_WHITE_STROKE_WIDTH = 2.2;
export const EKKLESIA_WHITE_OPACITY = 0.85;
export const EKKLESIA_WHITE_TRANSFORM = 'translate(-0.6 -1.0)';

/** Canonical asset URLs for non-animated presentation. */
/** User-supplied app icons — used as-is (no crop / cutout). */
export const EKKLESIA_ASSETS = {
  symbolDark: '/brand/ekklesia-app-icon-dark.png?v=6',
  symbolLight: '/brand/ekklesia-app-icon-light.png?v=6',
  logoDark: '/brand/ekklesia-app-icon-dark.png?v=6',
  logoLight: '/brand/ekklesia-app-icon-light.png?v=6',
  /** Cinematic raster for dark surfaces (supplied landing mark). */
  cinematicRaster: '/brand/imagery/landing-ichthys-v7.png',
} as const;
