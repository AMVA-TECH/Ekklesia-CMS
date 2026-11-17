import { z } from 'zod';

import { CHURCH_LOGO_MEDIA_SETTING } from './constants';

/** Module toggles that may hide admin surfaces for a church. */
export const CHURCH_MODULE_IDS = [
  'people',
  'membership',
  'organisation',
  'events',
  'attendance',
  'finance',
  'messaging',
  'governance',
] as const;

export type ChurchModuleId = (typeof CHURCH_MODULE_IDS)[number];

const logoIdSchema = z.union([z.guid(), z.null()]);
const hexColorSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a #RRGGBB colour'),
    z.literal(''),
    z.null(),
  ])
  .optional();
const urlSchema = z
  .union([z.string().trim().url().max(500), z.literal(''), z.null()])
  .optional();
const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.literal(''), z.null()]).optional();

export const brandingSettingsSchema = z
  .object({
    /** Member-facing product name (OTP SMS, etc.). */
    productName: z.string().trim().min(1).max(80).optional(),
    logoMediaId: logoIdSchema.optional(),
    secondaryLogoMediaId: logoIdSchema.optional(),
    faviconMediaId: logoIdSchema.optional(),
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    accentColor: hexColorSchema,
  })
  .strict();

export const identitySettingsSchema = z
  .object({
    description: optionalText(4000),
    category: optionalText(120),
    vision: optionalText(4000),
    mission: optionalText(4000),
    mandate: optionalText(4000),
    motto: optionalText(500),
    secondaryMotto: optionalText(500),
    coreValues: optionalText(4000),
    history: optionalText(8000),
  })
  .strict();

export const contactSettingsSchema = z
  .object({
    primaryContactName: optionalText(200),
    email: optionalText(200),
    phone: optionalText(40),
    alternatePhone: optionalText(40),
    alternateEmail: optionalText(200),
  })
  .strict();

export const locationSettingsSchema = z
  .object({
    country: optionalText(120),
    region: optionalText(120),
    city: optionalText(120),
    addressLine1: optionalText(300),
    addressLine2: optionalText(300),
    postalCode: optionalText(40),
  })
  .strict();

