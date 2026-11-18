/**
 * Swahili UI text, keyed by the English source text used in `t('…')`.
 *
 * Draft by the engineering team; to be reviewed by a native speaker at the
 * pilot church before go-live. Edit the area files under ./sw/. The coverage
 * test (src/app/_ekklesia/i18n/__tests__) fails if any t()/tk() text in the
 * app has no entry here or if placeholders don't match.
 */
import { swAdmin1 } from './sw/admin-1';
import { swAdmin2 } from './sw/admin-2';
import { swAdmin3 } from './sw/admin-3';
import { swAdmin4 } from './sw/admin-4';
import { swAuth } from './sw/auth';
import { swLabels } from './sw/labels';
import { swMember } from './sw/member';
import { swReports } from './sw/reports';

export const sw: Readonly<Record<string, string>> = {
  ...swReports,
  ...swLabels,
  ...swAdmin4,
  ...swAdmin3,
  ...swAdmin2,
  ...swAdmin1,
  ...swAuth,
  ...swMember,
};
