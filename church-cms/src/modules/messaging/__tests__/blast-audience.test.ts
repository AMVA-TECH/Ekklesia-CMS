import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

type Candidate = {
  personId: string;
  toAddress: string;
  smsOptIn: boolean | null;
  whatsappOptIn: boolean | null;
};

function selectRecipients(
  channel: 'sms' | 'whatsapp',
  candidates: Candidate[],
) {
  let skippedNoContact = 0;
  let skippedOptOut = 0;
  const recipients: { personId: string; toAddress: string }[] = [];
  for (const c of candidates) {
    const optedIn =
      channel === 'sms' ? c.smsOptIn !== false : c.whatsappOptIn !== false;
    if (!optedIn) {
      skippedOptOut += 1;
      continue;
    }
    if (!c.toAddress) {
      skippedNoContact += 1;
      continue;
    }
    recipients.push({ personId: c.personId, toAddress: c.toAddress });
  }
  return { recipients, skippedNoContact, skippedOptOut };
}

describe('leadership blast recipient filter', () => {
  const people: Candidate[] = [
    {
      personId: 'a',
      toAddress: '+255700000001',
      smsOptIn: true,
      whatsappOptIn: true,
    },
    {
      personId: 'b',
      toAddress: '+255700000002',
      smsOptIn: false,
      whatsappOptIn: true,
    },
    {
      personId: 'c',
      toAddress: '',
      smsOptIn: true,
      whatsappOptIn: true,
    },
    {
      personId: 'd',
      toAddress: '+255700000004',
      smsOptIn: null,
      whatsappOptIn: null,
    },
  ];

  it('includes sms opt-in and default-null, skips opt-out and no phone', () => {
    const result = selectRecipients('sms', people);
    assert.equal(result.recipients.length, 2);
    assert.deepEqual(
      result.recipients.map((r) => r.personId).sort(),
      ['a', 'd'],
    );
    assert.equal(result.skippedOptOut, 1);
    assert.equal(result.skippedNoContact, 1);
  });

  it('filters whatsapp opt-out separately', () => {
    const result = selectRecipients('whatsapp', [
      ...people,
      {
        personId: 'e',
        toAddress: '+255700000005',
        smsOptIn: true,
        whatsappOptIn: false,
      },
    ]);
    assert.ok(result.recipients.every((r) => r.personId !== 'e'));
    assert.ok(result.skippedOptOut >= 1);
  });
});
