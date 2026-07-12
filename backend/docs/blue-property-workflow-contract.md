# BLUE Property Workflow Contract

Runtime boundary: `Flutter -> BLUE NestJS -> CBLUE backend -> BLUE normalized runtime -> Flutter UI`.
Flutter never calls CBLUE directly. BLUE forwards the authenticated CBLUE bearer
token for customer/lister operations and renders only these CBLUE snapshots.
BLUE must not fabricate listings, matches, references, statuses, steps, actions,
meeting data, files, or workflow state. There is no localStorage, modal-text,
title, or description fallback in this contract.

Base path: `/api/v1/blue/property-workflow`.

BLUE is a projection client. It must not create listings, matches, inquiries,
PRE/PO references, attachments, or workflow state locally. CBLUE is the only
source of truth.

## Listings

`GET /listings?page=1&limit=20` is public and returns latest-first public CBLUE
listings. Supported filters are `propertyType`, `listingType`, `province`,
`district`, `subdistrict`, `minPrice`, `maxPrice`, and `keyword`. Each result
includes the listing identifier, title, property/listing types, tier, price,
location, media metadata/download URLs, `createdAt`, and `updatedAt`. It
intentionally excludes contact name, phone, and email before fee/proceed.

## Inquiry Creation

`POST /inquiries` requires a CBLUE customer bearer token. The body contains
`listingId`, optional `requestDetails`, and optional file metadata. CBLUE
generates the reference/PO number, derives the selected lister from the stored
listing owner, persists Match, Select, Notify, attachments, and timestamps,
and returns an authoritative Step 3 snapshot. The snapshot includes
`availableActions`, customer, lister, fee state, chat state/messages, history,
alerts, and activity placement.

## Snapshot

`GET /inquiries/:reference` requires a participant bearer token. It returns
the current step, status, action owner, all eight labels, safe listing data,
stored request/files, meeting fields, chat availability, ratings, event
history, and alerts. A lister-only decline note is omitted for the customer.
Contact information appears only from `PAID` onward.
Terminal `CANCELLED`, `DECLINED`, and `COMPLETED` snapshots use
`activityBucket: "history"`, return no available actions or alerts, and close
chat. They must not appear in requests or active work.

## Actions

All actions require a participant bearer token and return the updated snapshot.

| Endpoint suffix         | Actor              | Stored status / step                      |
| ----------------------- | ------------------ | ----------------------------------------- |
| `/accept`               | Lister             | `ACCEPTED` / 4                            |
| `/decline`              | Lister             | `DECLINED` / 4; note is private           |
| `/fee`                  | Customer           | `PAID` / 5; accepts `freePass`            |
| `/viewing-invite`       | Customer           | `MEETING_SENT` / 6                        |
| `/viewing-confirmation` | Lister             | `MEETING_CONFIRMED` / 7                   |
| `/customer-rating`      | Customer           | Step 8; completes when both ratings exist |
| `/lister-rating`        | Lister             | Step 8; completes when both ratings exist |
| `/cancel`               | Customer or lister | `CANCELLED` at current step               |

Existing `/property-inquiries/customer`, `/property-inquiries/lister`, and
`PUT /property-inquiries/by-po/:reference` remain compatible. Their persisted
statuses map to the same eight-step semantics above: `NOTIFY_SENT` (3),
`ACCEPTED` (4), `PAID` (5), `MEETING_SENT` (6), `MEETING_CONFIRMED` (7), and
`COMPLETED` (8). `DECLINED` and `CANCELLED` are terminal states.
