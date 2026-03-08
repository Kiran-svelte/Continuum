$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$h = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

Write-Host "=== Updating project settings ==="
$updateBody = @{
    rootDirectory = "web"
    buildCommand = "npm run build"
    outputDirectory = ".next"
    installCommand = "npm install"
    framework = "nextjs"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod "https://api.vercel.com/v9/projects/$projId`?teamId=$teamId" `
        -Method PATCH -Headers $h -Body $updateBody
    Write-Host "OK: rootDirectory=$($result.rootDirectory)"
} catch { Write-Host "ERR: $($_.ErrorDetails.Message)" }

Write-Host "`n=== Checking GitHub integration ==="
# See if Git integration can be set up
try {
    $gitIntegrations = Invoke-RestMethod "https://api.vercel.com/v1/integrations/installations?teamId=$teamId" -Headers $h
    Write-Host "Integrations: $($gitIntegrations | ConvertTo-Json -Depth 3)"
} catch { Write-Host "Cannot list integrations: $($_.ErrorDetails.Message)" }

Write-Host "`n=== Done ===" 
