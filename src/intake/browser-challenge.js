"use strict";

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

async function detectEnvironmentChallenge(page) {
  const url = page.url();

  const data = await page.evaluate(() => {
    const title = (document.title || "").trim();
    const bodyText = (document.body ? document.body.innerText : "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    const html = document.documentElement ? document.documentElement.outerHTML : "";
    const anchors = Array.from(document.querySelectorAll("a[href]")).slice(0, 20).map((a) => ({
      text: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
      href: (a.getAttribute("href") || "").trim()
    }));

    return { title, bodyText, html, anchors };
  });

  const markers = [
    "cloudflare",
    "managed-challenge",
    "verify you are human",
    "checking your browser",
    "attention required",
    "challenge-platform",
    "cf-challenge",
    "/cdn-cgi/challenge-platform",
    "privacy pass"
  ];

  const urlLower = normalizeText(url);
  const titleLower = normalizeText(data.title);
  const bodyLower = normalizeText(data.bodyText);
  const htmlLower = normalizeText(data.html);

  const hitMarkers = markers.filter((marker) =>
    urlLower.includes(marker) ||
    titleLower.includes(marker) ||
    bodyLower.includes(marker) ||
    htmlLower.includes(marker)
  );

  return Object.freeze({
    challengeDetected: hitMarkers.length > 0,
    evidence: Object.freeze({
      url,
      title: data.title,
      hitMarkers,
      anchors: data.anchors,
      bodyExcerpt: data.bodyText.slice(0, 1200)
    })
  });
}

module.exports = Object.freeze({
  detectEnvironmentChallenge
});