$api = "rnd_KXurhFBeqnlX09eE7NHWTWNfWfIz"
$svcId = "srv-d6m4h5bh46gs73be7iog"
$h = @{"Authorization"="Bearer $api";"Accept"="application/json";"Content-Type"="application/json"}

Write-Host "=== Triggering Render Deploy ==="
try {
    $r = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/deploys" -Method POST -Headers $h -Body '{}'
    Write-Host "Deploy triggered: $($r.id) status: $($r.status)"
    Write-Host "Full: $($r | ConvertTo-Json)"
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
}
Write-Host "=== Done ===" 
