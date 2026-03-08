$api = "rnd_KXurhFBeqnlX09eE7NHWTWNfWfIz"
$svcId = "srv-d6m4h5bh46gs73be7iog"
$h = @{"Authorization"="Bearer $api";"Accept"="application/json";"Content-Type"="application/json"}

Write-Host "=== Getting current Render env vars ==="
$existing = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/env-vars" -Headers $h
Write-Host "Current vars:"
$existing | ForEach-Object { Write-Host "  $($_.envVar.key)" }

Write-Host "`n=== Adding new env vars ==="
# Need to PUT all env vars at once (Render replaces all)
$allVars = @(
    @{ key = "PYTHON_VERSION"; value = "3.11.0" }
    @{ key = "FLASK_ENV"; value = "production" }
    @{ key = "DATABASE_URL"; value = "postgresql://postgres.wbjgultqxqjjxzbdaxdt:Kiran%40Supabase@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" }
    @{ key = "DIRECT_URL"; value = "postgresql://postgres.wbjgultqxqjjxzbdaxdt:Kiran%40Supabase@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" }
    @{ key = "CRON_SECRET"; value = "uqUNpEE6dRWiXFxCJ6I+X1FyVm0tPilVuk093jbjrDM=" }
    @{ key = "NEXT_PUBLIC_APP_URL"; value = "https://web-bice-eight-83.vercel.app" }
)

$body = $allVars | ConvertTo-Json -Depth 3
Write-Host "Sending $($allVars.Count) env vars..."
try {
    $result = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId/env-vars" -Method PUT -Headers $h -Body $body
    Write-Host "Success! Vars set:"
    $result | ForEach-Object { Write-Host "  $($_.envVar.key)" }
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
}

Write-Host "`n=== Done ===" 
