$ErrorActionPreference = "Stop"

# ============================================================
# COOLINK PRODUCTION DATABASE BACKUP
# PostgreSQL CLI 18.x
#
# READ-ONLY against production database.
# Creates local backup files only.
#
# DOES NOT:
# - run migrations
# - run baseline
# - deploy application
# - change RLS
# - modify production data
# ============================================================

# ------------------------------------------------------------
# PostgreSQL tools
# ------------------------------------------------------------

$pgBin = "C:\Program Files\PostgreSQL\18\bin"

$pgDump    = Join-Path $pgBin "pg_dump.exe"
$pgDumpAll = Join-Path $pgBin "pg_dumpall.exe"
$pgRestore = Join-Path $pgBin "pg_restore.exe"
$psql      = Join-Path $pgBin "psql.exe"

foreach ($tool in @($pgDump, $pgDumpAll, $pgRestore, $psql)) {
    if (-not (Test-Path $tool)) {
        throw "STOP: PostgreSQL tool not found: $tool"
    }
}

Write-Host ""
Write-Host "PostgreSQL tools: OK"

# ------------------------------------------------------------
# Check project directory
# ------------------------------------------------------------

if (-not (Test-Path ".env")) {
    throw "STOP: .env not found. Run this script from the CoolInk project root."
}

# ------------------------------------------------------------
# Read .env
# ------------------------------------------------------------

$cfg = @{}

Get-Content ".env" | ForEach-Object {

    $line = $_.Trim()

    if (
        $line -and
        -not $line.StartsWith("#") -and
        $line -match '^([^=]+)=(.*)$'
    ) {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $cfg[$key] = $value
    }
}

if (-not $cfg.ContainsKey("DIRECT_URL")) {
    throw "STOP: DIRECT_URL is missing from .env."
}

$directUrl = $cfg["DIRECT_URL"]

# ------------------------------------------------------------
# Hard safety check: expected CoolInk production DB only
# ------------------------------------------------------------

$expectedProductionHost = "db.kqqqhasawqodikpzjemy.supabase.co"

if ($directUrl -notmatch [regex]::Escape($expectedProductionHost)) {
    throw "STOP: DIRECT_URL does not point to expected CoolInk production database."
}

Write-Host "Production database host: verified"

# ------------------------------------------------------------
# Parse PostgreSQL URI
# ------------------------------------------------------------

try {
    $dbUri = [uri]$directUrl
}
catch {
    throw "STOP: DIRECT_URL is not a valid PostgreSQL URI."
}

if (-not $dbUri.UserInfo) {
    throw "STOP: DIRECT_URL does not contain database credentials."
}

$separatorIndex = $dbUri.UserInfo.IndexOf(":")

if ($separatorIndex -lt 1) {
    throw "STOP: Could not parse username/password from DIRECT_URL."
}

$encodedUser = $dbUri.UserInfo.Substring(0, $separatorIndex)
$encodedPassword = $dbUri.UserInfo.Substring($separatorIndex + 1)

$pgUser = [uri]::UnescapeDataString($encodedUser)
$pgPassword = [uri]::UnescapeDataString($encodedPassword)

$pgDatabase = $dbUri.AbsolutePath.TrimStart("/")

if (-not $pgDatabase) {
    $pgDatabase = "postgres"
}

$pgPort = $dbUri.Port

if ($pgPort -le 0) {
    $pgPort = 5432
}

# ------------------------------------------------------------
# PostgreSQL environment variables
# ------------------------------------------------------------

$env:PGHOST = $dbUri.Host
$env:PGPORT = $pgPort.ToString()
$env:PGDATABASE = $pgDatabase
$env:PGUSER = $pgUser
$env:PGPASSWORD = $pgPassword
$env:PGSSLMODE = "require"

# ------------------------------------------------------------
# Backup directory outside Git repository
# ------------------------------------------------------------

$backupRoot = Join-Path $env:USERPROFILE "CoolInkBackups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupRoot "production-$stamp"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host ""
Write-Host "Backup directory:"
Write-Host $backupDir
Write-Host ""

# ------------------------------------------------------------
# Helper
# ------------------------------------------------------------

function Assert-LastExitCode {
    param(
        [string]$Name
    )

    if ($LASTEXITCODE -ne 0) {
        throw "STOP: '$Name' failed. Exit code: $LASTEXITCODE"
    }
}

