"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const DEFAULT_MAX_CAPTURE_HEIGHT_PX = 20000;
const DEFAULT_SCROLL_SETTLE_MS = 150;
const DEFAULT_MAX_GEOMETRY_ELEMENTS = 2000;

function normalizeForPathCompare(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function assertSafeChildPath(rootDir, candidatePath, label) {
  if (!rootDir || !candidatePath) {
    throw new Error(`CAPTURE_V2_PATH_REQUIRED: ${label}`);
  }

  const root = normalizeForPathCompare(rootDir);
  const candidate = normalizeForPathCompare(candidatePath);

  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error(`CAPTURE_V2_PATH_ESCAPE_BLOCKED: ${label}`);
  }

  return path.resolve(candidatePath);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fsyncDirectoryBestEffort(dirPath) {
  if (process.platform === "win32") {
    return;
  }

  let fd = null;
  try {
    fd = fs.openSync(dirPath, "r");
    fs.fsyncSync(fd);
  } catch (_error) {
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (_error) {
      }
    }
  }
}

function writeFileAtomic(targetPath, data, options) {
  const dir = path.dirname(targetPath);
  ensureDirectory(dir);

  const tempName = `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  const tempPath = path.join(dir, tempName);

  let fd = null;
  try {
    fd = fs.openSync(tempPath, "wx");

    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(fd, data);
    } else {
      fs.writeFileSync(fd, String(data), options || { encoding: "utf8" });
    }

    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    fs.renameSync(tempPath, targetPath);
    fsyncDirectoryBestEffort(dir);
  } catch (error) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (_closeError) {
      }
    }

    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_unlinkError) {
    }

    throw error;
  }
}

function writeUtf8FileAtomic(targetPath, text) {
  writeFileAtomic(targetPath, text, { encoding: "utf8" });
}

function writeJsonFileAtomic(targetPath, value) {
  writeUtf8FileAtomic(targetPath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function readPngWithHash(filePath, expectedSha256) {
  const bytes = fs.readFileSync(filePath);
  const actualSha256 = sha256Buffer(bytes);

  if (expectedSha256 && actualSha256 !== expectedSha256) {
    throw new Error(`CAPTURE_V2_CHUNK_HASH_MISMATCH: ${path.basename(filePath)}`);
  }

  return {
    png: PNG.sync.read(bytes),
    actualSha256
  };
}

function stitchPngChunks(options) {
  const artifactsDir = path.resolve(options.artifactsDir);
  const outputImagePath = assertSafeChildPath(artifactsDir, options.outputImagePath, "outputImagePath");
  const viewportWidth = options.viewportWidth;
  const maxHeight = options.maxHeight;
  const pageHeight = options.pageHeight;
  const chunks = Array.isArray(options.chunks) ? options.chunks : [];

  if (!Number.isInteger(viewportWidth) || viewportWidth <= 0) {
    throw new Error("CAPTURE_V2_INVALID_VIEWPORT_WIDTH");
  }

  if (!Number.isInteger(maxHeight) || maxHeight <= 0) {
    throw new Error("CAPTURE_V2_INVALID_MAX_HEIGHT");
  }

  if (!Number.isInteger(pageHeight) || pageHeight <= 0) {
    throw new Error("CAPTURE_V2_INVALID_PAGE_HEIGHT");
  }

  if (!chunks.length) {
    throw new Error("CAPTURE_V2_NO_CHUNKS_TO_STITCH");
  }

  const compiledHeight = Math.min(pageHeight, maxHeight);
  const targetPng = new PNG({
    width: viewportWidth,
    height: compiledHeight
  });

  const rowBytes = viewportWidth * 4;
  let expectedTargetY = 0;
  const verifiedChunks = [];

  for (const chunk of chunks) {
    if (expectedTargetY >= compiledHeight) {
      break;
    }

    const chunkPath = assertSafeChildPath(artifactsDir, chunk.filePath, `chunk:${chunk.id || "unknown"}`);
    const expectedSha256 = String(chunk.expectedSha256 || "");
    const readResult = readPngWithHash(chunkPath, expectedSha256);
    const sourcePng = readResult.png;

    if (sourcePng.width !== viewportWidth) {
      throw new Error(`CAPTURE_V2_CHUNK_WIDTH_MISMATCH: ${path.basename(chunkPath)}`);
    }

    if (!Number.isInteger(chunk.targetY) || chunk.targetY !== expectedTargetY) {
      throw new Error(`CAPTURE_V2_CHUNK_TARGET_Y_DRIFT: ${path.basename(chunkPath)}`);
    }

    if (!Number.isInteger(chunk.cropTop) || chunk.cropTop < 0) {
      throw new Error(`CAPTURE_V2_CHUNK_CROP_TOP_INVALID: ${path.basename(chunkPath)}`);
    }

    if (!Number.isInteger(chunk.targetHeight) || chunk.targetHeight <= 0) {
      throw new Error(`CAPTURE_V2_CHUNK_TARGET_HEIGHT_INVALID: ${path.basename(chunkPath)}`);
    }

    const rowsToCopy = Math.min(
      chunk.targetHeight,
      compiledHeight - expectedTargetY
    );

    if (chunk.cropTop + rowsToCopy > sourcePng.height) {
      throw new Error(`CAPTURE_V2_CHUNK_CROP_EXCEEDS_SOURCE: ${path.basename(chunkPath)}`);
    }

    for (let sourceY = 0; sourceY < rowsToCopy; sourceY += 1) {
      const sourceStart = (chunk.cropTop + sourceY) * rowBytes;
      const sourceEnd = sourceStart + rowBytes;
      const targetStart = (expectedTargetY + sourceY) * rowBytes;
      sourcePng.data.copy(targetPng.data, targetStart, sourceStart, sourceEnd);
    }

    verifiedChunks.push({
      id: chunk.id,
      file_path: path.relative(artifactsDir, chunkPath),
      target_y: chunk.targetY,
      requested_scroll_y: chunk.requestedScrollY,
      actual_scroll_y: chunk.actualScrollY,
      crop_top: chunk.cropTop,
      source_height: sourcePng.height,
      target_height: rowsToCopy,
      sha256: readResult.actualSha256
    });

    expectedTargetY += rowsToCopy;
  }

  if (expectedTargetY !== compiledHeight) {
    throw new Error(`CAPTURE_V2_STITCH_HEIGHT_INCOMPLETE: expected ${compiledHeight}, got ${expectedTargetY}`);
  }

  const outputBuffer = PNG.sync.write(targetPng);
  writeFileAtomic(outputImagePath, outputBuffer);

  return {
    outputImagePath,
    terminalArtifactSha256: sha256File(outputImagePath),
    screenshotTruncated: pageHeight > maxHeight,
    totalHeightCompiled: compiledHeight,
    verifiedChunks
  };
}

async function getPageCaptureMetrics(page) {
  const viewport = page.viewportSize();
  if (!viewport || !Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)) {
    throw new Error("CAPTURE_V2_VIEWPORT_REQUIRED");
  }

  const metrics = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;

    const scrollWidth = Math.max(
      documentElement ? documentElement.scrollWidth : 0,
      body ? body.scrollWidth : 0,
      documentElement ? documentElement.clientWidth : 0
    );

    const scrollHeight = Math.max(
      documentElement ? documentElement.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      documentElement ? documentElement.clientHeight : 0
    );

    return {
      scrollWidth,
      scrollHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  });

  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    pageScrollWidth: Math.max(metrics.scrollWidth, viewport.width),
    pageScrollHeight: Math.max(metrics.scrollHeight, viewport.height),
    devicePixelRatio: metrics.devicePixelRatio
  };
}

function assertRuntimeInvariants(metrics, expectedContext) {
  if (!expectedContext) {
    return;
  }

  if (expectedContext.viewport && Number.isInteger(expectedContext.viewport.width)) {
    if (metrics.viewportWidth !== expectedContext.viewport.width) {
      throw new Error(`CAPTURE_V2_VIEWPORT_WIDTH_INVARIANT_FAILED: expected ${expectedContext.viewport.width}, got ${metrics.viewportWidth}`);
    }
  }

  if (expectedContext.viewport && Number.isInteger(expectedContext.viewport.height)) {
    if (metrics.viewportHeight !== expectedContext.viewport.height) {
      throw new Error(`CAPTURE_V2_VIEWPORT_HEIGHT_INVARIANT_FAILED: expected ${expectedContext.viewport.height}, got ${metrics.viewportHeight}`);
    }
  }

  if (Number.isFinite(expectedContext.deviceScaleFactor)) {
    if (Number(metrics.devicePixelRatio) !== Number(expectedContext.deviceScaleFactor)) {
      throw new Error(`CAPTURE_V2_DPR_INVARIANT_FAILED: expected ${expectedContext.deviceScaleFactor}, got ${metrics.devicePixelRatio}`);
    }
  }
}

async function captureElementGeometrySnapshot(page, options) {
  const maxHeight = options.maxHeight;
  const maxElements = options.maxElements || DEFAULT_MAX_GEOMETRY_ELEMENTS;

  try {
    const result = await page.evaluate(({ maxHeightPx, maxElementCount }) => {
      const selectorList = [
        "a",
        "button",
        "input",
        "select",
        "textarea",
        "label",
        "form",
        "img",
        "svg",
        "canvas",
        "details",
        "summary",
        "dialog",
        "nav",
        "main",
        "header",
        "footer",
        "section",
        "article",
        "aside",
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "li",
        "table",
        "tr",
        "td",
        "th"
      ];

      function escapeCss(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
          return window.CSS.escape(value);
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
      }

      function stableSelectorFor(element) {
        if (!element || !element.tagName) {
          return "";
        }

        const tag = element.tagName.toLowerCase();

        if (element.id) {
          return `#${escapeCss(element.id)}`;
        }

        const name = element.getAttribute("name");
        if (name) {
          const candidate = `${tag}[name="${escapeCss(name)}"]`;
          const rootNode = element.getRootNode && element.getRootNode();
          const root = rootNode && rootNode.querySelectorAll ? rootNode : document;
          const matches = root.querySelectorAll(candidate);
          if (matches.length === 1) {
            return candidate;
          }
        }

        const ariaLabel = element.getAttribute("aria-label");
        if (ariaLabel) {
          const candidate = `${tag}[aria-label="${escapeCss(ariaLabel)}"]`;
          const rootNode = element.getRootNode && element.getRootNode();
          const root = rootNode && rootNode.querySelectorAll ? rootNode : document;
          const matches = root.querySelectorAll(candidate);
          if (matches.length === 1) {
            return candidate;
          }
        }

        const parts = [];
        let current = element;
        let depth = 0;

        while (current && current.nodeType === Node.ELEMENT_NODE && depth < 6) {
          let part = current.tagName.toLowerCase();

          if (current.id) {
            part += `#${escapeCss(current.id)}`;
            parts.unshift(part);
            break;
          }

          let siblingIndex = 1;
          let sibling = current.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === current.tagName) {
              siblingIndex += 1;
            }
            sibling = sibling.previousElementSibling;
          }

          part += `:nth-of-type(${siblingIndex})`;
          parts.unshift(part);
          current = current.parentElement;
          depth += 1;
        }

        return parts.join(" > ");
      }

      function isVisible(element) {
        if (!element || !element.getBoundingClientRect) {
          return false;
        }

        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.contentVisibility === "hidden" ||
          Number(style.opacity) === 0
        ) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function collectCandidates(root, output, seen) {
        if (!root || !root.querySelectorAll) {
          return;
        }

        const localCandidates = Array.from(root.querySelectorAll(selectorList.join(",")));
        for (const element of localCandidates) {
          if (!seen.has(element)) {
            seen.add(element);
            output.push(element);
          }
        }

        const allElements = Array.from(root.querySelectorAll("*"));
        for (const element of allElements) {
          if (element.shadowRoot) {
            collectCandidates(element.shadowRoot, output, seen);
          }
        }
      }

      const candidates = [];
      collectCandidates(document, candidates, new Set());

      const elements = [];

      for (const element of candidates) {
        if (elements.length >= maxElementCount) {
          break;
        }

        if (!isVisible(element)) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const top = Math.round(rect.top + (window.scrollY || window.pageYOffset || 0));
        const left = Math.round(rect.left + (window.scrollX || window.pageXOffset || 0));

        if (top < 0 || left < 0 || top > maxHeightPx) {
          continue;
        }

        const role = element.getAttribute("role") || "";
        const ariaLabel = element.getAttribute("aria-label") || "";
        const inputType = element.tagName.toLowerCase() === "input"
          ? String(element.getAttribute("type") || "text").toLowerCase()
          : "";

        const rootNode = element.getRootNode && element.getRootNode();
        const insideShadowRoot = rootNode && rootNode.toString && String(rootNode) === "[object ShadowRoot]";

        elements.push({
          selector: stableSelectorFor(element),
          tag_name: element.tagName.toLowerCase(),
          role,
          aria_label: ariaLabel.slice(0, 120),
          input_type: inputType,
          text_sample: String(element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
          bounding_box: {
            left,
            top,
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          is_clickable: window.getComputedStyle(element).cursor === "pointer",
          inside_shadow_root: insideShadowRoot === true
        });
      }

      return {
        captured: true,
        element_count: elements.length,
        browser_width: window.innerWidth,
        browser_height: window.innerHeight,
        scroll_y: window.scrollY || window.pageYOffset || 0,
        shadow_dom_traversal_enabled: true,
        elements
      };
    }, {
      maxHeightPx: maxHeight,
      maxElementCount: maxElements
    });

    return result;
  } catch (error) {
    return {
      captured: false,
      error: String((error && error.stack) || error)
    };
  }
}

