$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t" }

# Get latest deployment
$deploys = Invoke-RestMethod "https://api.vercel.com/v6/deployments?projectId=$projId&teamId=$teamId&limit=3" -Headers $h
$latest = $deploys.deployments | Select-Object -First 1
Write-Host "Latest deploy: $($latest.uid) state: $($latest.state)"

# Get build logs
$deplId = $latest.uid
Write-Host "Getting logs for $deplId..."
try {
    $logs = Invoke-RestMethod "https://api.vercel.com/v2/deployments/$deplId/events?teamId=$teamId&limit=200" -Headers $h
    Write-Host "Log entries: $($logs.Count)"
    $logs | Where-Object { $_.type -eq "stdout" -or $_.type -eq "stderr" } | Select-Object -Last 80 | ForEach-Object {
        Write-Host "$($_.type): $($_.payload.text)"
    }
} catch {
    Write-Host "Error getting logs: $($_.ErrorDetails.Message)"
    # Try alternative log endpoint
    try {
        $logs2 = Invoke-RestMethod "https://api.vercel.com/v2/deployments/$deplId/events?teamId=$teamId" -Headers $h
        $logs2 | Select-Object -Last 50 | ForEach-Object { Write-Host $_ }
    } catch { Write-Host "Alt also failed: $($_.ErrorDetails.Message)" }
}

Write-Host "`n=== Done ===" 
