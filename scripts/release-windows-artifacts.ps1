param(
  [Parameter(Mandatory = $true)]
  [string]$ReleaseTag
)

$ErrorActionPreference = "Stop"

if ($ReleaseTag -notmatch '^v[0-9]+(\.[0-9]+){1,2}([.-][A-Za-z0-9._-]+)?$') {
  throw "Version must look like vX.X or vX.X.X."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$DistDir = Join-Path $ProjectRoot "dist"
$OutDir = Join-Path $ProjectRoot "release-artifacts\$ReleaseTag"

Set-Location $ProjectRoot

Write-Host "Building Windows setup + portable executables..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx electron-builder --win --x64 --publish never
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$SetupExe = Get-ChildItem -Path $DistDir -Filter "*Setup*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$PortableExe = Get-ChildItem -Path $DistDir -Filter "*.exe" | Where-Object { $_.Name -notmatch 'Setup' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $SetupExe -or -not $PortableExe) {
  throw "Could not find both Setup.exe and Portable.exe in dist/."
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Copy-Item -Force $SetupExe.FullName $OutDir
Copy-Item -Force $PortableExe.FullName $OutDir

$Hashes = @(
  Get-FileHash -Algorithm SHA256 (Join-Path $OutDir $SetupExe.Name)
  Get-FileHash -Algorithm SHA256 (Join-Path $OutDir $PortableExe.Name)
)

$HashLines = $Hashes | ForEach-Object { "$($_.Hash.ToLower())  $($_.Path | Split-Path -Leaf)" }
$HashLines | Set-Content -Encoding utf8 (Join-Path $OutDir "SHA256SUMS-windows.txt")

Write-Host ""
Write-Host "Windows artifacts prepared in:"
Write-Host "  $OutDir"
Get-ChildItem -Path $OutDir -Filter "*.exe"
Get-ChildItem -Path $OutDir -Filter "SHA256SUMS-windows.txt"
