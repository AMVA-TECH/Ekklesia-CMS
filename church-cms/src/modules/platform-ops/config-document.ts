import { z } from 'zod';

/** Platform Settings (scope=global) — identity/ops policy mirrors. No billing. */
export const platformGlobalConfigSchema = z
  .object({
    identity: z
      .object({
        productName: z.string().trim().min(1).max(80).optional(),
        supportEmail: z
          .union([z.string().trim().email().max(200), z.literal('')])
          .optional(),
      })
      .strict()
      .optional(),
    auth: z
      .object({
        sessionMaxAgeHours: z.number().int().min(1).max(24 * 30).optional(),
        platformMfaRequired: z.boolean().optional(),
      })
      .strict()
      .optional(),
    security: z
      .object({
        supportSessionDefaultAccess: z.enum(['read', 'interactive']).optional(),
        supportSessionMaxHours: z.number().int().min(1).max(24).optional(),
      })
      .strict()
      .optional(),
    featureFlags: z
      .object({
        publicChurchRegistration: z.boolean().optional(),
        breakGlassEnabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    observability: z
      .object({
        metricsSnapshotEnabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Suggested tenant defaults (scope=defaults) — never silent overwrite of church_settings. */
export const platformDefaultsConfigSchema = z
  .object({
    modules: z
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
      .strict()
      .optional(),
    workflows: z
      .object({
        announcementDualControl: z.boolean().optional(),
      })
      .strict()
      .optional(),
    thresholds: z
      .object({
        adulthoodAgeYears: z.number().int().min(13).max(25).optional(),
      })
      .strict()
      .optional(),
    terminology: z
      .object({
        organisationalUnitSingular: z.string().trim().min(1).max(40).optional(),
        organisationalUnitPlural: z.string().trim().min(1).max(40).optional(),
        membershipLabel: z.string().trim().min(1).max(40).optional(),
      })
      .strict()
      .optional(),
    locale: z
      .object({
        defaultTimezone: z.string().trim().min(3).max(80).optional(),
        defaultLocale: z.enum(['en', 'sw']).optional(),
      })
      .strict()
      .optional(),
    templates: z
      .object({
        suggestedIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Sparse tenant-layer suggestions (scope=tenant). */
export const platformTenantConfigSchema = platformDefaultsConfigSchema;

export type PlatformGlobalConfig = z.infer<typeof platformGlobalConfigSchema>;
export type PlatformDefaultsConfig = z.infer<typeof platformDefaultsConfigSchema>;

export const DEFAULT_PLATFORM_GLOBAL_CONFIG = {
  identity: {
    productName: 'Ekklesia',
    supportEmail: '',
  },
  auth: {
    sessionMaxAgeHours: 168,
    platformMfaRequired: false,
  },
  security: {
    supportSessionDefaultAccess: 'read' as const,
    supportSessionMaxHours: 8,
  },
  featureFlags: {
    publicChurchRegistration: true,
    breakGlassEnabled: true,
  },
  observability: {
    metricsSnapshotEnabled: true,
  },
};

export const DEFAULT_PLATFORM_DEFAULTS_CONFIG = {
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
  terminology: {
    organisationalUnitSingular: 'Department',
    organisationalUnitPlural: 'Departments',
    membershipLabel: 'Member',
  },
  locale: {
    defaultTimezone: 'Africa/Dar_es_Salaam',
    defaultLocale: 'sw' as const,
  },
  templates: {
    suggestedIds: ['crosslife-pilot'] as string[],
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merge; `null` deletes a key at the patch level. */
export function deepMergeConfig(
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
      out[key] = deepMergeConfig(
        out[key] as Record<string, unknown>,
        value,
      );
      continue;
    }
    out[key] = value;
  }
  return out;
}

export type ResolvedPlatformGlobalConfig = {
  identity: { productName: string; supportEmail: string };
  auth: { sessionMaxAgeHours: number; platformMfaRequired: boolean };
  security: {
    supportSessionDefaultAccess: 'read' | 'interactive';
    supportSessionMaxHours: number;
  };
  featureFlags: {
    publicChurchRegistration: boolean;
    breakGlassEnabled: boolean;
  };
  observability: { metricsSnapshotEnabled: boolean };
};

export type ResolvedPlatformDefaultsConfig = {
  modules: {
    people: boolean;
    membership: boolean;
    organisation: boolean;
    events: boolean;
    attendance: boolean;
    finance: boolean;
    messaging: boolean;
    governance: boolean;
  };
  workflows: { announcementDualControl: boolean };
  thresholds: { adulthoodAgeYears: number };
  terminology: {
    organisationalUnitSingular: string;
    organisationalUnitPlural: string;
    membershipLabel: string;
  };
  locale: { defaultTimezone: string; defaultLocale: 'en' | 'sw' };
  templates: { suggestedIds: string[] };
};

export function resolvePlatformGlobalConfig(
  raw: Record<string, unknown> | null | undefined,
): ResolvedPlatformGlobalConfig {
  const doc = (raw ?? {}) as PlatformGlobalConfig;
  return {
    identity: {
      productName:
        doc.identity?.productName?.trim() ||
        DEFAULT_PLATFORM_GLOBAL_CONFIG.identity.productName,
      supportEmail:
        doc.identity?.supportEmail?.trim() ||
        DEFAULT_PLATFORM_GLOBAL_CONFIG.identity.supportEmail,
    },
    auth: {
      sessionMaxAgeHours:
        doc.auth?.sessionMaxAgeHours ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.auth.sessionMaxAgeHours,
      platformMfaRequired:
        doc.auth?.platformMfaRequired ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.auth.platformMfaRequired,
    },
    security: {
      supportSessionDefaultAccess:
        doc.security?.supportSessionDefaultAccess ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.security.supportSessionDefaultAccess,
      supportSessionMaxHours:
        doc.security?.supportSessionMaxHours ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.security.supportSessionMaxHours,
    },
    featureFlags: {
      publicChurchRegistration:
        doc.featureFlags?.publicChurchRegistration ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.featureFlags.publicChurchRegistration,
      breakGlassEnabled:
        doc.featureFlags?.breakGlassEnabled ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.featureFlags.breakGlassEnabled,
    },
    observability: {
      metricsSnapshotEnabled:
        doc.observability?.metricsSnapshotEnabled ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG.observability.metricsSnapshotEnabled,
    },
  };
}

export function resolvePlatformDefaultsConfig(
  raw: Record<string, unknown> | null | undefined,
): ResolvedPlatformDefaultsConfig {
  const doc = (raw ?? {}) as PlatformDefaultsConfig;
  return {
    modules: {
      ...DEFAULT_PLATFORM_DEFAULTS_CONFIG.modules,
      ...(doc.modules ?? {}),
    },
    workflows: {
      announcementDualControl:
        doc.workflows?.announcementDualControl ??
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.workflows.announcementDualControl,
    },
    thresholds: {
      adulthoodAgeYears:
        doc.thresholds?.adulthoodAgeYears ??
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.thresholds.adulthoodAgeYears,
    },
    terminology: {
      organisationalUnitSingular:
        doc.terminology?.organisationalUnitSingular?.trim() ||
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.terminology.organisationalUnitSingular,
      organisationalUnitPlural:
        doc.terminology?.organisationalUnitPlural?.trim() ||
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.terminology.organisationalUnitPlural,
      membershipLabel:
        doc.terminology?.membershipLabel?.trim() ||
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.terminology.membershipLabel,
    },
    locale: {
      defaultTimezone:
        doc.locale?.defaultTimezone?.trim() ||
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.locale.defaultTimezone,
      defaultLocale:
        doc.locale?.defaultLocale ??
        DEFAULT_PLATFORM_DEFAULTS_CONFIG.locale.defaultLocale,
    },
    templates: {
      suggestedIds:
        doc.templates?.suggestedIds ??
        [...DEFAULT_PLATFORM_DEFAULTS_CONFIG.templates.suggestedIds],
    },
  };
}

export function validateGlobalConfigDocument(
  raw: Record<string, unknown>,
): Array<{ field: string; code: string; message: string }> {
  const parsed = platformGlobalConfigSchema.safeParse(raw);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    field: `document.${issue.path.join('.') || '(root)'}`,
    code: 'invalid',
    message: issue.message,
  }));
}

export function validateDefaultsConfigDocument(
  raw: Record<string, unknown>,
): Array<{ field: string; code: string; message: string }> {
  const parsed = platformDefaultsConfigSchema.safeParse(raw);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    field: `document.${issue.path.join('.') || '(root)'}`,
    code: 'invalid',
    message: issue.message,
  }));
}
