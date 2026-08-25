param()

$workspaceRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$packageStorePath = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot 'node_modules\.pnpm'))

if (-not $packageStorePath.StartsWith($workspaceRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing to operate outside the ActionLens workspace.'
}

if (-not (Test-Path -LiteralPath $packageStorePath -PathType Container)) {
  throw 'The pnpm package store does not exist. Run pnpm install first.'
}

$materialized = 0
Get-ChildItem -LiteralPath $packageStorePath -Recurse -File -Force | ForEach-Object {
  if (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -eq 0) {
    return
  }

  $path = $_.FullName
  $bytes = [System.IO.File]::ReadAllBytes($path)
  [System.IO.File]::Delete($path)
  [System.IO.File]::WriteAllBytes($path, $bytes)
  $materialized += 1
}

Write-Output "Materialized $materialized OneDrive reparse-point package files."
