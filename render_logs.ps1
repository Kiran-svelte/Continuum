$api = "rnd_KXurhFBeqnlX09eE7NHWTWNfWfIz"
$svcId = "srv-d6m4h5bh46gs73be7iog"
$deplId = "dep-d6m4h6bh46gs73be7je0"
$h = @{"Authorization"="Bearer $api";"Accept"="application/json"}

Write-Host "=== Getting Deploy Logs ==="
try {
    $logs = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/deploys/$deplId/logs?direction=backward&limit=100" -Headers $h
    Write-Host "Logs received: $($logs.Count)"
    $logs | ForEach-Object { Write-Host $_.message }
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
    # Try events endpoint
    try {
        $logs2 = Invoke-RestMethod -Uri "https://api.render.com/v1/logs?serviceId=$svcId&limit=50" -Headers $h
        Write-Host "Events: $($logs2 | ConvertTo-Json -Depth 3)"
    } catch {
        Write-Host "Events error: $($_.ErrorDetails.Message)"
    }
}

# Check deploy status
$dep = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/deploys/$deplId" -Headers $h
Write-Host "Deploy status: $($dep.deploy.status)"
Write-Host "Deploy msg: $($dep.deploy.finishedAt)"

Write-Host "`n=== Done ===" 
