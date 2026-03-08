$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

# Get all env vars
$evars = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&limit=100" -Headers $h

# Update NEXT_PUBLIC_APP_URL
$appUrlVar = $evars.envs | Where-Object { $_.key -eq "NEXT_PUBLIC_APP_URL" } | Select-Object -First 1
if ($appUrlVar) {
    Write-Host "Updating NEXT_PUBLIC_APP_URL (id: $($appUrlVar.id))"
    $body = @{ value = "https://web-bice-eight-83.vercel.app"; target = @("production","preview"); type = "encrypted" } | ConvertTo-Json
    try {
        Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/env/$($appUrlVar.id)?teamId=$teamId" `
            -Method PATCH -Headers $h -Body $body | Out-Null
        Write-Host "  OK: NEXT_PUBLIC_APP_URL updated"
    } catch { Write-Host "  ERR: $($_.ErrorDetails.Message)" }
}

# Also need to make sure FIREBASE_PRIVATE_KEY has correct format  
# Check and update if needed
$pkVar = $evars.envs | Where-Object { $_.key -eq "FIREBASE_PRIVATE_KEY" } | Select-Object -First 1
Write-Host "FIREBASE_PRIVATE_KEY id: $($pkVar.id)"

# Now check if rootDirectory needs to be set for GitHub integration
$proj = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId`?teamId=$teamId" -Headers $h
Write-Host "Current rootDirectory: '$($proj.rootDirectory)'"
Write-Host "Git link: $($proj.link | ConvertTo-Json -Depth 3)"

Write-Host "`n=== Done ==="
