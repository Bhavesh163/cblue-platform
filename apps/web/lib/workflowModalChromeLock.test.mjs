import assert from "node:assert/strict";
import test from "node:test";

import { toggleWorkflowModalChromeLock } from "./workflowModalChromeLock.js";

function makeElement() {
  const classes = new Set();
  const attributes = new Map();
  return {
    dataset: {},
    style: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, active) => {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name) ?? null,
  };
}

test("keeps the global header disabled until every workflow modal releases its lock", () => {
  const body = makeElement();
  const html = makeElement();
  const header = makeElement();
  const doc = {
    body,
    documentElement: html,
    querySelector: (selector) => selector === "[data-cblue-header-root]" ? header : null,
  };

  toggleWorkflowModalChromeLock(true, doc);
  toggleWorkflowModalChromeLock(true, doc);
  toggleWorkflowModalChromeLock(false, doc);

  assert.equal(body.dataset.cblueWorkflowModalLocks, "1");
  assert.equal(header.classList.contains("pointer-events-none"), true);
  assert.equal(header.getAttribute("data-modal-open"), "true");

  toggleWorkflowModalChromeLock(false, doc);

  assert.equal(body.dataset.cblueWorkflowModalLocks, undefined);
  assert.equal(body.classList.contains("cblue-workflow-modal-open"), false);
  assert.equal(html.classList.contains("cblue-workflow-modal-open"), false);
  assert.equal(header.classList.contains("pointer-events-none"), false);
  assert.equal(header.classList.contains("select-none"), false);
  assert.equal(header.classList.contains("blur-sm"), false);
  assert.equal(header.style.zIndex, "");
  assert.equal(header.getAttribute("aria-hidden"), null);
  assert.equal(header.getAttribute("data-modal-open"), "false");
});
