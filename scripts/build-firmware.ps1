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
  & python -m platformio @arguments
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
