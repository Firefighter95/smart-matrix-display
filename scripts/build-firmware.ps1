param(
  [switch]$Upload
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'firmware')
if ($Upload) { pio run -t upload } else { pio run }

