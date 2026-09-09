param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'portal')
npm run dev -- --port $Port

