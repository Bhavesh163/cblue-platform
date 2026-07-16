# CBLUE Workflow Activities Bridge Design

## Goal

Expose one protected, server-owned discovery endpoint for BLUE to read a CBLUE participant's 11-step fixer workflow activity without using browser state or legacy order collections.

## Endpoint

`GET /api/v1/blue/workflow-activities?legacySubjectId=...&persona=customer|partner`

The endpoint requires `x-blue-bridge-key`, resolves CBLUE user IDs exclusively from `legacySubjectId`, and filters orders by the requested persisted customer or selected-fixer relationship.

## Response

The root response is versioned as `cblue-fixer-workflow-activities-v1` and returns `requests`, `activeJobs`, `history`, `chatRooms`, `alerts`, and `upcomingMeetings`.

Each workflow is created from the existing persisted fixer snapshot. It includes PO number, step and lifecycle state, activity bucket, action availability, chat availability, display-safe customer and partner identity, category/title, timestamps, and stored location. `chat.enabled` comes only from `Order.chatEnabled`.

## Data Rules

Only persisted CBLUE data is queried: `Order`, selected `Fixer`, order status history, workflow actions, order chat messages, notifications, and persisted meeting action payloads. No local storage, title/description/PO parsing, estimates, `/orders/my`, or `/orders/fixer` discovery is used.

Terminal, cancelled, declined, completed, and rated records enter `history` only when the existing persisted snapshot returns `activityBucket: history`. Requests and active jobs use the same bucket from that snapshot. Chat rooms are returned only for visible records with persisted chat enabled; their messages come only from `OrderChatMessage`. Upcoming meetings come only from persisted meeting action payloads for visible non-terminal records.

## Security

The bridge key is checked before lookup. An unknown `legacySubjectId`, an invalid persona, or a missing/invalid key fails without returning workflows. The response contains only the role-appropriate actions for the requested persona and only the actor-visible orders.

## Verification

Tests cover missing/invalid bridge keys, customer and partner visibility isolation, a chat-enabled PO-2607-8879 active workflow, terminal history placement, and controller route wiring. Live verification uses the bridge key and sanitized output only.
