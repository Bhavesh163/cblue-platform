// Fixer tier pricing multipliers
export const TIER_MULTIPLIERS = {
  ECONOMY: 1.0,
  STANDARD: 1.2,
  CORPORATE: 1.4,
  EXPERT: 1.6,
} as const;

// Matching weights
export const MATCHING_WEIGHTS = {
  DISTANCE: 0.4,
  RATING: 0.2,
  TIER: 0.2,
  AVAILABILITY: 0.2,
} as const;

// OTP
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_COOLDOWN_SECONDS = 60;

// Deposit amount in THB
export const DEPOSIT_AMOUNT = 300;

// Max matching results
export const MAX_MATCHING_RESULTS = 5;

// Service categories by order type
export const HOUSEHOLD_SERVICES = [
  'PLUMBING',
  'ELECTRICAL',
  'AC',
  'INTERIOR',
  'LANDSCAPING',
  'GARDENING',
  'CLADDING_ROOFING',
  'ACCOUNTANT',
  'LAWYER',
] as const;

export const PROJECT_SERVICES = [
  'WEBSITE_DEVELOPMENT',
  'MOBILE_APP_DEVELOPMENT',
  'AI_INTEGRATION',
  'CONSULTING',
  'AI_CHATBOT',
  'SOFTWARE_DEV',
  'ML_AI',
  'SOLAR_PANELS',
  'EV_CHARGING',
  'ECO_FRIENDLY_BUILDING_DESIGN',
  'AC',
  'PLUMBING',
  'SMART_BUILDING_AUTOMATION',
  'FIRE_LIFE_SAFETY',
  'ENVIRONMENTAL_SERVICES',
  'SECURITY_CCTV',
  'DOOR_ACCESS_CONTROL',
  'ECO_FRIENDLY_CONSTRUCTION',
  'SMART_HOME',
  'SMART_FARMING',
] as const;

export const ALL_SERVICE_CATEGORIES = [
  ...new Set([...HOUSEHOLD_SERVICES, ...PROJECT_SERVICES]),
] as const;
