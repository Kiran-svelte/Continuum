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
    "Content-Type" = "application/json"
}

Write-Host "=== Triggering Render Deploy ==="
try {
    $result = Invoke-RestMethod `
        -Uri "https://api.render.com/v1/services/$ServiceId/deploys" `
        -Method POST `
        -Headers $headers `
        -Body '{}'
    Write-Host "Deploy triggered: $($result.id) status: $($result.status)"
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
    throw
}

Write-Host "=== Done ==="
