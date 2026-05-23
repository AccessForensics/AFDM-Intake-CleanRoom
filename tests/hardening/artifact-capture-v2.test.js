"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PNG } = require("pngjs");

const {
  assertSafeChildPath,
  sha256Buffer,
  stitchPngChunks,
  writeFileAtomic,
  writeUtf8FileAtomic
} = require("../../src/intake/artifact-capture-v2.js");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "afdm-capture-v2-"));
}

function makePng(width, height, rgba) {
  const png = new PNG({ width, height });

  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = rgba[0];
    png.data[offset + 1] = rgba[1];
    png.data[offset + 2] = rgba[2];
    png.data[offset + 3] = rgba[3];
  }

  return PNG.sync.write(png);
}

test("Capture v2 path confinement blocks files outside artifact root", () => {
  const root = makeTempDir();
  const outside = path.join(root, "..", "outside.png");

  assert.throws(
    () => assertSafeChildPath(root, outside, "outside"),
    /CAPTURE_V2_PATH_ESCAPE_BLOCKED/
  );
});

test("Capture v2 atomic writer writes complete UTF-8 content", () => {
  const root = makeTempDir();
  const target = path.join(root, "atomic.txt");

  writeUtf8FileAtomic(target, "complete artifact\n");

  assert.equal(fs.readFileSync(target, "utf8"), "complete artifact\n");
  assert.equal(
    fs.readdirSync(root).filter((name) => name.endsWith(".tmp")).length,
    0
  );
});

test("Capture v2 stitches PNG chunks, validates hashes, crops bottom row, and records truncation", () => {
  const root = makeTempDir();
  const chunkAPath = path.join(root, "chunk-a.png");
  const chunkBPath = path.join(root, "chunk-b.png");
  const outputPath = path.join(root, "stitched.png");

  const chunkA = makePng(4, 2, [10, 20, 30, 255]);
  const chunkB = makePng(4, 3, [40, 50, 60, 255]);

  writeFileAtomic(chunkAPath, chunkA);
  writeFileAtomic(chunkBPath, chunkB);

  const result = stitchPngChunks({
    artifactsDir: root,
    outputImagePath: outputPath,
    viewportWidth: 4,
    pageHeight: 5,
    maxHeight: 3,
    chunks: [
      {
        id: 1,
        filePath: chunkAPath,
        targetY: 0,
        requestedScrollY: 0,
        actualScrollY: 0,
        cropTop: 0,
        targetHeight: 2,
        expectedSha256: sha256Buffer(chunkA)
      },
      {
        id: 2,
        filePath: chunkBPath,
        targetY: 2,
        requestedScrollY: 2,
        actualScrollY: 1,
        cropTop: 1,
        targetHeight: 1,
        expectedSha256: sha256Buffer(chunkB)
      }
    ]
  });

  assert.equal(result.screenshotTruncated, true);
  assert.equal(result.totalHeightCompiled, 3);
  assert.equal(result.verifiedChunks.length, 2);
  assert.match(result.terminalArtifactSha256, /^[a-f0-9]{64}$/);

  const stitched = PNG.sync.read(fs.readFileSync(outputPath));
  assert.equal(stitched.width, 4);
  assert.equal(stitched.height, 3);

  const rowBytes = stitched.width * 4;
  const thirdRowStart = rowBytes * 2;

  assert.equal(stitched.data[thirdRowStart], 40);
  assert.equal(stitched.data[thirdRowStart + 1], 50);
  assert.equal(stitched.data[thirdRowStart + 2], 60);
  assert.equal(stitched.data[thirdRowStart + 3], 255);
});

test("Capture v2 rejects mutated chunk bytes before stitching", () => {
  const root = makeTempDir();
  const chunkPath = path.join(root, "chunk.png");
  const outputPath = path.join(root, "stitched.png");
  const chunk = makePng(2, 2, [1, 2, 3, 255]);

  writeFileAtomic(chunkPath, chunk);

  assert.throws(
    () => stitchPngChunks({
      artifactsDir: root,
      outputImagePath: outputPath,
      viewportWidth: 2,
      pageHeight: 2,
      maxHeight: 2,
      chunks: [
        {
          id: 1,
          filePath: chunkPath,
          targetY: 0,
          requestedScrollY: 0,
          actualScrollY: 0,
          cropTop: 0,
          targetHeight: 2,
          expectedSha256: "0".repeat(64)
        }
      ]
    }),
    /CAPTURE_V2_CHUNK_HASH_MISMATCH/
  );
});

test("Capture v2 rejects chunk width drift", () => {
  const root = makeTempDir();
  const chunkPath = path.join(root, "chunk.png");
  const outputPath = path.join(root, "stitched.png");
  const chunk = makePng(3, 2, [1, 2, 3, 255]);

  writeFileAtomic(chunkPath, chunk);

  assert.throws(
    () => stitchPngChunks({
      artifactsDir: root,
      outputImagePath: outputPath,
      viewportWidth: 2,
      pageHeight: 2,
      maxHeight: 2,
      chunks: [
        {
          id: 1,
          filePath: chunkPath,
          targetY: 0,
          requestedScrollY: 0,
          actualScrollY: 0,
          cropTop: 0,
          targetHeight: 2,
          expectedSha256: sha256Buffer(chunk)
        }
      ]
    }),
    /CAPTURE_V2_CHUNK_WIDTH_MISMATCH/
  );
});

test("Capture v2 rejects target y drift", () => {
  const root = makeTempDir();
  const chunkPath = path.join(root, "chunk.png");
  const outputPath = path.join(root, "stitched.png");
  const chunk = makePng(2, 2, [1, 2, 3, 255]);

  writeFileAtomic(chunkPath, chunk);

  assert.throws(
    () => stitchPngChunks({
      artifactsDir: root,
      outputImagePath: outputPath,
      viewportWidth: 2,
      pageHeight: 2,
      maxHeight: 2,
      chunks: [
        {
          id: 1,
          filePath: chunkPath,
          targetY: 1,
          requestedScrollY: 0,
          actualScrollY: 0,
          cropTop: 0,
          targetHeight: 2,
          expectedSha256: sha256Buffer(chunk)
        }
      ]
    }),
    /CAPTURE_V2_CHUNK_TARGET_Y_DRIFT/
  );
});