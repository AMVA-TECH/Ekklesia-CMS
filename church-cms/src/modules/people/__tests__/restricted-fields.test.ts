import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toPersonResponse } from '../mappers.ts';

const person = {
  id: '11111111-1111-1111-1111-111111111111',
  displayName: 'Ada',
  fullName: 'Ada Lovelace',
  dateOfBirth: '1815-12-10',
  preferredLocale: 'en',
  directoryOptIn: true,
  photoMediaId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('people restricted DTO fields', () => {
  it('omits dateOfBirth without includeRestricted', () => {
    const dto = toPersonResponse(person, [], { includeRestricted: false });
    assert.equal(dto.dateOfBirth, null);
    assert.equal(dto.displayName, 'Ada');
  });

  it('includes dateOfBirth when includeRestricted is true', () => {
    const dto = toPersonResponse(person, [], { includeRestricted: true });
    assert.equal(dto.dateOfBirth, '1815-12-10');
  });

  it('service gates DTO via people:read_restricted / self', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const service = fs.readFileSync(path.join(here, '../service.ts'), 'utf8');
    assert.match(service, /personDtoOptions/);
    assert.match(service, /canReadRestrictedPeopleFields/);
    assert.match(service, /includeRestricted/);
    assert.doesNotMatch(
      service,
      /return toPersonResponse\(row, contacts\);/,
    );
  });
});
