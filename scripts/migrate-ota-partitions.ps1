param(
  [string]$Port = 'COM3'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Bouw ESP32-portal voor LittleFS..."
Push-Location (Join-Path $repoRoot 'portal')
try {
  npm run build:esp32
  if ($LASTEXITCODE -ne 0) { throw 'Portal build:esp32 mislukt.' }
} finally {
  Pop-Location
}

Push-Location (Join-Path $repoRoot 'firmware')
try {
  Write-Host "Flash dual-slot OTA firmware en partition table naar $Port..."
  python -m platformio run -e waveshare-esp32-s3-rgb-matrix -t upload --upload-port $Port
  if ($LASTEXITCODE -ne 0) { throw 'Firmware/partition flash mislukt.' }

  Start-Sleep -Seconds 3
  Write-Host "Flash LittleFS-portal naar $Port..."
  python -m platformio run -e waveshare-esp32-s3-rgb-matrix -t uploadfs --upload-port $Port
  if ($LASTEXITCODE -ne 0) { throw 'LittleFS flash mislukt.' }
} finally {
  Pop-Location
}

Write-Host 'Migratie klaar. Volgende firmware- en portalupdates kunnen via scripts/upload-network.ps1.'
