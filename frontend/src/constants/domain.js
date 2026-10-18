/**
 * Domain enums, mirrored from the API (backend/src/utils/constants.js).
 *
 * They are duplicated deliberately: the client must not import server code, and
 * these lists are part of the public contract the server validates against.
 * If you add a value on the server, add it here too.
 */
export const ORG_TYPES = ['DONOR', 'RECIPIENT', 'PARTNER'];

export const MEMBERSHIP_ROLES = ['OWNER', 'MANAGER', 'STAFF', 'VOLUNTEER'];

export const FOOD_CATEGORIES = [
  'PREPARED_MEAL',
  'BAKED_GOODS',
  'FRUIT_VEGETABLE',
  'DAIRY',
  'GRAINS_LEGUMES',
  'PACKAGED',
  'BEVERAGES',
  'OTHER',
];

export const DIETARY_CLASSIFICATIONS = ['VEG', 'NON_VEG', 'VEGAN', 'JAIN', 'EGGETARIAN', 'UNSPECIFIED'];

export const UNITS = ['PORTIONS', 'KILOGRAMS'];

export const PACKAGING_TYPES = [
  'SEALED_PACKAGING',
  'OPEN_TRAYS',
  'BULK_CONTAINERS',
  'DISPOSABLE_BOXES',
  'REUSABLE_CONTAINERS',
  'OTHER',
];

export const STORAGE_REQUIREMENTS = ['AMBIENT', 'CHILLED', 'FROZEN', 'HOT_HOLDING'];

export const PICKUP_ARRANGEMENTS = ['PARTNER_PICKUP', 'RECIPIENT_SELF_PICKUP', 'BOTH'];

export const MEAL_PERIODS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'EVENT'];

export const PICKUP_ASSIGNMENT_TYPES = ['VOLUNTEER', 'PARTNER', 'RECIPIENT_SELF_PICKUP'];

export const INCIDENT_TYPES = [
  'FOOD_SAFETY',
  'QUALITY_MISMATCH',
  'QUANTITY_MISMATCH',
  'MISSED_PICKUP',
  'MISCONDUCT',
  'OTHER',
];

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const DONATION_STATUSES = [
  'DRAFT',
  'AVAILABLE',
  'PARTIALLY_RESERVED',
  'RESERVED',
  'PICKUP_ASSIGNED',
  'COLLECTED',
  'DELIVERED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'SAFETY_HOLD',
  'DISPUTED',
];

export const RESERVATION_STATUSES = [
  'RESERVED',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED',
  'COLLECTED',
  'COMPLETED',
];

export const PICKUP_STATUSES = ['ASSIGNED', 'ARRIVED', 'COLLECTED', 'DELIVERED', 'COMPLETED', 'FAILED', 'CANCELLED'];

export const DEMAND_STATUSES = ['OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'EXPIRED', 'CANCELLED'];

export const VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export const ALLERGENS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Peanuts',
  'Tree nuts',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Mustard',
];

/** Turn an enum value into readable text: PARTIALLY_RESERVED → "Partially reserved". */
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

/** Enum array → options for a Select. */
export const toOptions = (values) => values.map((value) => ({ value, label: humanize(value) }));
