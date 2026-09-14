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
  $environment = 'waveshare-esp32-s3-rgb-matrix'
  $image = if ($Filesystem) {
    Join-Path $repoRoot 'firmware\.pio\build\waveshare-esp32-s3-rgb-matrix\littlefs.bin'
  } else {
    Join-Path $repoRoot 'firmware\.pio\build\waveshare-esp32-s3-rgb-matrix\firmware.bin'
  }
  $arguments = @('run', '-e', $environment)
  if ($Filesystem) { $arguments += @('-t', 'buildfs') }
  & python -m platformio @arguments
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$endpoint = if ($Filesystem) { 'ota/filesystem' } else { 'ota/firmware' }
$field = if ($Filesystem) { 'filesystem' } else { 'firmware' }
$url = "http://$DeviceAddress/api/v1/$endpoint"
Write-Host "Upload $field naar $url"
& curl.exe --fail --show-error --silent --request POST --form "${field}=@$image" $url
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 56) { exit $LASTEXITCODE }
if ($LASTEXITCODE -eq 56) { Write-Host 'Controller sloot de HTTP-verbinding tijdens de automatische reboot; upload is aangeboden.' }

$statusUrl = "http://$DeviceAddress/api/v1/status"
$online = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  Start-Sleep -Seconds 1
  try {
    $status = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 2
    if ($status.online) {
      $online = $true
      Write-Host "Controller weer online op $($status.ip)."
      break
    }
  } catch {
    # Expected while the ESP32 is rebooting and reconnecting to WiFi.
  }
}
if (-not $online) { throw 'Upload is gestart, maar de controller kwam niet tijdig online.' }
