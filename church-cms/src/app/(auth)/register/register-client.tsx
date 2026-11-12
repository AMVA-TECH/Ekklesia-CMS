'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

type ChurchHit = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
};

export function RegisterClient() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ChurchHit[]>([]);
  const [church, setChurch] = useState<ChurchHit | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'en' | 'sw'>('sw');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/v1/public/churches?q=${encodeURIComponent(q.trim())}`,
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.detail || body?.title || 'Search failed');
      }
      setHits(body.data?.items ?? body.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!church) {
      setError('Select your church first.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/public/join-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          churchId: church.id,
          displayName,
          preferredLocale: locale,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phoneE164: phone.trim() } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.detail || body?.title || 'Request failed');
      }
      const payload = body.data ?? body;
      setDone(
        payload.message ||
          `Request sent to ${church.name}. Wait for approval before signing in.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-panel">
        <h1>Request submitted</h1>
        <p>{done}</p>
        <p>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <h1>Join your church</h1>
      <p>
        Search for your church, then send a join request. You can sign in only
        after an administrator approves you.
      </p>

      {error ? <p role="alert">{error}</p> : null}

      <form onSubmit={(e) => void onSearch(e)}>
        <label htmlFor="q">Find your church</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          minLength={2}
          required
          placeholder="Church name"
        />
        <button type="submit" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {hits.length > 0 ? (
        <ul>
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => setChurch(h)}
                aria-pressed={church?.id === h.id}
              >
                {h.name} <span>({h.slug})</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {church ? (
        <form onSubmit={(e) => void onSubmit(e)}>
          <p>
            Selected: <strong>{church.name}</strong>
          </p>
          <label htmlFor="displayName">Your name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
          />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label htmlFor="phone">Phone (E.164)</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2557…"
          />
          <label htmlFor="locale">Language</label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
          >
            <option value="sw">Swahili</option>
            <option value="en">English</option>
          </select>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Request to join'}
          </button>
        </form>
      ) : null}

      <p>
        Already approved? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
