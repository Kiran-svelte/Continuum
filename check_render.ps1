param(
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "RENDER_API_KEY is required. Set it in the shell, not in this script."
}

if ([string]::IsNullOrWhiteSpace($ServiceId)) {
    throw "RENDER_SERVICE_ID is required."
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Accept" = "application/json"
}

Write-Host "=== Render Service Status ==="
$service = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId" -Headers $headers
Write-Host "Service: $($service.name)"
Write-Host "Status: $($service.suspended)"
Write-Host "URL: $($service.serviceDetails.url)"
Write-Host "Build: $($service.serviceDetails.envSpecificDetails.buildCommand)"
Write-Host "Start: $($service.serviceDetails.envSpecificDetails.startCommand)"

Write-Host "`n=== Render Deployments ==="
$deploys = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/deploys?limit=5" -Headers $headers
$deploys | ForEach-Object {
    Write-Host "  $($_.deploy.id) | $($_.deploy.status) | $($_.deploy.createdAt)"
}

Write-Host "`n=== Done ==="