# ============================================================
# 1. CREATE READ-ONLY SQL FILES
# ============================================================

$connectionSqlFile = Join-Path $backupDir "_connection-test.sql"
$countsSqlFile = Join-Path $backupDir "_record-counts.sql"

$connectionSql = @'
SELECT current_database() || '|' || current_user;
'@

$countsSql = @'
SELECT 'Client=' || count(*) FROM public."Client"
UNION ALL
SELECT 'TattooProject=' || count(*) FROM public."TattooProject"
UNION ALL
SELECT 'Appointment=' || count(*) FROM public."Appointment"
UNION ALL
SELECT 'Promotion=' || count(*) FROM public."Promotion";
'@

$connectionSql | Set-Content -Encoding ASCII $connectionSqlFile
$countsSql | Set-Content -Encoding ASCII $countsSqlFile

if (-not (Test-Path $connectionSqlFile)) {
    throw "STOP: Could not create connection SQL file."
}

if (-not (Test-Path $countsSqlFile)) {
    throw "STOP: Could not create record count SQL file."
}

# ============================================================
# 2. CONNECTION TEST
# ============================================================

Write-Host ">>> Production database connection test"

$connectionResult = & $psql `
    -X `
    -v ON_ERROR_STOP=1 `
    -At `
    -f "$connectionSqlFile"

Assert-LastExitCode "database connection test"

$connectionResult | ForEach-Object {
    Write-Host $_
}

Write-Host "PASS: database connection"
Write-Host ""

# ============================================================
# 3. RECORD COUNTS
# ============================================================

Write-Host ">>> Production record counts"

$countsFile = Join-Path $backupDir "production-record-counts.txt"

$counts = & $psql `
    -X `
    -v ON_ERROR_STOP=1 `
    -At `
    -f "$countsSqlFile"

Assert-LastExitCode "record counts"

$counts | Set-Content -Encoding ASCII $countsFile

Write-Host ""

foreach ($line in $counts) {
    Write-Host $line
}

Write-Host ""

# ------------------------------------------------------------
# Critical preflight
# ------------------------------------------------------------

$tattooProjectLine = $counts |
    Where-Object { $_ -eq "TattooProject=0" }

$appointmentLine = $counts |
    Where-Object { $_ -eq "Appointment=0" }

if (-not $tattooProjectLine) {
    throw "STOP: TattooProject is no longer 0. Migration requires another review."
}

if (-not $appointmentLine) {
    throw "STOP: Appointment is no longer 0. Migration requires another review."
}

Write-Host "PASS: TattooProject=0"
Write-Host "PASS: Appointment=0"
Write-Host ""

# ============================================================
# 4. FULL BACKUP
# ============================================================

$fullDump = Join-Path $backupDir "production-full.dump"

Write-Host ">>> Full backup: schema + data"

& $pgDump `
    --format=custom `
    --verbose `
    --no-owner `
    --file="$fullDump"

Assert-LastExitCode "full backup"

Write-Host "PASS: full backup"
Write-Host ""

# ============================================================
# 5. SCHEMA BACKUP
# ============================================================

$schemaDump = Join-Path $backupDir "production-schema.dump"

Write-Host ">>> Schema backup"

& $pgDump `
    --format=custom `
    --schema-only `
    --verbose `
    --no-owner `
    --file="$schemaDump"

Assert-LastExitCode "schema backup"

Write-Host "PASS: schema backup"
Write-Host ""

# ============================================================
# 6. DATA BACKUP
# ============================================================

$dataDump = Join-Path $backupDir "production-data.dump"

Write-Host ">>> Data backup"

& $pgDump `
    --format=custom `
    --data-only `
    --verbose `
    --no-owner `
    --file="$dataDump"

Assert-LastExitCode "data backup"

Write-Host "PASS: data backup"
Write-Host ""

# ============================================================
# 7. ROLES BACKUP
# ============================================================

$rolesFile = Join-Path $backupDir "production-roles.sql"

Write-Host ">>> Roles backup"

