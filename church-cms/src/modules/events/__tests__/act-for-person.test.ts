import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mayActForPerson } from '../policies.ts';

const ME = 'p-me';
const OTHER = 'p-other';

describe('mayActForPerson (absence notices, correction requests)', () => {
  it('lets members act for themselves', () => {
    assert.equal(
      mayActForPerson({ isAttendanceStaff: false, actorPersonId: ME, targetPersonId: ME, targetInActorHousehold: false }),
      true,
    );
  });

  it('lets members act for someone in their household', () => {
    assert.equal(
      mayActForPerson({ isAttendanceStaff: false, actorPersonId: ME, targetPersonId: OTHER, targetInActorHousehold: true }),
      true,
    );
  });

  it('blocks members acting for anyone else in the church', () => {
    assert.equal(
      mayActForPerson({ isAttendanceStaff: false, actorPersonId: ME, targetPersonId: OTHER, targetInActorHousehold: false }),
      false,
    );
  });

  it('blocks accounts with no linked person', () => {
    assert.equal(
      mayActForPerson({ isAttendanceStaff: false, actorPersonId: null, targetPersonId: OTHER, targetInActorHousehold: false }),
      false,
    );
  });

  it('lets attendance staff act for anyone', () => {
    assert.equal(
      mayActForPerson({ isAttendanceStaff: true, actorPersonId: null, targetPersonId: OTHER, targetInActorHousehold: false }),
      true,
    );
  });
});
