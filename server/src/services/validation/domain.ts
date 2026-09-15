/**
 * The four compiled-in domain code lists for the RIV-2026.09 rule set.
 *
 * FR-4.1 IS EXPLICIT AND ABSOLUTE: these MUST be compiled-in application
 * constants versioned with `rule_set_version`. They MUST NOT be database tables,
 * seeded rows, editable configuration, or a runtime-administered reference data
 * set. The schema is deliberately free of reference tables and the deployment
 * deliberately free of seed data (PRD §10 #7). Do not "improve" any of these
 * into a lookup table, an env var, or an admin screen — adding a member is a
 * one-line data change here plus a RULE_SET_VERSION bump in ./types.ts, and
 * nothing else.
 *
 * Every list is a ReadonlySet<string> built from an Object.freeze'd array so a
 * caller can neither mutate the set contents nor the backing array.
 */

/**
 * Closed set of 4-digit CBP port-of-entry codes. This is a documented,
 * demonstration-appropriate subset of real CBP port codes — part of the F4
 * [ASSUMPTION] open to CBP refinement. It contains `2704` (Chicago — the FRD's
 * worked PASS example) and deliberately excludes `9999` (the FRD's
 * well-formed-but-unknown example, acceptance criterion 3). Adding a port is a
 * one-line data change here plus a RULE_SET_VERSION bump.
 */
const PORT_OF_ENTRY_CODES = Object.freeze([
  '0101', // Portland, ME
  '0401', // Boston, MA
  '1001', // New York/Newark
  '1101', // Philadelphia, PA
  '1303', // Baltimore, MD
  '1401', // Norfolk, VA
  '1601', // Charleston, SC
  '1701', // Savannah, GA
  '1801', // Miami, FL
  '1803', // Port Everglades, FL
  '1901', // Tampa, FL
  '2002', // New Orleans, LA
  '2304', // Port Arthur, TX
  '2402', // El Paso, TX
  '2506', // Houston/Galveston, TX
  '2704', // Chicago, IL  — FRD worked example (PASS)
  '2720', // Los Angeles, CA
  '2809', // San Francisco, CA
  '3001', // Great Falls, MT
  '3401', // Detroit, MI
  '3801', // Buffalo, NY
  '3901', // Duluth, MN
  '4103', // Minneapolis, MN
  '4501', // Kansas City, MO
  '4701', // St. Louis, MO
  '5301', // Dallas/Fort Worth, TX
] as const);

export const PORT_OF_ENTRY: ReadonlySet<string> = new Set<string>(PORT_OF_ENTRY_CODES);

/**
 * ISO 3166-1 alpha-2 country codes (the full assigned set, 249 codes). Contains
 * `CN` and `US`; does not contain `XX` or `ZZ` (both are user-assignable /
 * unassigned and are the FRD's unknown-country examples).
 */
const COUNTRY_CODES = Object.freeze([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR',
  'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE',
  'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ',
  'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD',
  'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR',
  'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI',
  'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS',
  'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK',
  'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME',
  'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ',
  'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU',
  'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS',
  'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI',
  'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV',
  'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK',
  'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA',
  'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const);

export const COUNTRY: ReadonlySet<string> = new Set<string>(COUNTRY_CODES);

/**
 * Recognised units of measure — enumerated EXACTLY and in the order given by
 * FRD F4 §Domain code lists. Do not add, reorder, or rename a member without a
 * RULE_SET_VERSION bump.
 */
const UNIT_OF_MEASURE_CODES = Object.freeze([
  'KG', 'LB', 'MT', 'L', 'M3', 'PCS', 'CTN', 'PLT', 'BOX', 'SET',
] as const);

export const UNIT_OF_MEASURE: ReadonlySet<string> = new Set<string>(UNIT_OF_MEASURE_CODES);

/**
 * Generic / non-specific goods descriptions that FAIL RIV-092 — enumerated
 * EXACTLY and in the order given by FRD F4 §Domain code lists. Compared against
 * the `collapseLower`-normalised goods description (lowercase, trimmed, internal
 * whitespace collapsed, trailing punctuation stripped).
 */
const GENERIC_DESCRIPTION_TERMS = Object.freeze([
  'goods',
  'cargo',
  'freight',
  'merchandise',
  'items',
  'products',
  'general merchandise',
  'various',
  'various goods',
  'assorted',
  'assorted goods',
  'misc',
  'miscellaneous',
  'sample',
  'samples',
  'parts',
  'spare parts',
  'n/a',
  'na',
  'tbd',
  'unknown',
  'see attached',
  'as per invoice',
] as const);

export const GENERIC_DESCRIPTION: ReadonlySet<string> = new Set<string>(GENERIC_DESCRIPTION_TERMS);

/**
 * The four recognised modes of transport (RIV-041). Also read by RIV-051,
 * RIV-070 and RIV-070's primary_field resolver to branch on the normalised mode.
 */
export const MODE_OF_TRANSPORT: ReadonlySet<string> = new Set<string>(
  Object.freeze(['OCEAN', 'AIR', 'TRUCK', 'RAIL'] as const),
);
