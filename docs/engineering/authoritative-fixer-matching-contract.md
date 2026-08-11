# Authoritative Fixer Matching Contract

CBLUE owns fixer eligibility, location coverage, service intent, price comparison, tier policy, returning-partner history, nomination validation, and final Top-8 order. BLUE and Flutter may normalize and present the CBLUE response, but must not recreate these decisions.

## Request contract

All three CBLUE fixer booking forms use the shared FixerResults request and send:

- booking type and selected service category
- selected tier
- customer description
- GPS latitude and longitude when GPS is selected
- normalized province, district, subdistrict, and postal code when available
- an optional partner nomination
- the authenticated customer bearer token when signed in

## Eligibility

Candidates must satisfy the persisted qualification predicate: approved fixer status, verified KYC, ELIGIBLE qualification state, no pending re-verification, and a future KYC validity date. Matching must not weaken this predicate to fill empty slots.

## Location coverage

- When customer and provider GPS coordinates exist, distance is compared with the provider's persisted travelRadius. The validated maximum is 100 km.
- Legacy providers without a persisted travelRadius use the booking-type fallback radius.
- When provider GPS is unavailable, persisted province, district, subdistrict, or postal-code coverage is used.
- A GPS booking must be normalized to administrative fields before matching so providers without GPS can participate through their persisted service area.
- Coordinates, administrative fields, and travel radius must come from persisted or submitted structured fields. They must not be parsed from descriptions or display text.

## Service intent and pricing

- Thai, English, and Chinese descriptions are normalized through the canonical service registry.
- Common spelling variants belong in the registry and require parser regression tests.
- Quantities and units are paired with local canonical service mentions.
- Price comparisons use persisted partner price-list rows and server-calculated totals.
- An unmatched request is persisted as demand-gap data; the UI must not invent candidates.

## Tier and Top-8 policy

The selected tier is the minimum eligible tier. Given enough unique eligible candidates, CBLUE assigns:

1. Cheapest candidate from the selected tier and upper tiers.
2. Second-cheapest candidate from the selected tier and upper tiers.
3. Highest-rated candidate from the selected tier, with upper-tier fallback.
4. Second highest-rated candidate from the selected tier, with upper-tier fallback.
5. Cheapest candidate above the selected tier.
6. Highest-rated candidate above the selected tier, with completed jobs as the tiebreaker.
7. The authenticated customer's most recent eligible partner from a persisted completed order, prefixed with a star.
8. The eligible customer-nominated partner.

Candidate IDs are unique. Returning and nominated candidates are reserved for their dedicated slots. Remaining capacity may be filled only from the already eligible ranking pool.

## AI boundary

The deterministic CBLUE order is authoritative. AI review may attach factual audit notes based only on supplied candidate data. It must not add candidates, alter prices or locations, bypass eligibility, or reorder server-owned slots.

## Required regression coverage

- exact reported multilingual phrases and common spelling variants
- GPS inclusion within provider travelRadius and exclusion outside it
- administrative fallback for providers without GPS
- selected-tier exclusion of lower tiers
- all eight slot reasons and order
- persisted returning-partner lookup and nomination
- AI notes preserving deterministic order
- no unverified, expired, cancelled, declined, or finished workflow leakage into active surfaces
