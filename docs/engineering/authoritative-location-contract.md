# Authoritative Location Contract

## Purpose

This CBLUE contract prevents GPS-only records from losing location context and prevents administrative listings from leaking stale coordinates. It applies to the 8-step property workflow, 11-step fixer workflow, customer and partner requests, active jobs, real-estate listings, properties pages, and BLUE bridge snapshots.

## Persisted source of truth

- `locationMode=GPS`: latitude and longitude are authoritative. On server read and write, call `normalizeThaiGpsLocation` and persist resolved province, district, subdistrict, and postal code when a known area matches.
- `locationMode=ADMINISTRATIVE`: province, district, subdistrict, and postal code are authoritative. Persist and expose `latitude=null` and `longitude=null`.
- Never infer location from titles, descriptions, PO or PRE numbers, modal copy, browser storage, or stale frontend state.
- Unknown GPS coordinates must not receive a fabricated subdistrict. Keep the coordinates and require an approved reverse-geocoding source before assigning administrative data.

## Presentation

- GPS summary and detail views use `<subdistrict> · <latitude six decimals>, <longitude six decimals>`; when subdistrict is unavailable, use the resolved district or province followed by the coordinates.
- GPS action modals retain the coordinate and show the resolved administrative context.
- Administrative summary, detail, and modal views use the selected administrative fields and never display stale GPS.
- Public listing payloads and workflow snapshots use the same normalized fields. They must not mix raw administrative fields with raw coordinates.

## Search and matching

- Property search by province, district, subdistrict, or postal code must include the equivalent known GPS bounds.
- Fixer bookings send the resolved subdistrict. Fixer service-area records persist `serviceSubdistrict`; exact subdistrict matching is evaluated before legacy district and province fallback.
- Both 8-step and 11-step flows use server-owned normalized values for discovery, matching, snapshots, and display.

## Regression gates

Every location change must retain tests for:

- GPS-only properties resolving to subdistrict plus coordinates in real-estate, listing, detail, and bridge responses.
- Administrative listings clearing stale coordinates.
- GPS-only properties matching province, district, subdistrict, and postal-code searches.
- Fixer registration and update persisting `serviceSubdistrict`, with exact subdistrict matching covered by a regression test.
- Contract behavior proving no PO, title, description, modal-text, or localStorage parsing is used.

Before merging a location-related change, run the backend test suite, backend build, web type check, web build, and `git diff --check`. Keep this contract updated whenever the persisted location model, bridge payload, or presentation rule changes.
