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

function Wait-HttpOk {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [int]$TimeoutSeconds = 180,
    [string]$Name = $Url
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
        Write-Host "OK: $Name ($Url)"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Timed out waiting for: $Name ($Url)"
}

Push-Location $PSScriptRoot

$compose = Get-ComposeCommand
$composeCmd = $compose[0]
$composeArgsPrefix = @()
if ($compose.Count -gt 1) {
  $composeArgsPrefix = $compose[1..($compose.Count - 1)]
}

Write-Host "Starting Continuum stack (web + db + redis + constraint-engine)..."
& $composeCmd @($composeArgsPrefix + @('up','-d','--build'))

Write-Host "Waiting for services to become healthy..."
Wait-HttpOk -Url 'http://localhost:8001/health' -Name 'Constraint Engine' -TimeoutSeconds 180
Wait-HttpOk -Url 'http://localhost:3000/api/health' -Name 'Web API Health' -TimeoutSeconds 240

Write-Host ""
Write-Host "Continuum is running:" 
Write-Host "- Web App:          http://localhost:3000"
Write-Host "- Web Health:       http://localhost:3000/api/health"
Write-Host "- Constraint Engine: http://localhost:8001/health"
Write-Host ""
Write-Host "To stop everything:" 
Write-Host "- Run: .\\stop-all.ps1"

Pop-Location
