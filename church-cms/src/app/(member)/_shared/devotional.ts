/**
 * Daily devotional pool.
 *
 * Pure client-side selection — picked deterministically from the ISO date so
 * every member sees the same passage on the same day, and the choice does not
 * change on re-render. Replace with a backend-driven feed when the devotional
 * module ships; the UI shape here is intentionally small.
 */

export interface Devotional {
  /** Short scripture or wisdom passage. */
  quote: string;
  /** Optional attribution (book + chapter + verse, or author). */
  attribution?: string;
  /** Single-sentence devotional thought. */
  thought: string;
}

const POOL: readonly Devotional[] = [
  {
    quote:
      'Blessed are those who dwell in your house; they are ever praising you.',
    attribution: 'Psalm 84:4',
    thought: 'Church is more than a place — it is a shared home. Welcome back.',
  },
  {
    quote:
      'Let us consider how we may spur one another on toward love and good deeds.',
    attribution: 'Hebrews 10:24',
    thought: 'Who in your church family could use a kind word this week?',
  },
  {
    quote: 'The Lord is my shepherd; I lack nothing.',
    attribution: 'Psalm 23:1',
    thought: 'Pause for a breath. God sees the week you are carrying.',
  },
  {
    quote:
      'Be strong and courageous. Do not be afraid; for the Lord your God is with you wherever you go.',
    attribution: 'Joshua 1:9',
    thought: 'Take one small faithful step today.',
  },
  {
    quote: 'Love is patient, love is kind.',
    attribution: '1 Corinthians 13:4',
    thought: 'Patience in small things builds a church family over time.',
  },
  {
    quote:
      'He has shown you, O mortal, what is good: to act justly, love mercy, and walk humbly with your God.',
    attribution: 'Micah 6:8',
    thought: 'Justice, mercy, humility — a simple map for today.',
  },
  {
    quote:
      'Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.',
    attribution: 'Philippians 4:6',
    thought: 'Lay today down. The Lord is near.',
  },
];

/**
 * Pick today's devotional deterministically from the ISO date.
 * Same date → same devotional for every member.
 */
export function pickDevotionalFor(dateIso: string): Devotional {
  let hash = 0;
  for (let i = 0; i < dateIso.length; i += 1) {
    hash = (hash * 31 + dateIso.charCodeAt(i)) >>> 0;
  }
  const safe = POOL[hash % POOL.length];
  // The pool is static and non-empty, so `safe` is always defined.
  return safe ?? POOL[0]!;
}
