"use strict";

const dns = require("node:dns");
const net = require("node:net");

function parseIpv4ToInt(ip) {
  const parts = String(ip).split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  ) >>> 0;
}

function ipv4InRange(ip, start, end) {
  const value = parseIpv4ToInt(ip);
  const startValue = parseIpv4ToInt(start);
  const endValue = parseIpv4ToInt(end);

  if (value === null || startValue === null || endValue === null) {
    return false;
  }

  return value >= startValue && value <= endValue;
}

function isBlockedIpv4(ip) {
  return (
    ipv4InRange(ip, "0.0.0.0", "0.255.255.255") ||
    ipv4InRange(ip, "10.0.0.0", "10.255.255.255") ||
    ipv4InRange(ip, "100.64.0.0", "100.127.255.255") ||
    ipv4InRange(ip, "127.0.0.0", "127.255.255.255") ||
    ipv4InRange(ip, "169.254.0.0", "169.254.255.255") ||
    ipv4InRange(ip, "172.16.0.0", "172.31.255.255") ||
    ipv4InRange(ip, "192.0.0.0", "192.0.0.255") ||
    ipv4InRange(ip, "192.0.2.0", "192.0.2.255") ||
    ipv4InRange(ip, "192.168.0.0", "192.168.255.255") ||
    ipv4InRange(ip, "198.18.0.0", "198.19.255.255") ||
    ipv4InRange(ip, "198.51.100.0", "198.51.100.255") ||
    ipv4InRange(ip, "203.0.113.0", "203.0.113.255") ||
    ipv4InRange(ip, "224.0.0.0", "255.255.255.255")
  );
}

function isBlockedIpv6(ip) {
  const normalized = String(ip).toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

function isBlockedIpAddress(address) {
  const family = net.isIP(address);

  if (family === 4) {
    return isBlockedIpv4(address);
  }

  if (family === 6) {
    return isBlockedIpv6(address);
  }

  return false;
}

function hostnameLooksLocal(hostname) {
  const normalized = String(hostname || "").toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "localhost.localdomain" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".test")
  );
}

async function resolveHostname(hostname) {
  return dns.promises.lookup(hostname, {
    all: true,
    verbatim: true
  });
}

function protocolMayBypassNetwork(protocol, allowFileProtocol) {
  if (protocol === "about:" || protocol === "data:" || protocol === "blob:") {
    return true;
  }

  if (protocol === "file:" && allowFileProtocol) {
    return true;
  }

  return false;
}

async function assertUrlMayBeFetched(rawUrl, options) {
  const allowFileProtocol = options && options.allowFileProtocol === true;

  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("URL_SAFETY_URL_REQUIRED");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    throw new Error("URL_SAFETY_INVALID_URL");
  }

  if (protocolMayBypassNetwork(parsed.protocol, allowFileProtocol)) {
    return true;
  }

  if (parsed.protocol === "file:") {
    throw new Error("URL_SAFETY_FILE_PROTOCOL_BLOCKED");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`URL_SAFETY_PROTOCOL_BLOCKED: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error("URL_SAFETY_HOSTNAME_REQUIRED");
  }

  if (hostnameLooksLocal(hostname)) {
    throw new Error(`URL_SAFETY_LOCAL_HOSTNAME_BLOCKED: ${hostname}`);
  }

  if (net.isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new Error(`URL_SAFETY_RESTRICTED_IP_BLOCKED: ${hostname}`);
    }
    return true;
  }

  const records = await resolveHostname(hostname);
  for (const record of records) {
    if (isBlockedIpAddress(record.address)) {
      throw new Error(`URL_SAFETY_RESTRICTED_DNS_RESULT_BLOCKED: ${hostname} -> ${record.address}`);
    }
  }

  return true;
}

async function installRequestSafetyRoutes(context, options) {
  if (!context || typeof context.route !== "function") {
    throw new Error("URL_SAFETY_CONTEXT_REQUIRED");
  }

  const allowFileProtocol = options && options.allowFileProtocol === true;

  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();

    try {
      await assertUrlMayBeFetched(requestUrl, { allowFileProtocol });
      await route.continue();
    } catch (_error) {
      await route.abort("blockedbyclient");
    }
  });
}

module.exports = Object.freeze({
  assertUrlMayBeFetched,
  hostnameLooksLocal,
  installRequestSafetyRoutes,
  isBlockedIpAddress,
  isBlockedIpv4,
  isBlockedIpv6,
  parseIpv4ToInt
});