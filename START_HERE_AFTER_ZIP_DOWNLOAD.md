# Start Here After ZIP Download

Use this file when you downloaded the project from GitHub using **Code > Download ZIP**.

## Why this setup step is required

A GitHub ZIP download contains source files only.

It does not include:

- `node_modules`
- `.git`
- installed npm packages
- local dependency cache
- Git branch history
- pull request metadata

That means a fresh ZIP folder cannot run intake until dependencies are installed.

## Required setup for each fresh ZIP folder

Open PowerShell in the project root and run:

```powershell
.\START_HERE_AFTER_ZIP_DOWNLOAD.ps1
```

The setup script will:

1. Confirm the folder contains `package.json`.
2. Install local dependencies using `npm ci` when `package-lock.json` exists, otherwise `npm install`.
3. Verify `pngjs` resolves.
4. Verify `playwright` resolves.
5. Run syntax checks on key tools.
6. Run targeted Capture v2 and artifact-index tests.
7. Run guardrails.
8. Run the full test suite.
9. Create the PDF intake drop folder.

## Where to drop lawsuit PDFs

After the setup script passes, drop lawsuit PDFs here:

```text
intake_work\incoming_pdfs
```

Do not start a new lawsuit intake from a fresh ZIP folder until this setup script passes.

## Important Git note

A ZIP folder is not a Git checkout.

Git commands like these will not work inside a ZIP folder unless it was cloned with Git:

```text
git pull
git branch
git commit
git push
```

For repo changes, use a real Git clone.

For local lawsuit intake runs, a ZIP folder is fine after this setup script passes.
