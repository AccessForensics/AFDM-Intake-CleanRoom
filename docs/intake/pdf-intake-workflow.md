# PDF Intake Workflow

This workflow stages lawsuit PDFs for AFDM intake without OCR, allegation extraction, legal analysis, or automated claim interpretation.

## Folder layout

- `intake_work/incoming_pdfs/`, drop new lawsuit PDFs here.
- `intake_work/lawsuit_pdfs/`, validated and staged PDFs are copied or moved here.
- `intake_work/rejected_pdfs/`, rejected files and rejection records are written here.
- `intake_work/facts/`, human-reviewed facts JSON files live here.
- `intake_work/payloads/`, engine-ready payloads are generated here.
- `intake_work/out/`, intake execution output is written here.

## Import PDFs

Default copy mode:

```bash
npm run pdfs:import
```

Move mode:

```bash
npm run pdfs:import -- --move
```

Custom folders:

```bash
npm run pdfs:import -- --incoming ./somewhere/incoming --staged ./intake_work/lawsuit_pdfs
```

## What the importer does

The importer:

1. creates the workspace folders,
2. scans the incoming folder,
3. accepts only files with `.pdf` extension,
4. requires the `%PDF-` file header,
5. computes SHA-256 for accepted PDFs,
6. detects duplicates already staged by SHA-256,
7. writes normalized staged filenames using the source filename plus a hash suffix,
8. copies or moves accepted PDFs into `intake_work/lawsuit_pdfs/`,
9. writes rejected files and rejection JSON records into `intake_work/rejected_pdfs/`,
10. writes `intake_work/pdf_import_manifest.json`.

## What the importer does not do

The importer does not:

- OCR PDFs,
- extract allegations,
- summarize complaints,
- infer defendants,
- infer websites,
- create run units,
- execute Playwright,
- classify claims,
- create external determinations.

## Next steps after import

After PDFs are staged:

```bash
npm run facts:new -- --matter CASE-001 --pdf STAGED_FILE_NAME.pdf --site example.com
```

Then edit the reviewed facts JSON manually.

Then generate engine-ready payloads:

```bash
npm run prep:payloads
```

Then run batch intake:

```bash
npm run batch:intake
```
