import test from "node:test";
import assert from "node:assert/strict";
import { dispositionOf, finalVerdictOf } from "../src/parse.js";

test("dispositionOf reads DONE, STOPPED, and neither", () => {
  assert.equal(dispositionOf("...\nDisposition: DONE\n"), "DONE");
  assert.equal(dispositionOf("Disposition: STOPPED — blocked on install"), "STOPPED");
  assert.equal(dispositionOf("no disposition line"), "UNKNOWN");
});

test("finalVerdictOf extracts the verdict or says so", () => {
  assert.equal(finalVerdictOf("FINAL VERDICT: PASS WITH CONCERNS — details"), "PASS WITH CONCERNS");
  assert.equal(finalVerdictOf("nothing here"), "NO VERDICT");
});
