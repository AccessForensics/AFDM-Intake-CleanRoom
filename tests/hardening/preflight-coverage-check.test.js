"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..", "..");

test("unsupported preflight loop is removed from active build paths", () => {
  const removedPaths = [
    "scripts/hardening/preflight-coverage-check.js",
    "intake/hardening/coverage-map.md",
    "intake/hardening/unsupported-current-coverage.registry.json",
    "tools/create-supported-hardening-payloads.js"
  ];

  for (const relativePath of removedPaths) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, `${relativePath} must not exist`);
  }
});

test("package scripts do not expose unsupported hardening commands", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const scripts = packageJson.scripts || {};

  assert.equal(Object.prototype.hasOwnProperty.call(scripts, "hardening:payloads"), false);
});
