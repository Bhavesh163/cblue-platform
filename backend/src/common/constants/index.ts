// Fixer tier pricing multipliers
export const TIER_MULTIPLIERS = {
  ECONOMY: 1.0,
  STANDARD: 1.2,
  CORPORATE: 1.4,
  EXPERT: 1.6,
  GURU: 1.8,
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
