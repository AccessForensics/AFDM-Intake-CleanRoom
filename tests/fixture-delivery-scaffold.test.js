"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const TOTAL_FIXTURES = 17;
const IMPLEMENTED_FIXTURES = 13;
const SCAFFOLDED_FIXTURES = 4;
const EXPECTED_SCAFFOLDED_REFS = ["D.14", "D.15", "D.16", "D.17"];

function readJson(relativePath) {
  const target = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

test("fixture scaffold JSON exists and contains all 17 Appendix D fixtures", () => {
  const data = readJson("fixtures/intake/appendix-d-fixtures.json");
  assert.equal(data.spec_version, "L3-v8");
  assert.equal(Array.isArray(data.fixtures), true);
  assert.equal(data.fixtures.length, TOTAL_FIXTURES);
});

test("13 Appendix D fixtures are implemented and 4 remain scaffolded", () => {
  const data = readJson("fixtures/intake/appendix-d-fixtures.json");

  const implemented = data.fixtures.filter((fixture) => fixture.status === "implemented");
  const scaffolded = data.fixtures.filter((fixture) => fixture.status === "scaffolded");
  const scaffoldedRefs = scaffolded.map((fixture) => fixture.appendix_d_reference).sort();

  assert.equal(implemented.length, IMPLEMENTED_FIXTURES);
  assert.equal(scaffolded.length, SCAFFOLDED_FIXTURES);
  assert.deepEqual(scaffoldedRefs, EXPECTED_SCAFFOLDED_REFS);
});

test("all scaffolded Appendix D fixture files exist", () => {
  const data = readJson("fixtures/intake/appendix-d-fixtures.json");
  const scaffolded = data.fixtures.filter((fixture) => fixture.status === "scaffolded");

  for (const fixture of scaffolded) {
    const target = path.join(process.cwd(), fixture.fixture_path.replaceAll("/", path.sep));
    assert.equal(fs.existsSync(target), true, fixture.fixture_path);
  }
});

test("delivery scaffold files still exist", () => {
  const requiredFiles = [
    "delivery_artifacts/intake/change_inventory.md",
    "delivery_artifacts/intake/implementation_inventory.md",
    "delivery_artifacts/intake/test_inventory.md",
    "delivery_artifacts/intake/fixture_inventory.md",
    "delivery_artifacts/intake/golden_artifact_verification.md",
    "delivery_artifacts/intake/traceability_matrix.csv",
    "delivery_artifacts/intake/pr_ready_summary.md",
    "delivery_artifacts/intake/limitations_appendix_f.md"
  ];

  for (const file of requiredFiles) {
    const target = path.join(process.cwd(), file);
    assert.equal(fs.existsSync(target), true, file);
  }
});