$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$hadError = $false

try {
    $repoRoot = $PSScriptRoot
    Set-Location -LiteralPath $repoRoot

    function Invoke-Checked {
        param(
            [Parameter(Mandatory = $true)]
            [string] $Label,

            [Parameter(Mandatory = $true)]
            [string] $Command,

            [Parameter(Mandatory = $true)]
            [string[]] $Arguments
        )

        Write-Host ""
        Write-Host "=== $Label ==="
        & $Command @Arguments

        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE."
        }
    }

    Write-Host ""
    Write-Host "=== AFDM ZIP setup ==="
    Write-Host "Project root:"
    Write-Host $repoRoot

    if (-not (Test-Path -LiteralPath "package.json")) {
        throw "Missing package.json. Run this script from the extracted AFDM intake project root."
    }

    Write-Host ""
    Write-Host "=== ZIP or Git checkout check ==="

    if (Test-Path -LiteralPath ".git") {
        Write-Host "This folder has Git metadata."
    } else {
        Write-Host "No .git folder found. This is normal for a GitHub ZIP download."
        Write-Host "This folder can run local intake after dependencies are installed."
        Write-Host "Git pull, branch, commit, and PR commands will not work from this ZIP folder."
    }

    Write-Host ""
    Write-Host "=== Install local dependencies ==="

    if (Test-Path -LiteralPath "package-lock.json") {
        Invoke-Checked -Label "npm ci" -Command "npm.cmd" -Arguments @("ci")
    } else {
        Invoke-Checked -Label "npm install" -Command "npm.cmd" -Arguments @("install")
    }

    Write-Host ""
    Write-Host "=== Verify required modules resolve ==="
    Invoke-Checked -Label "Resolve pngjs" -Command "node.exe" -Arguments @("-e", "console.log(require.resolve('pngjs'))")
    Invoke-Checked -Label "Resolve playwright" -Command "node.exe" -Arguments @("-e", "console.log(require.resolve('playwright'))")

    Write-Host ""
    Write-Host "=== Syntax checks ==="

    $syntaxFiles = @(
        "src/intake/artifact-capture-v2.js",
        "tools/create-artifact-index.js",
        "tools/run-intake-batch.js",
        "tools/run-playwright-intake.js"
    )

    foreach ($file in $syntaxFiles) {
        if (Test-Path -LiteralPath $file) {
            Invoke-Checked -Label "node --check $file" -Command "node.exe" -Arguments @("--check", $file)
        } else {
            Write-Host "Skipping missing syntax file: $file"
        }
    }

    Write-Host ""
    Write-Host "=== Targeted tests ==="

    $targetedTests = @(
        "tests/hardening/artifact-capture-v2.test.js",
        "tests/hardening/artifact-index.test.js",
        "tests/hardening/batch-guardrails-node-exec.test.js"
    )

    foreach ($testFile in $targetedTests) {
        if (Test-Path -LiteralPath $testFile) {
            Invoke-Checked -Label "node --test $testFile" -Command "node.exe" -Arguments @("--test", $testFile)
        } else {
            Write-Host "Skipping missing targeted test: $testFile"
        }
    }

    Write-Host ""
    Write-Host "=== Guardrails ==="
    Invoke-Checked -Label "npm run guardrails" -Command "npm.cmd" -Arguments @("run", "guardrails")

    Write-Host ""
    Write-Host "=== Full test suite ==="
    Invoke-Checked -Label "npm test" -Command "npm.cmd" -Arguments @("test")

    Write-Host ""
    Write-Host "=== Prepare PDF intake folder ==="

    $incomingDir = Join-Path $repoRoot "intake_work\incoming_pdfs"
    New-Item -ItemType Directory -Force -Path $incomingDir | Out-Null

    Write-Host "Drop the next lawsuit PDF here:"
    Write-Host $incomingDir

    Write-Host ""
    Write-Host "Setup complete. This ZIP folder is dependency-ready and validated for local intake runs."
}
catch {
    $hadError = $true
    Write-Host ""
    Write-Host "ERROR:"
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Full error:"
    Write-Host $_
}

Write-Host ""
if ($hadError) {
    Write-Host "Stopped before completion. Fix the error above before running intake."
} else {
    Write-Host "Completed successfully."
}

Read-Host "Press Enter to close"
