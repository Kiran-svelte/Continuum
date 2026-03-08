$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

# Add ENABLE_SIGNUP_FALLBACK env var to enable the fixed signup flow
$newEnvVars = @(
    @{ key = "ENABLE_SIGNUP_FALLBACK"; value = "true"; target = @("production", "preview"); type = "encrypted" }
)

foreach ($envVar in $newEnvVars) {
    $body = $envVar | ConvertTo-Json
    try {
        Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&upsert=true" `
            -Method POST -Headers $h -Body $body | Out-Null
        Write-Host "✅ Set: $($envVar.key)"
    } catch {
        Write-Host "❌ Failed: $($envVar.key) - $($_.ErrorDetails.Message)"
    }
}

Write-Host "`nDone! Now the signup fallback will work in production."