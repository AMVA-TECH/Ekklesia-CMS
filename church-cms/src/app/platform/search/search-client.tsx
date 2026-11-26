'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';

type Hit = {
  id: string;
  kind: string;
  primary: string;
  secondary: string;
  status?: string;
  href: string;
};

export function SearchClient() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi<{ results: Hit[] }>(
        `/api/v1/platform/search?q=${encodeURIComponent(q.trim())}`,
      );
      setResults(res.results);
      setSearched(true);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="search"
        tab="search"
        title="Platform search"
        description="Find churches, accounts, findings, audit events and support cases. Aggregate fields only."
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4 shadow-card"
        onSubmit={(e) => void onSearch(e)}
      >
        <label className="min-w-[16rem] flex-1 text-sm">
          <span className="text-muted-foreground">Query</span>
          <input
            className="platform-input mt-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Church name, email, request id…"
            minLength={2}
            required
          />
        </label>
        <Button type="submit" disabled={busy} size="sm">
          Search
        </Button>
      </form>

      {error ? <p className="platform-error">{error}</p> : null}

      <Panel title="Results" subtitle={searched ? `${results.length} hits` : undefined} flush>
        {!searched ? (
          <EmptyState
            icon="search"
            tone="sky"
            title="Search the control plane"
            description="Type at least two characters. Results respect your platform permissions."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon="search"
            tone="neutral"
            title="No matches"
            description="Try another spelling or a broader fragment."
          />
        ) : (
          <ul className="divide-y divide-border">
            {results.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <Link
                  href={hit.href}
                  className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {hit.primary}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {hit.secondary}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {hit.status ? <Badge tone="neutral">{hit.status}</Badge> : null}
                    <Badge tone="sky">{hit.kind}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
