import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CROSSLIFE_PILOT_DEPARTMENTS,
  CROSSLIFE_PILOT_MINISTRIES,
  CROSSLIFE_PILOT_POSITIONS,
  CROSSLIFE_PILOT_PROFILE,
  CROSSLIFE_PILOT_TEMPLATE_ID,
} from '../templates/crosslife-pilot.ts';

describe('crosslife-pilot template data', () => {
  it('uses configuration values not person names', () => {
    assert.equal(CROSSLIFE_PILOT_TEMPLATE_ID, 'crosslife-pilot');
    assert.equal(CROSSLIFE_PILOT_PROFILE.name, 'CrossLife Mission Network');
    assert.equal(CROSSLIFE_PILOT_PROFILE.shortName, 'CMN');
    assert.equal(CROSSLIFE_PILOT_PROFILE.displayName, 'CrossLife');
    assert.match(CROSSLIFE_PILOT_PROFILE.identity.motto, /Raising Sons/);
    assert.match(CROSSLIFE_PILOT_PROFILE.presence.website, /crosslife\.live/);
  });

  it('keeps Chief Financial Steward distinct from Finance & Accounts Lead', () => {
    const titles = CROSSLIFE_PILOT_POSITIONS.map((p) => p.title);
    assert.ok(titles.includes('Chief Financial Steward'));
    assert.ok(titles.includes('Church Finance & Accounts Lead'));
    assert.notEqual(
      titles.indexOf('Chief Financial Steward'),
      titles.indexOf('Church Finance & Accounts Lead'),
    );
  });

  it('has a single root position with others reporting to it', () => {
    const roots = CROSSLIFE_PILOT_POSITIONS.filter((p) => !p.reportsToRoot);
    assert.equal(roots.length, 1);
    assert.equal(roots[0]?.title, 'Senior Pastor / Apostolic Head');
    assert.ok(
      CROSSLIFE_PILOT_POSITIONS.filter((p) => p.reportsToRoot).length >= 10,
    );
  });

  it('marks proposed departments and seeds four ministries', () => {
    assert.equal(CROSSLIFE_PILOT_DEPARTMENTS.length, 11);
    assert.equal(CROSSLIFE_PILOT_MINISTRIES.length, 4);
    const soc = CROSSLIFE_PILOT_MINISTRIES.find(
      (m) => m.name === 'School of Christ Academy',
    );
    assert.ok(soc?.programmes?.includes('CrossLife Foundation Class'));
    assert.ok(soc?.programmes?.includes('Sonship and Submission'));
  });

  it('does not embed personal leader names in template records', () => {
    const blob = JSON.stringify({
      positions: CROSSLIFE_PILOT_POSITIONS,
      departments: CROSSLIFE_PILOT_DEPARTMENTS,
      ministries: CROSSLIFE_PILOT_MINISTRIES,
    });
    assert.equal(/Kyamba|Lenhard/i.test(blob), false);
  });
});
