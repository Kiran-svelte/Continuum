param(
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$DeployId = $env:RENDER_DEPLOY_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "RENDER_API_KEY is required. Set it in the shell, not in this script."
}

if ([string]::IsNullOrWhiteSpace($ServiceId) -or [string]::IsNullOrWhiteSpace($DeployId)) {
    throw "RENDER_SERVICE_ID and RENDER_DEPLOY_ID are required."
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Accept" = "application/json"
}

Write-Host "=== Getting Deploy Logs ==="
try {
    $logs = Invoke-RestMethod `
        -Uri "https://api.render.com/v1/services/$ServiceId/deploys/$DeployId/logs?direction=backward&limit=100" `
        -Headers $headers
    $logs | ForEach-Object { Write-Host $_.message }
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
}

$deploy = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/deploys/$DeployId" -Headers $headers
Write-Host "Deploy status: $($deploy.deploy.status)"
Write-Host "Deploy finished: $($deploy.deploy.finishedAt)"

Write-Host "`n=== Done ==="
