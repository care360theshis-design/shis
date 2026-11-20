import assert from "node:assert/strict";
import test from "node:test";
import { assessClass } from "./db/risk.js";

test("three students above a quiet class is review recommended", () => {
  const result = assessClass({ classSize: 30, distinct3d: 3, distinctPrior11d: 0 });
  assert.equal(result.reviewRecommended, true);
  assert.equal(result.band, "medium");
  assert.equal(result.label, "Review recommended");
  assert.doesNotMatch(result.reason, /outbreak|disease|flu|covid/i);
});

test("a single visit stays normal", () => {
  const result = assessClass({ classSize: 30, distinct3d: 1, distinctPrior11d: 4 });
  assert.equal(result.band, "low");
  assert.equal(result.label, "Normal");
});

test("five students is the higher band, still not a diagnosis", () => {
  const result = assessClass({ classSize: 30, distinct3d: 5, distinctPrior11d: 1 });
  assert.equal(result.band, "high");
  assert.equal(result.reviewRecommended, true);
});