async function captureScreenshotArtifactsV2(page, options) {
  const artifactsDir = path.resolve(options.artifactsDir);
  const prefix = String(options.prefix || "").replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!prefix) {
    throw new Error("CAPTURE_V2_PREFIX_REQUIRED");
  }

  ensureDirectory(artifactsDir);

  const maxHeight = Number.isInteger(options.maxHeight)
    ? options.maxHeight
    : DEFAULT_MAX_CAPTURE_HEIGHT_PX;

  const scrollSettleMs = Number.isInteger(options.scrollSettleMs)
    ? options.scrollSettleMs
    : DEFAULT_SCROLL_SETTLE_MS;

  const expectedContext = options.expectedContext || null;
  const metrics = await getPageCaptureMetrics(page);
  assertRuntimeInvariants(metrics, expectedContext);

  const compiledHeight = Math.min(metrics.pageScrollHeight, maxHeight);
  const maxScrollY = Math.max(0, metrics.pageScrollHeight - metrics.viewportHeight);

  const chunkDir = assertSafeChildPath(artifactsDir, path.join(artifactsDir, `${prefix}_chunks`), "chunkDir");
  ensureDirectory(chunkDir);

  const chunks = [];
  let targetY = 0;
  let index = 0;

  while (targetY < compiledHeight) {
    index += 1;

    const requestedScrollY = Math.min(targetY, maxScrollY);

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, requestedScrollY);

    await page.waitForTimeout(scrollSettleMs);

    const actualScrollY = Math.round(await page.evaluate(() => window.scrollY || window.pageYOffset || 0));
    const cropTop = targetY - actualScrollY;

    if (cropTop < 0 || cropTop >= metrics.viewportHeight) {
      throw new Error(`CAPTURE_V2_SCROLL_ALIGNMENT_FAILED: targetY=${targetY}; actualScrollY=${actualScrollY}; cropTop=${cropTop}`);
    }

    const targetHeight = Math.min(
      metrics.viewportHeight - cropTop,
      compiledHeight - targetY
    );

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      scale: "css"
    });

    const chunkFileName = `${String(index).padStart(4, "0")}_${prefix}_y${String(targetY).padStart(6, "0")}.png`;
    const chunkPath = assertSafeChildPath(artifactsDir, path.join(chunkDir, chunkFileName), `chunk:${index}`);
    writeFileAtomic(chunkPath, buffer);

    const expectedSha256 = sha256File(chunkPath);

    chunks.push({
      id: index,
      filePath: chunkPath,
      file_path: path.relative(artifactsDir, chunkPath),
      targetY,
      requestedScrollY,
      actualScrollY,
      cropTop,
      sourceHeight: metrics.viewportHeight,
      targetHeight,
      expectedSha256
    });

    targetY += targetHeight;
  }

  const pngPath = assertSafeChildPath(artifactsDir, path.join(artifactsDir, `${prefix}.png`), "pngPath");
  const stitchResult = stitchPngChunks({
    artifactsDir,
    outputImagePath: pngPath,
    viewportWidth: metrics.viewportWidth,
    pageHeight: metrics.pageScrollHeight,
    maxHeight,
    chunks
  });

  const geometry = await captureElementGeometrySnapshot(page, {
    maxHeight,
    maxElements: DEFAULT_MAX_GEOMETRY_ELEMENTS
  });

  const elementGeometryPath = assertSafeChildPath(artifactsDir, path.join(artifactsDir, `${prefix}.elements.json`), "elementGeometryPath");
  writeJsonFileAtomic(elementGeometryPath, geometry);

  const runtimeInvariants = {
    viewport_width: metrics.viewportWidth,
    viewport_height: metrics.viewportHeight,
    device_scale_factor: metrics.devicePixelRatio,
    expected_viewport_width: expectedContext && expectedContext.viewport ? expectedContext.viewport.width : null,
    expected_viewport_height: expectedContext && expectedContext.viewport ? expectedContext.viewport.height : null,
    expected_device_scale_factor: expectedContext ? expectedContext.deviceScaleFactor : null,
    is_mobile: expectedContext ? expectedContext.isMobile === true : null,
    has_touch: expectedContext ? expectedContext.hasTouch === true : null,
    bypass_csp: false,
    ignore_https_errors: false,
    screenshot_scale: "css",
    cache_state: "ephemeral_context_per_run"
  };

  const metadata = {
    capture_version: "AFDM_CAPTURE_V2",
    compression_format: "PNG",
    screenshot_scale: "css",
    screenshot_truncated: stitchResult.screenshotTruncated,
    max_height_threshold_px: maxHeight,
    page_scroll_width_px: metrics.pageScrollWidth,
    page_scroll_height_px: metrics.pageScrollHeight,
    total_height_compiled_px: stitchResult.totalHeightCompiled,
    runtime_viewport: {
      width: metrics.viewportWidth,
      height: metrics.viewportHeight,
      device_pixel_ratio: metrics.devicePixelRatio
    },
    runtime_invariants: runtimeInvariants,
    terminal_artifact: {
      file_path: path.relative(artifactsDir, stitchResult.outputImagePath),
      sha256: stitchResult.terminalArtifactSha256
    },
    element_geometry: {
      file_path: path.relative(artifactsDir, elementGeometryPath),
      captured: geometry.captured === true,
      element_count: Number.isInteger(geometry.element_count) ? geometry.element_count : 0,
      shadow_dom_traversal_enabled: geometry.shadow_dom_traversal_enabled === true
    },
    chunks: stitchResult.verifiedChunks
  };

  const metadataPath = assertSafeChildPath(artifactsDir, path.join(artifactsDir, `${prefix}.capture-v2.json`), "metadataPath");
  const manifestPath = assertSafeChildPath(artifactsDir, path.join(artifactsDir, `${prefix}.capture-v2-manifest.json`), "manifestPath");

  writeJsonFileAtomic(metadataPath, metadata);
  writeJsonFileAtomic(manifestPath, {
    capture_version: metadata.capture_version,
    artifacts_root: artifactsDir,
    chunk_root: path.relative(artifactsDir, chunkDir),
    runtime_viewport: metadata.runtime_viewport,
    runtime_invariants: runtimeInvariants,
    constraints: {
      max_height_threshold_px: maxHeight,
      compression_format: "PNG",
      screenshot_scale: "css"
    },
    captured_chunks: chunks.map((chunk) => ({
      id: chunk.id,
      file_path: path.relative(artifactsDir, chunk.filePath),
      target_y: chunk.targetY,
      requested_scroll_y: chunk.requestedScrollY,
      actual_scroll_y: chunk.actualScrollY,
      crop_top: chunk.cropTop,
      source_height: chunk.sourceHeight,
      target_height: chunk.targetHeight,
      expected_sha256: chunk.expectedSha256
    }))
  });

  return {
    pngPath,
    metadataPath,
    manifestPath,
    elementGeometryPath,
    terminalArtifactSha256: stitchResult.terminalArtifactSha256,
    screenshotTruncated: stitchResult.screenshotTruncated
  };
}

module.exports = Object.freeze({
  assertSafeChildPath,
  captureElementGeometrySnapshot,
  captureScreenshotArtifactsV2,
  sha256Buffer,
  sha256File,
  stitchPngChunks,
  writeFileAtomic,
  writeJsonFileAtomic,
  writeUtf8FileAtomic
});