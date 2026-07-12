# BLUE Property Workflow Contract

Base path: `/api/v1/blue/property-workflow`.

BLUE is a projection client. It must not create listings, matches, inquiries,
PRE/PO references, attachments, or workflow state locally. CBLUE is the only
source of truth.

## Listings

`GET /listings?page=1&limit=20` is public and returns latest-first public CBLUE
listings. Each result includes the listing identifier, title, property and
listing types, tier, price, location, attachment download metadata, and
creation time. It intentionally excludes contact name, phone, and email.

## Inquiry Creation

`POST /inquiries` requires a CBLUE customer bearer token. The body contains
`listingId`, optional `requestDetails`, and optional file metadata. CBLUE
generates the reference, derives the lister from the stored listing owner,
persists attachments and an `inquiry-created` event, and returns an
authoritative Step 3 snapshot.

## Snapshot

`GET /inquiries/:reference` requires a participant bearer token. It returns
the current step, status, action owner, all eight labels, safe listing data,
stored request/files, meeting fields, chat availability, ratings, event
history, and alerts. A lister-only decline note is omitted for the customer.
Contact information appears only from `PAID` onward.

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
