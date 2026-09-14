$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
npm run portal:build
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-firmware.ps1')
