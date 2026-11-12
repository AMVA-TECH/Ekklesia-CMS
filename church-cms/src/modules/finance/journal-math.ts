export type JournalLineAmounts = { debitMinor: number; creditMinor: number };

/** True when lines balance and total debit > 0. */
export function journalLinesBalance(lines: JournalLineAmounts[]): boolean {
  if (lines.length < 2) return false;
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    if (line.debitMinor < 0 || line.creditMinor < 0) return false;
    if (line.debitMinor > 0 && line.creditMinor > 0) return false;
    if (line.debitMinor === 0 && line.creditMinor === 0) return false;
    debit += line.debitMinor;
    credit += line.creditMinor;
  }
  return debit > 0 && debit === credit;
}
