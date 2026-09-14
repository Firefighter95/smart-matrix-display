param(
  [switch]$Upload,
  [switch]$Validation
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'firmware')
$environment = if ($Validation) { 'hardware-validation' } else { 'waveshare-esp32-s3-rgb-matrix' }
$arguments = @('run', '-e', $environment)
if ($Upload) { $arguments += @('-t', 'upload') }

if (Get-Command pio -ErrorAction SilentlyContinue) {
  & pio @arguments
} else {
  & python -c "import platformio" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'PlatformIO Core ontbreekt voor deze Python-installatie. Installeer met: python -m pip install --user -U platformio'
  }
  & python -m platformio @arguments
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