export const presenceSettingsSchema = z
  .object({
    website: urlSchema,
    facebook: urlSchema,
    instagram: urlSchema,
    youtube: urlSchema,
    twitter: urlSchema,
    telegram: urlSchema,
    tiktok: urlSchema,
    otherLinks: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80),
            url: z.string().trim().url().max(500),
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();

export const terminologySettingsSchema = z
  .object({
    organisationalUnitSingular: z.string().trim().min(1).max(40).optional(),
    organisationalUnitPlural: z.string().trim().min(1).max(40).optional(),
    membershipLabel: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const modulesSettingsSchema = z
  .object({
    people: z.boolean().optional(),
    membership: z.boolean().optional(),
    organisation: z.boolean().optional(),
    events: z.boolean().optional(),
    attendance: z.boolean().optional(),
    finance: z.boolean().optional(),
    messaging: z.boolean().optional(),
    governance: z.boolean().optional(),
  })
  .strict();

export const workflowsSettingsSchema = z
  .object({
    /** When true, church-wide announcements prefer dual-control submit. */
    announcementDualControl: z.boolean().optional(),
  })
  .strict();

export const thresholdsSettingsSchema = z
  .object({
    adulthoodAgeYears: z.number().int().min(13).max(25).optional(),
  })
  .strict();

/**
 * Known church_settings document shape.
 * Unknown top-level keys are preserved (forward compatibility) but namespaces
 * are strictly validated when present.
 */
export const churchSettingsDocumentSchema = z
  .object({
    [CHURCH_LOGO_MEDIA_SETTING]: logoIdSchema.optional(),
    branding: brandingSettingsSchema.optional(),
    identity: identitySettingsSchema.optional(),
    contact: contactSettingsSchema.optional(),
    location: locationSettingsSchema.optional(),
    presence: presenceSettingsSchema.optional(),
    terminology: terminologySettingsSchema.optional(),
    modules: modulesSettingsSchema.optional(),
    workflows: workflowsSettingsSchema.optional(),
    thresholds: thresholdsSettingsSchema.optional(),
  })
  .passthrough();

export type ChurchSettingsDocument = z.infer<typeof churchSettingsDocumentSchema>;

export type ResolvedChurchSettings = {
  branding: {
    productName: string;
    logoMediaId: string | null;
    secondaryLogoMediaId: string | null;
    faviconMediaId: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
  };
  identity: {
    description: string | null;
    category: string | null;
    vision: string | null;
    mission: string | null;
    mandate: string | null;
    motto: string | null;
    secondaryMotto: string | null;
    coreValues: string | null;
    history: string | null;
  };
  contact: {
    primaryContactName: string | null;
    email: string | null;
    phone: string | null;
    alternatePhone: string | null;
    alternateEmail: string | null;
  };
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
  };
  presence: {
    website: string | null;
    facebook: string | null;
    instagram: string | null;
    youtube: string | null;
    twitter: string | null;
    telegram: string | null;
    tiktok: string | null;
    otherLinks: Array<{ label: string; url: string }>;
  };
  terminology: {
    organisationalUnitSingular: string;
    organisationalUnitPlural: string;
    membershipLabel: string;
  };
  modules: Record<ChurchModuleId, boolean>;
  workflows: {
    announcementDualControl: boolean;
  };
  thresholds: {
    adulthoodAgeYears: number;
  };
};

export const DEFAULT_CHURCH_SETTINGS: ResolvedChurchSettings = {
  branding: {
    productName: 'Ekklesia',
    logoMediaId: null,
    secondaryLogoMediaId: null,
    faviconMediaId: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
  },
  identity: {
    description: null,
    category: null,
    vision: null,
    mission: null,
    mandate: null,
    motto: null,
    secondaryMotto: null,
    coreValues: null,
    history: null,
  },
  contact: {
    primaryContactName: null,
    email: null,
    phone: null,
    alternatePhone: null,
    alternateEmail: null,
  },
  location: {
    country: null,
    region: null,
    city: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
  },
  presence: {
    website: null,
    facebook: null,
    instagram: null,
    youtube: null,
    twitter: null,
    telegram: null,
    tiktok: null,
    otherLinks: [],
  },
  terminology: {
    organisationalUnitSingular: 'Ministry',
    organisationalUnitPlural: 'Ministries',
    membershipLabel: 'Membership',
  },
  modules: {
    people: true,
    membership: true,
    organisation: true,
    events: true,
    attendance: true,
    finance: true,
    messaging: true,
    governance: true,
  },
  workflows: {
    announcementDualControl: true,
  },
  thresholds: {
    adulthoodAgeYears: 18,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Deep-merge plain objects; `null` deletes a key at the patch level. */
export function deepMergeSettings(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete out[key];
      continue;
    }
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMergeSettings(
        out[key] as Record<string, unknown>,
        value,
      );
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Validate known namespaces on a settings document.
 * Returns field errors suitable for `validationFailed`.
 */
export function validateChurchSettingsDocument(
  raw: Record<string, unknown>,
): Array<{ field: string; code: string; message: string }> {
  const parsed = churchSettingsDocumentSchema.safeParse(raw);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => ({
    field: `settings.${issue.path.join('.') || '(root)'}`,
    code: 'invalid',
    message: issue.message,
  }));
}

/** Apply safe defaults for shell/UI/OTP consumers. */
export function resolveChurchSettings(
  raw: Record<string, unknown> | null | undefined,
): ResolvedChurchSettings {
  const doc = (raw ?? {}) as ChurchSettingsDocument;
  const branding = doc.branding ?? {};
  const flatLogo =
    typeof doc[CHURCH_LOGO_MEDIA_SETTING] === 'string'
      ? doc[CHURCH_LOGO_MEDIA_SETTING]
      : null;
  const logoMediaId =
    branding.logoMediaId !== undefined
      ? branding.logoMediaId
      : (flatLogo as string | null);

  return {
    branding: {
      productName:
        branding.productName?.trim() ||
        DEFAULT_CHURCH_SETTINGS.branding.productName,
      logoMediaId: logoMediaId ?? null,
      secondaryLogoMediaId: branding.secondaryLogoMediaId ?? null,
      faviconMediaId: branding.faviconMediaId ?? null,
      primaryColor: emptyToNull(branding.primaryColor ?? null),
      secondaryColor: emptyToNull(branding.secondaryColor ?? null),
      accentColor: emptyToNull(branding.accentColor ?? null),
    },
    identity: {
      description: emptyToNull(doc.identity?.description),
      category: emptyToNull(doc.identity?.category),
      vision: emptyToNull(doc.identity?.vision),
      mission: emptyToNull(doc.identity?.mission),
      mandate: emptyToNull(doc.identity?.mandate),
      motto: emptyToNull(doc.identity?.motto),
      secondaryMotto: emptyToNull(doc.identity?.secondaryMotto),
      coreValues: emptyToNull(doc.identity?.coreValues),
      history: emptyToNull(doc.identity?.history),
    },
    contact: {
      primaryContactName: emptyToNull(doc.contact?.primaryContactName),
      email: emptyToNull(doc.contact?.email),
      phone: emptyToNull(doc.contact?.phone),
      alternatePhone: emptyToNull(doc.contact?.alternatePhone),
      alternateEmail: emptyToNull(doc.contact?.alternateEmail),
    },
    location: {
      country: emptyToNull(doc.location?.country),
      region: emptyToNull(doc.location?.region),
      city: emptyToNull(doc.location?.city),
      addressLine1: emptyToNull(doc.location?.addressLine1),
      addressLine2: emptyToNull(doc.location?.addressLine2),
      postalCode: emptyToNull(doc.location?.postalCode),
    },
    presence: {
      website: emptyToNull(doc.presence?.website),
      facebook: emptyToNull(doc.presence?.facebook),
      instagram: emptyToNull(doc.presence?.instagram),
      youtube: emptyToNull(doc.presence?.youtube),
      twitter: emptyToNull(doc.presence?.twitter),
      telegram: emptyToNull(doc.presence?.telegram),
      tiktok: emptyToNull(doc.presence?.tiktok),
      otherLinks: doc.presence?.otherLinks ?? [],
    },
    terminology: {
      organisationalUnitSingular:
        doc.terminology?.organisationalUnitSingular?.trim() ||
        DEFAULT_CHURCH_SETTINGS.terminology.organisationalUnitSingular,
      organisationalUnitPlural:
        doc.terminology?.organisationalUnitPlural?.trim() ||
        DEFAULT_CHURCH_SETTINGS.terminology.organisationalUnitPlural,
      membershipLabel:
        doc.terminology?.membershipLabel?.trim() ||
        DEFAULT_CHURCH_SETTINGS.terminology.membershipLabel,
    },
    modules: {
      ...DEFAULT_CHURCH_SETTINGS.modules,
      ...(doc.modules ?? {}),
    },
    workflows: {
      announcementDualControl:
        doc.workflows?.announcementDualControl ??
        DEFAULT_CHURCH_SETTINGS.workflows.announcementDualControl,
    },
    thresholds: {
      adulthoodAgeYears:
        doc.thresholds?.adulthoodAgeYears ??
        DEFAULT_CHURCH_SETTINGS.thresholds.adulthoodAgeYears,
    },
  };
}

/** Normalize logo into both legacy flat key and branding for storage. */
export function normalizeLogoKeys(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...settings };
  const branding = isPlainObject(next.branding)
    ? { ...(next.branding as Record<string, unknown>) }
    : {};

  if (Object.prototype.hasOwnProperty.call(next, CHURCH_LOGO_MEDIA_SETTING)) {
    branding.logoMediaId = next[CHURCH_LOGO_MEDIA_SETTING] ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(branding, 'logoMediaId')) {
    next[CHURCH_LOGO_MEDIA_SETTING] = branding.logoMediaId ?? null;
  }
  if (Object.keys(branding).length > 0) {
    next.branding = branding;
  }
  return next;
}
