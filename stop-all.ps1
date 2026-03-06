$ErrorActionPreference = 'Stop'

function Get-ComposeCommand {
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
      $null = docker compose version 2>$null
      return @('docker','compose')
    } catch {
      if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        return @('docker-compose')
      }
    }
  }
  throw "Docker Desktop (with Compose) is required. Install Docker Desktop and ensure 'docker' is on PATH."
}

Push-Location $PSScriptRoot

$compose = Get-ComposeCommand
$composeCmd = $compose[0]
$composeArgsPrefix = @()
if ($compose.Count -gt 1) {
  $composeArgsPrefix = $compose[1..($compose.Count - 1)]
}
Write-Host "Stopping Continuum stack..."
& $composeCmd @($composeArgsPrefix + @('down','--remove-orphans'))

Pop-Location
