$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t" }

$proj = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId`?teamId=$teamId" -Headers $h
Write-Host "Project: $($proj.name)"
Write-Host "rootDirectory: $($proj.rootDirectory)"
Write-Host "framework: $($proj.framework)"

$domains = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId/domains?teamId=$teamId" -Headers $h
Write-Host "Domains:"
$domains.domains | ForEach-Object { Write-Host "  $($_.name) - verified=$($_.verified)" }

# Also check recent deployments
$deploys = Invoke-RestMethod "https://api.vercel.com/v6/deployments?projectId=$projId&teamId=$teamId&limit=5" -Headers $h
Write-Host "Recent deployments: $($deploys.deployments.Count)"
$deploys.deployments | ForEach-Object { Write-Host "  $($_.url) $($_.state) $($_.createdAt)" }
