'use client';

import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

type Church = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
  createdAt: string;
};

export function ChurchesClient() {
  const [items, setItems] = useState<Church[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    platformApi<{ items: Church[] }>('/api/v1/platform/churches')
      .then((res) => {
        setItems(res.items);
        if (res.items[0]) setSelected(res.items[0].id);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      );
  }, []);

  async function onEnter(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await platformApi<{
        churchId: string;
        churchName: string;
        reason: string;
        devHint?: Record<string, string>;
      }>(`/api/v1/platform/tenants/${selected}/enter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setMessage(
        `Entered ${res.churchName}. Reason recorded. Dev headers: ${JSON.stringify(res.devHint ?? {})}`,
      );
      setReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <>
      <h1 className="platform-h1">Churches</h1>
      <p className="platform-lead">
        Tenant inventory. Enter a church with a written reason — every entry is
        audited.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}
      {message ? <p className="platform-muted">{message}</p> : null}

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Inventory</h2>
          <span className="platform-muted">{items.length} churches</span>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Timezone</th>
              <th>Locale</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="platform-muted">{c.slug}</td>
                <td>{c.timezone}</td>
                <td>{c.defaultLocale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="platform-panel" onSubmit={(e) => void onEnter(e)}>
        <div className="platform-panel-head">
          <h2>Enter tenant (support)</h2>
          <button type="submit" className="platform-btn platform-btn-primary">
            Enter
          </button>
        </div>
        <div style={{ padding: '1rem' }} className="platform-form-row">
          <div>
            <label className="platform-muted" htmlFor="church">
              Church
            </label>
            <select
              id="church"
              className="platform-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="platform-muted" htmlFor="reason">
              Reason (min 8 characters)
            </label>
            <textarea
              id="reason"
              className="platform-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={8}
              placeholder="Investigating failed message job #…"
            />
          </div>
        </div>
      </form>
    </>
  );
}
