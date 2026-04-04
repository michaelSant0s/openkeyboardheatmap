param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$InstallerArgs
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")

Set-Location $ProjectRoot

Write-Host "Building Windows NSIS installer..."
npx electron-builder --win nsis
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Installer = Get-ChildItem -Path "dist" -Filter "*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $Installer) {
  throw "No NSIS installer (.exe) found in dist/."
}

Write-Host "Running installer: $($Installer.FullName)"
$Process = Start-Process -FilePath $Installer.FullName -ArgumentList $InstallerArgs -PassThru -Wait
exit $Process.ExitCode
