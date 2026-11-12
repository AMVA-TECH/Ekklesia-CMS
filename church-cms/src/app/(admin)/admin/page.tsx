import { redirect } from 'next/navigation';

/**
 * The `(admin)` route group doesn't own `/`. Visiting `/` while signed in as
 * an administrator should land on the dashboard; the root `/` route and any
 * marketing or sign-in redirect is owned by Lead / Agent 5.
 *
 * This file exists so that if a page.tsx is ever requested inside the admin
 * group's own namespace (e.g. the shell mounts without a child path) the
 * router sends the user to a useful place instead of rendering nothing.
 */
export default function AdminIndex(): never {
  redirect('/admin/dashboard');
}
