import type { Metadata } from 'next';
import { UiPreviewClient } from './ui-preview-client';

export const metadata: Metadata = {
  title: 'UI preview',
  // Do not advertise in sitemaps / metadata beyond the tab title.
  robots: { index: false, follow: false },
};

/**
 * Internal visual catalogue for the Ekklesia component library.
 *
 * Mounted at `/ui-preview` via the `(internal)` route group. Not linked from
 * product navigation — used only for Phase 3 Checkpoint C demos + future
 * visual regression captures.
 */
export default function UiPreviewPage(): React.ReactElement {
  return <UiPreviewClient />;
}
