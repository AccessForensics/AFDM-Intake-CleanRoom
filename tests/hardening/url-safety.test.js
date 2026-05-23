"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertUrlMayBeFetched,
  hostnameLooksLocal,
  isBlockedIpAddress,
  isBlockedIpv4,
  isBlockedIpv6,
  parseIpv4ToInt
} = require("../../src/intake/url-safety.js");

test("URL safety blocks private and loopback IPv4 addresses", () => {
  assert.equal(isBlockedIpv4("127.0.0.1"), true);
  assert.equal(isBlockedIpv4("10.1.2.3"), true);
  assert.equal(isBlockedIpv4("100.64.1.1"), true);
  assert.equal(isBlockedIpv4("172.16.0.1"), true);
  assert.equal(isBlockedIpv4("192.168.1.10"), true);
  assert.equal(isBlockedIpv4("198.18.0.1"), true);
  assert.equal(isBlockedIpv4("203.0.113.7"), true);
  assert.equal(isBlockedIpv4("8.8.8.8"), false);
});

test("URL safety blocks loopback and local IPv6 addresses", () => {
  assert.equal(isBlockedIpv6("::1"), true);
  assert.equal(isBlockedIpv6("fe80::1"), true);
  assert.equal(isBlockedIpv6("fd00::1"), true);
  assert.equal(isBlockedIpAddress("::1"), true);
});

test("URL safety identifies local hostnames", () => {
  assert.equal(hostnameLooksLocal("localhost"), true);
  assert.equal(hostnameLooksLocal("dev.local"), true);
  assert.equal(hostnameLooksLocal("example.com"), false);
});

test("URL safety parses IPv4 addresses deterministically", () => {
  assert.equal(parseIpv4ToInt("0.0.0.1"), 1);
  assert.equal(parseIpv4ToInt("999.0.0.1"), null);
});

test("URL safety blocks file protocol unless explicitly allowed", async () => {
  await assert.rejects(
    () => assertUrlMayBeFetched("file:///tmp/example.html", { allowFileProtocol: false }),
    /URL_SAFETY_FILE_PROTOCOL_BLOCKED/
  );

  await assert.doesNotReject(
    () => assertUrlMayBeFetched("file:///tmp/example.html", { allowFileProtocol: true })
  );
});

test("URL safety blocks literal restricted IP URL before DNS", async () => {
  await assert.rejects(
    () => assertUrlMayBeFetched("http://127.0.0.1:5000", { allowFileProtocol: false }),
    /URL_SAFETY_RESTRICTED_IP_BLOCKED/
  );
});

test("URL safety permits browser internal non-network protocols", async () => {
  await assert.doesNotReject(
    () => assertUrlMayBeFetched("about:blank", { allowFileProtocol: false })
  );

  await assert.doesNotReject(
    () => assertUrlMayBeFetched("data:text/plain,hello", { allowFileProtocol: false })
  );
});