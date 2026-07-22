import assert from "node:assert/strict";
import test from "node:test";

import {
  propertyModalLocation,
  propertySummaryLocation,
  propertyFileUrls,
  latestPropertyWorkflowAlert,
} from "./propertyWorkflowProjection.js";

test("uses GPS only in property workflow modals and subdistrict on summary surfaces", () => {
  const item = {
    latitude: 13.794107,
    longitude: 100.609535,
    subdistrict: "Saphan Song",
  };
  assert.equal(propertyModalLocation(item), "13.794107, 100.609535");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("uses subdistrict in both surfaces without GPS", () => {
  const item = { subdistrict: "Saphan Song", latitude: null, longitude: null };
  assert.equal(propertyModalLocation(item), "Saphan Song");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("falls back to district then province when subdistrict is missing", () => {
  const item = { district: "Wang Thonglang", province: "Bangkok" };
  assert.equal(propertyModalLocation(item), "Wang Thonglang");
  assert.equal(propertySummaryLocation(item), "Wang Thonglang");
});

test("treats zero coordinates as administrative location", () => {
  const item = { subdistrict: "Saphan Song", latitude: 0, longitude: 0 };
  assert.equal(propertyModalLocation(item), "Saphan Song");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("prefers authoritative presentation fields over persisted coordinates", () => {
  const item = {
    latitude: 13.794107,
    longitude: 100.609535,
    subdistrict: "Saphan Song",
    locationPresentation: {
      mode: "gps",
      coordinates: { latitude: 13.794107, longitude: 100.609535 },
      modalDisplay: "13.794107, 100.609535",
      summaryDisplay: "Saphan Song",
    },
  };
  assert.equal(propertyModalLocation(item), "13.794107, 100.609535");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("prefers authoritative administrative presentation when persisted GPS exists", () => {
  const item = {
    latitude: 13.794107,
    longitude: 100.609535,
    subdistrict: "Saphan Song",
    locationPresentation: {
      mode: "administrative",
      coordinates: null,
      modalDisplay: "Saphan Song",
      summaryDisplay: "Saphan Song",
    },
  };
  // The bridge decided administrative mode; both surfaces show the subdistrict.
  assert.equal(propertyModalLocation(item), "Saphan Song");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("never parses titles, descriptions, or PRE numbers for location", () => {
  const item = {
    title: "Bangkok Office PRE-2607-7944 13.794107, 100.609535",
    description: "Project Location: 13.794107, 100.609535",
    poNumber: "PRE-2607-7944",
    subdistrict: "Saphan Song",
  };
  assert.equal(propertyModalLocation(item), "Saphan Song");
  assert.equal(propertySummaryLocation(item), "Saphan Song");
});

test("returns Unknown for empty location input", () => {
  assert.equal(propertyModalLocation(null), "Unknown");
  assert.equal(propertySummaryLocation(undefined), "Unknown");
  assert.equal(propertyModalLocation({}), "Unknown");
});

test("deduplicates files preferring authoritative uploadedFiles", () => {
  const item = {
    uploadedFiles: [
      { url: "https://files.example/photo.jpg" },
      { url: "https://files.example/floor.pdf" },
    ],
    propertyImages: ["https://files.example/photo.jpg"],
  };
  assert.deepEqual(propertyFileUrls(item), [
    "https://files.example/photo.jpg",
    "https://files.example/floor.pdf",
  ]);
});

test("assembles files from legacy attachments and propertyImages", () => {
  const item = {
    attachments: [{ url: "https://files.example/floor.pdf" }],
    listing: {
      attachments: [{ url: "https://files.example/listing.jpg" }],
    },
    propertyImages: ["https://files.example/extra.jpg"],
  };
  assert.deepEqual(propertyFileUrls(item), [
    "https://files.example/floor.pdf",
    "https://files.example/listing.jpg",
    "https://files.example/extra.jpg",
  ]);
});

test("deduplicates exact URLs across sources", () => {
  const item = {
    uploadedFiles: [{ url: "https://files.example/shared.jpg" }],
    attachments: [{ url: "https://files.example/shared.jpg" }],
    propertyImages: ["https://files.example/shared.jpg"],
  };
  assert.deepEqual(propertyFileUrls(item), ["https://files.example/shared.jpg"]);
});

test("returns an empty list without persisted files and ignores text fields", () => {
  const item = {
    title: "Bangkok Office with photo.jpg in the name",
    description: "See floor.pdf attached",
  };
  assert.deepEqual(propertyFileUrls(item), []);
  assert.deepEqual(propertyFileUrls(null), []);
});

test("projects the latest persisted Step 3 notification for its audience", () => {
  const alert = latestPropertyWorkflowAlert(
    {
      poNumber: "PRE-2607-7944",
      workflowEvents: [
        {
          action: "partner-notified",
          createdAt: "2026-07-22T03:04:05.000Z",
          metadata: {
            audience: ["customer", "lister"],
            notifications: {
              customer:
                "House · Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.",
              lister:
                "House · Order: PRE-2607-7944: A customer selected your listing. Please accept or decline the inquiry.",
            },
          },
        },
      ],
    },
    "customer",
  );

  assert.deepEqual(alert, {
    id: "property-workflow-partner-notified-PRE-2607-7944-2026-07-22T03:04:05.000Z",
    action: "partner-notified",
    message:
      "House · Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.",
    createdAt: "2026-07-22T03:04:05.000Z",
  });
});

test("does not invent a property workflow alert from status or display fields", () => {
  assert.equal(
    latestPropertyWorkflowAlert(
      {
        poNumber: "PRE-2607-7944",
        status: "NOTIFY_SENT",
        title: "House",
        description: "Please wait for the selected lister.",
      },
      "customer",
    ),
    null,
  );
});

test("does not expose a persisted workflow notification outside its audience", () => {
  assert.equal(
    latestPropertyWorkflowAlert(
      {
        workflowEvents: [
          {
            action: "partner-notified",
            createdAt: "2026-07-22T03:04:05.000Z",
            metadata: {
              audience: ["lister"],
              notifications: { lister: "Lister message" },
            },
          },
        ],
      },
      "customer",
    ),
    null,
  );
});
