$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

# Get all env vars
$evars = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&limit=100" -Headers $h

# Find vars that only have production target (not preview)
$productionOnlyVars = $evars.envs | Where-Object {
    $_.target -contains "production" -and $_.target -notcontains "preview"
}

Write-Host "Vars missing preview target: $($productionOnlyVars.Count)"
$productionOnlyVars | ForEach-Object { Write-Host "  $($_.id) | $($_.key)" }

Write-Host "`n=== Adding preview target to all production-only vars ==="
foreach ($ev in $productionOnlyVars) {
    $newTargets = @("production", "preview")
    $body = @{ target = $newTargets } | ConvertTo-Json
    try {
        Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/env/$($ev.id)?teamId=$teamId" `
            -Method PATCH -Headers $h -Body $body | Out-Null
        Write-Host "  ✅ Updated: $($ev.key)"
    } catch { Write-Host "  ❌ Failed: $($ev.key) - $($_.ErrorDetails.Message)" }
}

Write-Host "`n=== Also linking GitHub repo to enable auto-deploy ==="
# Update project to link with GitHub
$updateBody = @{
    rootDirectory = "web"
} | ConvertTo-Json
Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId`?teamId=$teamId" `
    -Method PATCH -Headers $h -Body $updateBody | Out-Null
Write-Host "Root directory set to 'web' for GitHub integration"

Write-Host "`n=== Done ===" 
