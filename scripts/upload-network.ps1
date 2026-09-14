param(
  [Alias('Host')]
  [string]$DeviceAddress = 'smartmatrix.local',
  [switch]$Filesystem
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

if ($Filesystem) {
  Push-Location (Join-Path $repoRoot 'portal')
  try { npm run build:esp32 } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw 'Portal build:esp32 mislukt.' }
}

Push-Location (Join-Path $repoRoot 'firmware')
try {
  $target = if ($Filesystem) { 'uploadfsota' } else { 'upload' }
  $arguments = @('run', '-e', 'waveshare-esp32-s3-rgb-matrix-ota', '-t', $target, '--upload-port', $DeviceAddress)
  if (Get-Command pio -ErrorAction SilentlyContinue) {
    & pio @arguments
  } else {
    & python -m platformio @arguments
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
