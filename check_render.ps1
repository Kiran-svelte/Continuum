$api = "rnd_KXurhFBeqnlX09eE7NHWTWNfWfIz"
$svcId = "srv-d6m4h5bh46gs73be7iog"
$h = @{"Authorization"="Bearer $api";"Accept"="application/json"}

Write-Host "=== Render Service Status ==="
$svc = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId" -Headers $h
Write-Host "Service: $($svc.name)"
Write-Host "Status: $($svc.suspended)" 
Write-Host "URL: $($svc.serviceDetails.url)"
Write-Host "Build: $($svc.serviceDetails.envSpecificDetails.buildCommand)"
Write-Host "Start: $($svc.serviceDetails.envSpecificDetails.startCommand)"

Write-Host "`n=== Render Deployments ==="
$deps = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/deploys?limit=5" -Headers $h
$deps | ForEach-Object { Write-Host "  $($_.deploy.id) | $($_.deploy.status) | $($_.deploy.createdAt)" }

Write-Host "`n=== Render Env Vars ==="
$ev = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/env-vars" -Headers $h
$ev | ForEach-Object { Write-Host "  $($_.envVar.key) = $($_.envVar.value.Substring(0, [Math]::Min(30, $_.envVar.value.Length)))..." }

Write-Host "`n=== Done ===" 
