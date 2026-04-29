"use strict";

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

async function detectEnvironmentChallenge(page) {
  const url = page.url();

  const data = await page.evaluate(() => {
    function safeText(value) {
      return String(value || "").trim();
    }

    function uniqueInner(values) {
      return Array.from(new Set((values || []).filter(Boolean)));
    }

    const title = safeText(document.title || "");
    const bodyText = (document.body ? document.body.innerText : "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    const html = document.documentElement ? document.documentElement.outerHTML : "";
    const anchors = Array.from(document.querySelectorAll("a[href]")).slice(0, 20).map((a) => ({
      text: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
      href: (a.getAttribute("href") || "").trim()
    }));

    const scriptSrcs = Array.from(document.querySelectorAll("script[src]"))
      .slice(0, 50)
      .map((script) => safeText(script.getAttribute("src")))
      .filter(Boolean);

    const domSignals = [];
    if (document.getElementById("challenge-running")) {
      domSignals.push("id:challenge-running");
    }
    if (document.getElementById("cf-please-wait")) {
      domSignals.push("id:cf-please-wait");
    }
    if (
      document.querySelector(
        "iframe[src*='captcha-delivery.com'], iframe[src*='challenge-platform'], iframe[src*='px-captcha'], iframe[src*='managed-challenge']"
      )
    ) {
      domSignals.push("challenge-iframe");
    }

    const runtimeSignals = [];
    if (typeof window._cf_chl_opt !== "undefined") {
      runtimeSignals.push("window._cf_chl_opt");
    }
    if (typeof window.__cf_chl_opt !== "undefined") {
      runtimeSignals.push("window.__cf_chl_opt");
    }
    if (typeof window.turnstile !== "undefined") {
      runtimeSignals.push("window.turnstile");
    }
    if (typeof window.DataDome !== "undefined") {
      runtimeSignals.push("window.DataDome");
    }
    if (typeof window.ddcid !== "undefined") {
      runtimeSignals.push("window.ddcid");
    }
    if (typeof window.ddjskey !== "undefined") {
      runtimeSignals.push("window.ddjskey");
    }
    if (typeof window._pxAppId !== "undefined") {
      runtimeSignals.push("window._pxAppId");
    }
    if (typeof window.pxAppId !== "undefined") {
      runtimeSignals.push("window.pxAppId");
    }
    if (typeof window._pxVid !== "undefined") {
      runtimeSignals.push("window._pxVid");
    }

    return {
      title,
      bodyText,
      html,
      anchors,
      scriptSrcs: uniqueInner(scriptSrcs),
      domSignals: uniqueInner(domSignals),
      runtimeSignals: uniqueInner(runtimeSignals)
    };
  });

  const visibleTextMarkers = [
    "verify you are human",
    "checking your browser",
    "attention required",
    "just a moment",
    "managed-challenge"
  ];

  const strongHtmlMarkers = [
    "managed-challenge",
    "cf-challenge",
    "/cdn-cgi/challenge-platform"
  ];

  const strongUrlMarkers = [
    "/cdn-cgi/challenge-platform",
    "managed-challenge",
    "cf-challenge"
  ];

  const strongScriptMarkers = [
    "/cdn-cgi/challenge-platform",
    "captcha-delivery.com",
    "px-captcha"
  ];

  const weakScriptMarkers = [
    "challenges.cloudflare.com/turnstile",
    "js.datadome.co",
    "perimeterx",
    "px-cloud.net"
  ];

  const urlLower = normalizeText(url);
  const titleLower = normalizeText(data.title);
  const bodyLower = normalizeText(data.bodyText);
  const htmlLower = normalizeText(data.html);

  const visibleTextHitMarkers = visibleTextMarkers.filter((marker) =>
    titleLower.includes(marker) || bodyLower.includes(marker)
  );

  const htmlHitMarkers = strongHtmlMarkers.filter((marker) =>
    htmlLower.includes(marker)
  );

  const urlHitMarkers = strongUrlMarkers.filter((marker) =>
    urlLower.includes(marker)
  );

  const strongScriptSignalMarkers = unique(
    (data.scriptSrcs || []).filter((src) =>
      strongScriptMarkers.some((marker) => normalizeText(src).includes(marker))
    )
  );

  const weakScriptSignalMarkers = unique(
    (data.scriptSrcs || []).filter((src) =>
      weakScriptMarkers.some((marker) => normalizeText(src).includes(marker))
    )
  );

  const domSignalMarkers = unique((data.domSignals || []).map((value) => normalizeText(value)));

  const runtimeSignals = unique((data.runtimeSignals || []).map((value) => normalizeText(value)));
  const strongRuntimeSignals = runtimeSignals.filter((signal) =>
    signal === "window._cf_chl_opt" || signal === "window.__cf_chl_opt"
  );
  const weakRuntimeSignals = runtimeSignals.filter((signal) =>
    signal === "window.turnstile" ||
    signal === "window.datadome" ||
    signal === "window.ddcid" ||
    signal === "window.ddjskey" ||
    signal === "window._pxappid" ||
    signal === "window.pxappid" ||
    signal === "window._pxvid"
  );

  const hasChallengeTextOrTakeoverMarkers =
    visibleTextHitMarkers.length > 0 ||
    htmlHitMarkers.length > 0 ||
    urlHitMarkers.length > 0;

  const markerOnlySignalsPresent =
    strongScriptSignalMarkers.length > 0 ||
    domSignalMarkers.length > 0 ||
    strongRuntimeSignals.length > 0;

  const substantiveTitleOrBodyPresent =
    (titleLower.length > 0 || bodyLower.length > 0) &&
    visibleTextHitMarkers.length === 0;

  const allegedSurfaceMateriallyRendered =
    Array.isArray(data.anchors) &&
    data.anchors.length > 0 &&
    visibleTextHitMarkers.length === 0;

  const challengeDetected =
    hasChallengeTextOrTakeoverMarkers ||
    (markerOnlySignalsPresent && !(substantiveTitleOrBodyPresent || allegedSurfaceMateriallyRendered));

  return Object.freeze({
    challengeDetected,
    evidence: Object.freeze({
      url,
      title: data.title,
      visibleTextHitMarkers,
      htmlHitMarkers,
      urlHitMarkers,
      strongScriptSignalMarkers,
      weakScriptSignalMarkers,
      domSignalMarkers,
      strongRuntimeSignals,
      weakRuntimeSignals,
      substantiveTitleOrBodyPresent,
      allegedSurfaceMateriallyRendered,
      anchors: data.anchors,
      bodyExcerpt: data.bodyText.slice(0, 1200)
    })
  });
}

module.exports = Object.freeze({
  detectEnvironmentChallenge
});