/**
 * Opt-in CrossLife Mission Network pilot configuration template (DEC-027 / ADR-0004).
 *
 * This is tenant data only — never referenced from shared product branching.
 * Apply explicitly via platform API; do not run on every church provision.
 */

export const CROSSLIFE_PILOT_TEMPLATE_ID = 'crosslife-pilot' as const;

export const CROSSLIFE_PILOT_PROFILE = {
  name: 'CrossLife Mission Network',
  shortName: 'CMN',
  displayName: 'CrossLife',
  branding: {
    productName: 'CrossLife',
  },
  identity: {
    category: 'Non-denominational Christian ministry',
    description:
      'CrossLife Mission Network (CMN) is a non-denominational and inter-denominational Christian ministry based in Dar es Salaam, Tanzania. We exist as a community of Life, Love, Sonship, and Prayer, welcoming people from diverse backgrounds, ages, and walks of life.',
    motto: 'Raising Sons, Revealing Christ',
    secondaryMotto: 'Sharing Love, Sharing Life',
    vision:
      'To be a global network of the manifested Sons of God walking in the Life of God, expressing the New Creation realities through experiential knowledge, and advancing the Eternal Ordinations of Christ across the nations with one message, one mandate, and one mission.',
    mission:
      'To reach the global network by revealing Christ as the Way, the Truth, and the Life; equipping Sons of God to serve effectively in the Kingdom of God through discipleship training, revelational teaching of the Gospel(s) of the Cross, Glorification, Kingdom of God, and Immortality, spiritual relevancy formation, and life-filled koinonia—manifesting His Spirit, Love, Life, and Power in the Church and the marketplace.',
    mandate:
      'To manifest Sons of God who know who they are in Christ, and what Christ can do through them.',
  },
  contact: {
    email: 'karibu@crosslife.org',
    phone: '+255653126583',
    alternatePhone: '+255710073860',
  },
  location: {
    country: 'Tanzania',
    city: 'Dar es Salaam',
  },
  presence: {
    website: 'https://www.crosslife.live',
  },
} as const;

/** Proposed functional areas — not confirmed official departments until church signs off. */
export const CROSSLIFE_PILOT_DEPARTMENTS: ReadonlyArray<{
  name: string;
  description: string;
}> = [
  {
    name: 'Pastoral Operations and Ministerial Coordination',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: "Women's Apostolic Affairs",
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Treasury and Stewardship',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Church Governance and Operations',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: "Pastors' Office Secretariat",
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Prayer Coordination and CFC',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Finance and Accounts',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Worship and Music',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'ICT and Public Image',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Worship Teaching and Formation',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
  {
    name: 'Service and Hospitality',
    description: 'Proposed functional area from published leadership responsibilities.',
  },
];

export const CROSSLIFE_PILOT_MINISTRIES: ReadonlyArray<{
  name: string;
  description: string;
  programmes?: readonly string[];
}> = [
  {
    name: 'School of Christ Academy',
    description: 'Discipleship and formation programmes.',
    programmes: [
      'CrossLife Foundation Class',
      'School of Leadership',
      'School of Ministry',
      'Sonship and Submission',
    ],
  },
  {
    name: 'The FORGE Ministry',
    description: 'Published CrossLife ministry.',
  },
  {
    name: 'Beacon of HOPE Ministry',
    description: 'Published CrossLife ministry.',
  },
  {
    name: 'Life Worshipper Ministry',
    description: 'Also known as Life Worshippers.',
  },
];

/** Leadership titles only — no person names (DEC / pilot constraint). */
export const CROSSLIFE_PILOT_POSITIONS: ReadonlyArray<{
  title: string;
  description: string;
  reportsToRoot?: boolean;
}> = [
  {
    title: 'Senior Pastor / Apostolic Head',
    description: 'Highest leadership position for the church.',
    reportsToRoot: false,
  },
  {
    title: 'Associate Pastor',
    description: 'Reports to the Senior Pastor / Apostolic Head.',
    reportsToRoot: true,
  },
  {
    title: 'Resident Pastor',
    description: 'Reports to the Senior Pastor / Apostolic Head.',
    reportsToRoot: true,
  },
  {
    title: 'Chief Financial Steward',
    description: 'Treasury and stewardship leadership. Distinct from Finance & Accounts Lead.',
    reportsToRoot: true,
  },
  {
    title: 'Church Administrator',
    description: 'Church governance and operations leadership.',
    reportsToRoot: true,
  },
  {
    title: "Pastors' Office General Secretary (POGS)",
    description: "Pastors' office secretariat leadership.",
    reportsToRoot: true,
  },
  {
    title: 'Provost',
    description: 'Prayer coordination and CFC leadership.',
    reportsToRoot: true,
  },
  {
    title: 'Church Finance & Accounts Lead',
    description: 'Finance and accounts leadership. Distinct from Chief Financial Steward.',
    reportsToRoot: true,
  },
  {
    title: 'Priest of Life Worshippers',
    description: 'Worship and music leadership.',
    reportsToRoot: true,
  },
  {
    title: 'Head of ICT',
    description: 'ICT and public image leadership.',
    reportsToRoot: true,
  },
  {
    title: 'Psalmist / Teacher',
    description: 'Worship teaching and formation leadership.',
    reportsToRoot: true,
  },
  {
    title: 'Chief Deaconess',
    description: 'Service and hospitality leadership.',
    reportsToRoot: true,
  },
];