& $pgDumpAll `
    --roles-only `
    --no-role-passwords `
    --file="$rolesFile"

Assert-LastExitCode "roles backup"

Write-Host "PASS: roles backup"
Write-Host ""

# ============================================================
# 8. VERIFY FULL DUMP
# ============================================================

$contentsFile = Join-Path $backupDir "production-full-contents.txt"

Write-Host ">>> Verify full backup"

$dumpList = & $pgRestore `
    --list `
    "$fullDump"

Assert-LastExitCode "pg_restore list"

$dumpList | Set-Content -Encoding UTF8 $contentsFile

Write-Host "PASS: pg_restore can read full dump"
Write-Host ""

# ============================================================
# 9. CHECK REQUIRED OBJECTS
# ============================================================

Write-Host ">>> Check required database objects"

$dumpContents = Get-Content $contentsFile -Raw

$requiredObjects = @(
    "Client",
    "TattooProject",
    "Appointment",
    "ContactMessage",
    "WorkingHours",
    "Promotion"
)

foreach ($object in $requiredObjects) {

    if ($dumpContents -notmatch [regex]::Escape($object)) {
        throw "STOP: Full backup does not contain required object: $object"
    }

    Write-Host "PASS: $object"
}

Write-Host ""

# ============================================================
# 10. VERIFY BACKUP FILES
# ============================================================

Write-Host ">>> Verify backup files"

$requiredFiles = @(
    $fullDump,
    $schemaDump,
    $dataDump,
    $rolesFile,
    $countsFile,
    $contentsFile
)

foreach ($file in $requiredFiles) {

    if (-not (Test-Path $file)) {
        throw "STOP: Missing backup file: $file"
    }

    $item = Get-Item $file

    if ($item.Length -le 0) {
        throw "STOP: Backup file is empty: $($item.Name)"
    }

    Write-Host "PASS: $($item.Name) [$($item.Length) bytes]"
}

Write-Host ""

# ============================================================
# 11. SHA256 CHECKSUMS
# ============================================================

Write-Host ">>> Generate SHA256 checksums"

$checksumsFile = Join-Path $backupDir "SHA256SUMS.txt"

$filesForChecksum = @(
    $fullDump,
    $schemaDump,
    $dataDump,
    $rolesFile,
    $countsFile,
    $contentsFile
)

$hashOutput = foreach ($file in $filesForChecksum) {

    $hash = Get-FileHash `
        -Algorithm SHA256 `
        $file

    "{0}  {1}" -f $hash.Hash, (Split-Path $file -Leaf)
}

$hashOutput | Set-Content -Encoding ASCII $checksumsFile

if (-not (Test-Path $checksumsFile)) {
    throw "STOP: Failed to create SHA256SUMS.txt"
}

if ((Get-Item $checksumsFile).Length -le 0) {
    throw "STOP: SHA256SUMS.txt is empty"
}

Write-Host "PASS: SHA256 checksums"
Write-Host ""

# ============================================================
# 12. FINAL RECORD COUNT CHECK
# ============================================================

Write-Host ">>> Final record count verification"

$countsAfter = & $psql `
    -X `
    -v ON_ERROR_STOP=1 `
    -At `
    -f "$countsSqlFile"

Assert-LastExitCode "final record counts"

$countsBeforeString = ($counts | Out-String).Trim()
$countsAfterString = ($countsAfter | Out-String).Trim()

if ($countsBeforeString -ne $countsAfterString) {
    throw "STOP: Record counts changed while backup was running."
}

Write-Host "PASS: record counts unchanged"
Write-Host ""

# ============================================================
# 13. REMOVE TEMPORARY SQL FILES
# ============================================================

if (Test-Path $connectionSqlFile) {
    Remove-Item $connectionSqlFile -Force
}

if (Test-Path $countsSqlFile) {
    Remove-Item $countsSqlFile -Force
}

# ============================================================
# 14. FINAL SUMMARY
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host "PRODUCTION BACKUP CREATED"
Write-Host "============================================================"
Write-Host ""

Write-Host "Backup folder:"
Write-Host $backupDir
Write-Host ""

Write-Host "Record counts:"
Get-Content $countsFile
Write-Host ""

Write-Host "Backup files:"

Get-ChildItem $backupDir -File |
    Select-Object Name, Length |
    Format-Table -AutoSize

Write-Host ""
Write-Host "SHA256:"
Get-Content $checksumsFile

Write-Host ""
Write-Host "============================================================"
Write-Host "BACKUP PASS"
Write-Host "============================================================"
Write-Host ""
Write-Host "DO NOT run baseline or migrations yet."
Write-Host "Keep this backup folder in a safe location."
Write-Host ""