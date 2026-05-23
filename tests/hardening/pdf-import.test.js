"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  hasPdfHeader,
  importPdfs,
  isPdfExtension,
  normalizeBaseName,
  sha256File
} = require("../../tools/import-lawsuit-pdfs.js");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "afdm-pdf-import-"));
}

function writePdf(filePath, bodyText) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `%PDF-1.7\n${bodyText}\n%%EOF\n`, "utf8");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

test("PDF import helpers normalize names and detect PDF extension/header", () => {
  assert.equal(normalizeBaseName("Case 001 - Complaint.pdf"), "CASE_001_COMPLAINT");
  assert.equal(normalizeBaseName("  ....pdf"), "PDF");
  assert.equal(isPdfExtension("Complaint.PDF"), true);
  assert.equal(isPdfExtension("Complaint.txt"), false);

  const root = makeTempDir();
  const pdfPath = path.join(root, "case.pdf");
  const textPath = path.join(root, "case.txt");

  writePdf(pdfPath, "fake body");
  fs.writeFileSync(textPath, "not pdf", "utf8");

  assert.equal(hasPdfHeader(pdfPath), true);
  assert.equal(hasPdfHeader(textPath), false);
});

test("PDF import stages valid PDFs with normalized hash-suffixed names and manifest rows", () => {
  const root = makeTempDir();
  const incomingDir = path.join(root, "incoming");
  const stagedDir = path.join(root, "lawsuit_pdfs");
  const rejectedDir = path.join(root, "rejected");
  const manifestPath = path.join(root, "manifest.json");

  const sourcePath = path.join(incomingDir, "Case 001 - Complaint.pdf");
  writePdf(sourcePath, "valid staged complaint");

  const expectedHash = sha256File(sourcePath);
  const manifest = importPdfs({ incomingDir, stagedDir, rejectedDir, manifestPath, move: false });

  assert.equal(manifest.counts.staged, 1);
  assert.equal(manifest.counts.rejected, 0);
  assert.equal(manifest.counts.skipped_duplicate, 0);

  const stagedName = manifest.rows[0].staged_file_name;
  assert.match(stagedName, /^CASE_001_COMPLAINT_[a-f0-9]{12}\.pdf$/);
  assert.equal(manifest.rows[0].sha256, expectedHash);
  assert.equal(fs.existsSync(path.join(stagedDir, stagedName)), true);
  assert.equal(fs.existsSync(sourcePath), true);
  assert.equal(fs.existsSync(manifestPath), true);
});

test("PDF import rejects non-PDF extension and missing PDF header", () => {
  const root = makeTempDir();
  const incomingDir = path.join(root, "incoming");
  const stagedDir = path.join(root, "lawsuit_pdfs");
  const rejectedDir = path.join(root, "rejected");
  const manifestPath = path.join(root, "manifest.json");

  fs.mkdirSync(incomingDir, { recursive: true });
  fs.writeFileSync(path.join(incomingDir, "notes.txt"), "%PDF-1.7\nfake but wrong extension\n", "utf8");
  fs.writeFileSync(path.join(incomingDir, "fake.pdf"), "not actually a pdf", "utf8");

  const manifest = importPdfs({ incomingDir, stagedDir, rejectedDir, manifestPath, move: false });

  assert.equal(manifest.counts.staged, 0);
  assert.equal(manifest.counts.rejected, 2);
  assert.equal(manifest.rows.some((row) => row.reason === "NOT_PDF_EXTENSION"), true);
  assert.equal(manifest.rows.some((row) => row.reason === "PDF_HEADER_MISSING"), true);
  assert.equal(fs.readdirSync(rejectedDir).some((name) => name.endsWith(".json")), true);
});

test("PDF import skips duplicate PDFs already staged by SHA-256", () => {
  const root = makeTempDir();
  const incomingDir = path.join(root, "incoming");
  const stagedDir = path.join(root, "lawsuit_pdfs");
  const rejectedDir = path.join(root, "rejected");
  const manifestPath = path.join(root, "manifest.json");

  const stagedExisting = path.join(stagedDir, "EXISTING.pdf");
  const incomingDuplicate = path.join(incomingDir, "duplicate.pdf");

  writePdf(stagedExisting, "same exact content");
  fs.mkdirSync(incomingDir, { recursive: true });
  fs.copyFileSync(stagedExisting, incomingDuplicate);

  const manifest = importPdfs({ incomingDir, stagedDir, rejectedDir, manifestPath, move: false });

  assert.equal(manifest.counts.staged, 0);
  assert.equal(manifest.counts.rejected, 0);
  assert.equal(manifest.counts.skipped_duplicate, 1);
  assert.equal(manifest.rows[0].status, "skipped_duplicate");
  assert.deepEqual(manifest.rows[0].duplicate_of, ["EXISTING.pdf"]);
});

test("PDF import move mode removes accepted source file", () => {
  const root = makeTempDir();
  const incomingDir = path.join(root, "incoming");
  const stagedDir = path.join(root, "lawsuit_pdfs");
  const rejectedDir = path.join(root, "rejected");
  const manifestPath = path.join(root, "manifest.json");

  const sourcePath = path.join(incomingDir, "move-me.pdf");
  writePdf(sourcePath, "move mode content");

  const manifest = importPdfs({ incomingDir, stagedDir, rejectedDir, manifestPath, move: true });

  assert.equal(manifest.counts.staged, 1);
  assert.equal(fs.existsSync(sourcePath), false);
  assert.equal(fs.existsSync(path.join(stagedDir, manifest.rows[0].staged_file_name)), true);
});

test("sha256 helper returns deterministic digest", () => {
  const root = makeTempDir();
  const filePath = path.join(root, "sample.pdf");
  const body = "%PDF-1.7\nsample\n%%EOF\n";
  fs.writeFileSync(filePath, body, "utf8");
  assert.equal(sha256File(filePath), sha256Text(body));
});
