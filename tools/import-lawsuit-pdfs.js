"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_INCOMING_DIR = path.join(process.cwd(), "intake_work", "incoming_pdfs");
const DEFAULT_STAGED_DIR = path.join(process.cwd(), "intake_work", "lawsuit_pdfs");
const DEFAULT_REJECTED_DIR = path.join(process.cwd(), "intake_work", "rejected_pdfs");
const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), "intake_work", "pdf_import_manifest.json");

function parseArgs(argv) {
  const args = {
    incomingDir: DEFAULT_INCOMING_DIR,
    stagedDir: DEFAULT_STAGED_DIR,
    rejectedDir: DEFAULT_REJECTED_DIR,
    manifestPath: DEFAULT_MANIFEST_PATH,
    move: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--incoming" || value === "--staged" || value === "--rejected" || value === "--manifest") {
      index += 1;
      if (!argv[index]) {
        throw new Error(`MISSING_VALUE_FOR_${value}`);
      }
      const resolved = path.resolve(argv[index]);
      if (value === "--incoming") args.incomingDir = resolved;
      if (value === "--staged") args.stagedDir = resolved;
      if (value === "--rejected") args.rejectedDir = resolved;
      if (value === "--manifest") args.manifestPath = resolved;
    } else if (value === "--move") {
      args.move = true;
    } else if (value === "--copy") {
      args.move = false;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      throw new Error(`UNKNOWN_ARGUMENT: ${value}`);
    }
  }

  return args;
}

function printHelp() {
  console.log("Usage: npm run pdfs:import -- [--incoming <dir>] [--staged <dir>] [--rejected <dir>] [--manifest <path>] [--copy|--move]");
  console.log("This tool stages PDF files only. It does not parse, OCR, summarize, or classify claims.");
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function isPdfExtension(fileName) {
  return path.extname(fileName).toLowerCase() === ".pdf";
}

function hasPdfHeader(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(5);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return bytesRead === 5 && buffer.toString("ascii") === "%PDF-";
  } finally {
    fs.closeSync(fd);
  }
}

function normalizeBaseName(fileName) {
  const parsed = path.parse(fileName);
  const base = String(parsed.name || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return base || "PDF";
}

function writeJsonFileAtomic(targetPath, value) {
  ensureDirectory(path.dirname(targetPath));
  const tempPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  let fd = null;
  try {
    fd = fs.openSync(tempPath, "wx");
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tempPath, targetPath);
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_error) {}
    }
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_error) {}
    throw error;
  }
}

function makeUniquePath(dirPath, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(dirPath, fileName);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dirPath, `${parsed.name}_${counter}${parsed.ext}`);
    counter += 1;
  }
  return candidate;
}

function shouldIgnoreIncomingFile(fileName) {
  const baseName = path.basename(fileName);

  return (
    baseName === ".gitkeep" ||
    baseName === ".DS_Store" ||
    baseName === "Thumbs.db" ||
    baseName.startsWith(".")
  );
}

function collectExistingHashes(stagedDir) {
  const hashes = new Map();
  if (!fs.existsSync(stagedDir)) return hashes;
  for (const fileName of fs.readdirSync(stagedDir).sort()) {
    const fullPath = path.join(stagedDir, fileName);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || !isPdfExtension(fileName) || !hasPdfHeader(fullPath)) continue;
    const hash = sha256File(fullPath);
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(fileName);
  }
  return hashes;
}

function rejectFile(sourcePath, rejectedDir, reason, details) {
  const sourceName = path.basename(sourcePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = path.extname(sourceName).toLowerCase() || ".rejected";
  const rejectedName = `${timestamp}_${normalizeBaseName(sourceName)}_${reason}${extension}`;
  const rejectedPath = makeUniquePath(rejectedDir, rejectedName);
  ensureDirectory(rejectedDir);
  fs.copyFileSync(sourcePath, rejectedPath);
  writeJsonFileAtomic(`${rejectedPath}.json`, {
    rejected_at_utc: new Date().toISOString(),
    source_file_name: sourceName,
    rejected_file_name: path.basename(rejectedPath),
    reason,
    details: details || {}
  });
  return { status: "rejected", source_file_name: sourceName, rejected_file_name: path.basename(rejectedPath), reason, details: details || {} };
}

function importPdfs(options) {
  ensureDirectory(options.incomingDir);
  ensureDirectory(options.stagedDir);
  ensureDirectory(options.rejectedDir);
  ensureDirectory(path.dirname(options.manifestPath));

  const existingHashes = collectExistingHashes(options.stagedDir);
  const rows = [];
  let staged = 0;
  let rejected = 0;
  let skippedDuplicate = 0;

  for (const sourceName of fs.readdirSync(options.incomingDir).sort()) {
    if (shouldIgnoreIncomingFile(sourceName)) continue;
    const sourcePath = path.join(options.incomingDir, sourceName);
    const stat = fs.statSync(sourcePath);
    if (!stat.isFile()) continue;

    if (!isPdfExtension(sourceName)) {
      rejected += 1;
      rows.push(rejectFile(sourcePath, options.rejectedDir, "NOT_PDF_EXTENSION", { extension: path.extname(sourceName) }));
      continue;
    }
    if (stat.size === 0) {
      rejected += 1;
      rows.push(rejectFile(sourcePath, options.rejectedDir, "EMPTY_FILE", { size_bytes: stat.size }));
      continue;
    }
    if (!hasPdfHeader(sourcePath)) {
      rejected += 1;
      rows.push(rejectFile(sourcePath, options.rejectedDir, "PDF_HEADER_MISSING", { size_bytes: stat.size }));
      continue;
    }

    const hash = sha256File(sourcePath);
    if (existingHashes.has(hash)) {
      skippedDuplicate += 1;
      rows.push({ status: "skipped_duplicate", source_file_name: sourceName, sha256: hash, duplicate_of: existingHashes.get(hash), size_bytes: stat.size });
      continue;
    }

    const stagedName = `${normalizeBaseName(sourceName)}_${hash.slice(0, 12)}.pdf`;
    const stagedPath = makeUniquePath(options.stagedDir, stagedName);
    if (options.move) fs.renameSync(sourcePath, stagedPath);
    else fs.copyFileSync(sourcePath, stagedPath, fs.constants.COPYFILE_EXCL);
    existingHashes.set(hash, [path.basename(stagedPath)]);
    staged += 1;
    rows.push({ status: "staged", source_file_name: sourceName, staged_file_name: path.basename(stagedPath), sha256: hash, size_bytes: stat.size, mode: options.move ? "move" : "copy" });
  }

  const manifest = {
    manifest_version: "AFDM_PDF_IMPORT_V1",
    generated_at_utc: new Date().toISOString(),
    incoming_dir: options.incomingDir,
    staged_dir: options.stagedDir,
    rejected_dir: options.rejectedDir,
    mode: options.move ? "move" : "copy",
    counts: { staged, rejected, skipped_duplicate: skippedDuplicate, total_rows: rows.length },
    rows
  };
  writeJsonFileAtomic(options.manifestPath, manifest);
  return manifest;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const manifest = importPdfs(args);
  console.log("PDF import complete.");
  console.log(`Staged: ${manifest.counts.staged}`);
  console.log(`Rejected: ${manifest.counts.rejected}`);
  console.log(`Skipped duplicates: ${manifest.counts.skipped_duplicate}`);
  console.log(`Manifest: ${args.manifestPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("PDF import failed.");
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ hasPdfHeader, importPdfs, isPdfExtension, normalizeBaseName, sha256File });
