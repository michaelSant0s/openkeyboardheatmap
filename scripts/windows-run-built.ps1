param(
  [switch]$BuildIfMissing = $true,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$AppArgs
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")

Set-Location $ProjectRoot

$ElectronPath = Join-Path $ProjectRoot "node_modules/.bin/electron.cmd"
if (-not (Test-Path $ElectronPath)) {
  throw "electron.cmd not found. Run: npm install"
}

$HasBuild = (Test-Path "dist") -and (Test-Path "dist-electron")
if ($BuildIfMissing -and -not $HasBuild) {
  Write-Host "Build output missing. Running npm run build..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting app on Windows..."
& $ElectronPath . @AppArgs
exit $LASTEXITCODE
