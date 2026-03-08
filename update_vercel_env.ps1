$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$headers = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

Write-Host "=== Getting existing env vars ==="
$existing = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&limit=100" -Headers $headers
Write-Host "Total env vars: $($existing.envs.Count)"
$existing.envs | ForEach-Object { Write-Host "  $($_.id) | $($_.key) | targets: $($_.target -join ',')" }

Write-Host "`n=== Vars to update ==="
$toUpdate = @{
    "CONSTRAINT_ENGINE_URL" = "https://continuum-constraint-engine-ukfv.onrender.com"
    "NEXT_PUBLIC_APP_URL" = "https://continiuum.vercel.app"
}

foreach ($key in $toUpdate.Keys) {
    $ev = $existing.envs | Where-Object { $_.key -eq $key } | Select-Object -First 1
    if ($ev) {
        Write-Host "Updating $key (id: $($ev.id))"
        $body = @{ value = $toUpdate[$key]; target = @("production","preview"); type = "encrypted" } | ConvertTo-Json -Depth 3
        try {
            Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env/$($ev.id)?teamId=$teamId" `
                -Method PATCH -Headers $headers -Body $body | Out-Null
            Write-Host "  ✅ Updated $key"
        } catch { Write-Host "  ❌ Failed: $($_.ErrorDetails.Message)" }
    } else {
        Write-Host "Creating $key (not found)"
        $body = @{ key = $key; value = $toUpdate[$key]; target = @("production","preview"); type = "encrypted" } | ConvertTo-Json -Depth 3
        try {
            Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId" `
                -Method POST -Headers $headers -Body $body | Out-Null
            Write-Host "  ✅ Created $key"
        } catch { Write-Host "  ❌ Failed: $($_.ErrorDetails.Message)" }
    }
}

Write-Host "`n=== Done ===" 
