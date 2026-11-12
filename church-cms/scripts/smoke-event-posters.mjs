#!/usr/bin/env node
/**
 * Event posters + Sunday service type DB smoke.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/church_cms';

const require = createRequire(import.meta.url);
let Pool;
try {
  ({ Pool } = require('pg'));
} catch {
  ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
}

const churchId = '11111111-1111-1111-1111-111111111111';
const actorId = 'cccccccc-0001-0001-0001-000000000001';
const id = () => crypto.randomUUID();
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  const mediaId = id();
  const typeId = id();
  const eventId = id();
  const storageKey = `${churchId}/event_poster/${mediaId}.png`;
  const abs = path.join(process.cwd(), '.data', 'media', storageKey);
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    await client.query(
      `INSERT INTO event_types (id, church_id, code, name, created_by, updated_by)
       VALUES ($1, $2, $3, 'Sunday Service', $4, $4)
       ON CONFLICT DO NOTHING`,
      [typeId, churchId, `sunday_service_${typeId.slice(0, 8)}`, actorId],
    );

    mkdirSync(path.dirname(abs), { recursive: true });
    // Minimal 1x1 PNG
    writeFileSync(
      abs,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    );

    await client.query(
      `INSERT INTO media_assets (id, church_id, storage_key, content_type, byte_size, kind, created_by, updated_by)
       VALUES ($1, $2, $3, 'image/png', 68, 'event_poster', $4, $4)`,
      [mediaId, churchId, storageKey, actorId],
    );
    await client.query(
      `INSERT INTO events (
         id, church_id, event_type_id, title, description, service_date, status, poster_media_id, created_by, updated_by
       ) VALUES ($1, $2, $3, 'Smoke Sunday', 'Poster test', CURRENT_DATE, 'scheduled', $4, $5, $5)`,
      [eventId, churchId, typeId, mediaId, actorId],
    );

    const check = await client.query(
      `SELECT e.title, e.poster_media_id IS NOT NULL AS has_poster, t.code AS type_code, m.kind
       FROM events e
       JOIN event_types t ON t.id = e.event_type_id
       JOIN media_assets m ON m.id = e.poster_media_id
       WHERE e.id = $1`,
      [eventId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_EVENT_POSTERS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_EVENT_POSTERS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    try {
      rmSync(abs, { force: true });
    } catch {
      /* ignore */
    }
  }
}

main();
