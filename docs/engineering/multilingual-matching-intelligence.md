# Multilingual Matching Intelligence

## Purpose

CBLUE uses a private matching-intelligence service to recognize canonical service intent in Thai, English, and Chinese requests. The NestJS fixer matcher remains authoritative for provider eligibility, location coverage, tier policy, persisted pricing, returning-provider history, nomination validation, and final Top-8 order.

The service must never receive bearer tokens, partner identity documents, or secrets belonging to BLUE. It receives only the customer service text and the versioned CBLUE service catalogue over the private Docker network.

## Production Flow

1. The customer submits structured location, tier, booking type, and service text to CBLUE.
2. CBLUE normalizes GPS coordinates to administrative areas and resolves eligible providers from persisted records.
3. The matching-intelligence sidecar analyzes service text with the authoritative service catalogue.
4. CBLUE validates every returned canonical key, confidence, unit, and quantity before merging it with the deterministic parser.
5. CBLUE calculates prices from persisted provider price-list rows and applies the server-owned eight-slot policy.
6. CBLUE persists unmatched demand when no eligible provider remains.
7. BLUE may normalize and display CBLUE's response but must not recompute matching decisions.

## Language Pipeline

- Unicode NFKC normalization and Thai digit normalization.
- PyThaiNLP tokenization for Thai text.
- OpenCC normalization so traditional and simplified Chinese share one catalogue.
- Exact canonical aliases before fuzzy matching.
- RapidFuzz matching for approved spelling variants and bounded typographical errors.
- Local quantity and unit extraction for square metres, pages, FAQ items, jobs, units, rooms, and floors.
- An ambiguity margin that rejects uncertain fuzzy matches instead of inventing service intent.

The canonical service registry is versioned by a content hash. New services, synonyms, and spelling variants belong in that registry and require Thai, English, and Chinese regression cases.

## Authority And Safety

- Only approved, verified, unexpired, matching-eligible providers may enter the candidate pool.
- GPS distance uses the provider's persisted travel radius. Structured administrative areas provide the fallback when either party has no coordinates.
- The selected tier is the minimum eligible tier. Lower tiers never enter an upper-tier request.
- Persisted price-list rows are the only source of provider price calculations.
- The sidecar cannot add a provider, alter a price, bypass location or qualification rules, assign a slot, or reorder results.
- The sidecar endpoint requires a deployment-generated internal key and is not published on a host port.
- Request text, credentials, and response bodies are not written to access logs.

## Availability

CBLUE applies a strict timeout, bounded cache, and circuit breaker to sidecar calls. If the sidecar is unavailable or returns an invalid contract, the deterministic multilingual parser remains active. Database or eligibility failures return a service-unavailable response and are not misreported as zero matching supply.

The deployment starts and health-checks the private sidecar before a candidate backend is launched. The candidate backend must pass its existing probes before promotion. A failed sidecar deployment leaves the current live backend untouched.

## Semantic Retrieval Gate

Dense multilingual retrieval is a separate, measured expansion, not an implicit production dependency. BGE-M3 or an equivalent multilingual embedding model may be introduced behind the same validated contract only when it runs on a dedicated inference service and passes the offline benchmark in shadow mode.

Promotion from shadow mode requires all of the following:

- no reduction in eligible-provider recall for Thai requests;
- no increase in location, qualification, or tier false positives;
- improved recall on unseen synonyms and real misspellings;
- stable p95 latency within the matching request budget;
- confidence calibration that meets the configured semantic threshold;
- approval of the benchmark report and rollback procedure.

Semantic results remain candidate service intents only. CBLUE continues to own all authorization, eligibility, pricing, and ranking decisions.

## Required Metrics

- intent precision and recall by language and service;
- eligible-provider recall at eight;
- Top-8 slot policy correctness;
- zero-result rate by service and administrative area;
- unmatched-demand volume by service and location;
- false-positive location and tier rate;
- sidecar timeout, invalid-contract, and circuit-breaker counts;
- p50, p95, and p99 analysis latency;
- deterministic fallback rate.

Alerts should distinguish genuine zero supply from parser uncertainty and infrastructure failure. Frequent unmatched demand must feed the existing persisted admin demand-gap reporting rather than being repaired with fabricated candidates.

## Change Checklist

- Add or update canonical aliases in the service registry.
- Add exact, typo, ambiguous, quantity, and mixed-language tests.
- Verify GPS and administrative-area eligibility tests.
- Verify selected-tier and all eight slot tests.
- Run Python lint and tests, NestJS lint and tests, backend build, Docker build, and Compose validation.
- Deploy the sidecar and candidate backend together, then monitor matching and fallback metrics.
