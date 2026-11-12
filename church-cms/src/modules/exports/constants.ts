export const EXPORT_KINDS = ['people', 'attendance', 'finance'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_FORMATS = ['csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_ROW_CAP = 5000;
