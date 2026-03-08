# Read the saved Vercel CLI token
$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"

Write-Host "Using token: $($t.Substring(0,10))..."

# Parse the .env file
$envFilePath = "D:\Continuum\web\.env"
$envContent = Get-Content $envFilePath
$parsedEnv = @{}

# Handle multi-line values (like FIREBASE_PRIVATE_KEY)
$currentKey = $null
$currentVal = $null
$inQuotedValue = $false

foreach ($line in $envContent) {
    if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
        continue
    }
    if ($inQuotedValue) {
        $currentVal += "`n" + $line
        if ($line -match '"$') {
            $inQuotedValue = $false
            $parsedEnv[$currentKey] = $currentVal.Trim('"')
            $currentKey = $null
            $currentVal = $null
        }
        continue
    }
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $val = $Matches[2].Trim()
        if ($val.StartsWith('"') -and -not $val.EndsWith('"')) {
            $inQuotedValue = $true
            $currentKey = $key
            $currentVal = $val
        } else {
            $parsedEnv[$key] = $val.Trim('"')
        }
    }
}

# Override CONSTRAINT_ENGINE_URL and NEXT_PUBLIC_APP_URL for production
$parsedEnv["CONSTRAINT_ENGINE_URL"] = "https://continuum-constraint-engine-ukfv.onrender.com"
$parsedEnv["NEXT_PUBLIC_APP_URL"] = "https://continiuum.vercel.app"

# List of keys to deploy to Vercel
$keysToSet = @(
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "NEXT_PUBLIC_FIREBASE_APP_ID"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_CLIENT_EMAIL"
    "FIREBASE_PRIVATE_KEY"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
    "DIRECT_URL"
    "GMAIL_USER"
    "GMAIL_APP_PASSWORD"
    "CRON_SECRET"
    "HOLIDAY_API_KEY"
    "CONSTRAINT_ENGINE_URL"
    "NEXT_PUBLIC_APP_URL"
)

$headers = @{
    "Authorization" = "Bearer $t"
    "Content-Type" = "application/json"
}

$successCount = 0
$failCount = 0

foreach ($key in $keysToSet) {
    $value = $parsedEnv[$key]
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "⚠️  Skip (empty): $key"
        continue
    }

    $bodyObj = @{
        key = $key
        value = $value
        target = @("production", "preview")
        type = "encrypted"
    }
    $body = $bodyObj | ConvertTo-Json -Depth 3

    try {
        $null = Invoke-RestMethod `
            -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&upsert=true" `
            -Method POST `
            -Headers $headers `
            -Body $body
        Write-Host "✅ Set: $key"
        $successCount++
    } catch {
        $errDetail = $_.ErrorDetails.Message
        Write-Host "❌ Failed: $key - $errDetail"
        $failCount++
    }
}

Write-Host "`n=== Done: $successCount success, $failCount failed ==="

$envVars = @(
    @{ key = "NEXT_PUBLIC_FIREBASE_API_KEY"; value = "AIzaSyAsgL5EEnGjj6RDQJUEUkgTPKTv-XpOWD8"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"; value = "continuum-239d3.firebaseapp.com"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"; value = "continuum-239d3"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"; value = "continuum-239d3.firebasestorage.app"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"; value = "373552301041"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_FIREBASE_APP_ID"; value = "1:373552301041:web:233df73d50dd66a2473a50"; target = @("production","preview") }
    @{ key = "FIREBASE_PROJECT_ID"; value = "continuum-239d3"; target = @("production","preview") }
    @{ key = "FIREBASE_CLIENT_EMAIL"; value = "firebase-adminsdk-fbsvc@continuum-239d3.iam.gserviceaccount.com"; target = @("production","preview") }
    @{ key = "FIREBASE_PRIVATE_KEY"; value = "-----BEGIN PRIVATE KEY-----`nMIIEvgIBADANBgkqhkiG9w0BAQEFAAASCB KgwggSkAgEAAoIBAQDLHXzUW6c/+7Zm`n4smgH31shu/IyxUcGaVH0j3y83P7quHdz1CyIMNLkTK2fdJGMo08mthoAusVR6G3`nul9kRsPQj5pAJCsyxjCM+wdaPvs/lp1FtI7jeY9KEbTJ2hqwA5QnrlA7vU08WQ1y`nx8FcjV/jo53FgG7TBhdW1SsRk0TWZv3mZNWsJrqhIO/hzB1IIZycD5fKUFKlGsXR`nTKAiE5OZA68wZ2t5KU2b2WKHRmZF1GqPtas1p+aLAxVV6FxCwh8bvEKGxTcPth70`n0XSr+v1HSwPqXbrxqDU7Ule3pINtN33PEcROw2ICH9YGsJpoelWP27ftarWBfQ2z`nK/1G1jOTAgMBAAECggEAFsxMgpl3AFuEca/q6aofLdtHdsY0rF7EincytN5Wmlzn`n1Tm72QKMaSL3Cjy9KVvrNm469BG/yTetEy48HslCmVpE+gYVQzGzqV9Tx/FhyhVh`nub02fJncV3f9TtrIPBFqw7lxEAODc86bD9MUBQtpQ+fNgamUxuLcI8bxepuJEndx`nl3JTsA5SsVLMNMmaIjaE7u2Q9vttr4S+PS166xP9ML17F1PBozExAwszEUA+6HoO`npV0ejsGwwHChY5bEk1HTgQaHWwtq5MGtdJokyA6WwgyiPEHzYpe41CDkMBV+jstW`nOpkfM9DyYdLXusFM5SLbAZkjbC0jNOUWEAbTADJoYQKBgQD2mhqAEan8Znt0Vu6W`ns7YBSAclXj8UcWFioO2yqwyFU2HD/5BxvB3Kv5HTo9/Q71OQYmQlSjOOjDakhhyh`nXFyQtSfEQUYsNxGQzhLfv/ou3Pk+mOQOrwV52FWupcA/1p+B5zXffLwn3XNgisAQ`nye376iZCHVm8gi0xmYPs6FCeHwKBgQDS2x5gGabTrdtw+irSl70ScDRwl+dRlp18`nLd/34s+kczL6Mmk/YMrF8xoafw6ZfStFYsghI4u/We40P9nsYnwmCT3BLMKhCyec`nRWI9bIMk+rKCVEDAAjbeDd9G5UmDnO5lN6WKcWn8qC5Ivk4Yo23b7axgVErnYvkr`nr/fc5aRUDQKBgF2qyRgOHZAGaSwWfQd2+VHhRv2Vn8YnDsOEtuSffeECe+cToozg`n1DwXqc9GtpPI4+e6x6k2VwD1FyhE3IkZ6Pr6JEGyPXI79IsZCyg75k54lp+FOVKu`nfhj66AivYqec4PdZmCfsXBeUUOfBrBR0btW56ZBBT71/gKUPV4Hb+AsnAoGBAMGM`nvZ89LLPWPT7BhJl3C+lm8dwAtCdieAFLIvGqUywDSuH7cDzrHncCJg34X3BpQ1UX`nzdkNhfQKGuv/SI0CAi/v/63Y5ndpg9ygnAMCHofNUBruN9mIrtC6LyAmzIpxfSuQ`nHvasELwJrSK8/XcEXY2p57cs6OzpHwwJJR6x9VvpAoGBAK/8u2T+dhN45iIihRsZ`nUnTZi2Ah3ImnY4b5wdHbuYHDxIXF9BQV+U/2v4JspFshFsiPtR9m5MXA7lTOkNeT`nJM3AHbCbnbrrFPxim2CKSRgVfBOFve+CzbaXCz9WcDCPzj70tPuqO8vdGIixkkVV`n0GQjpZMfnK66owVHKbZhZGDM`n-----END PRIVATE KEY-----`n"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_SUPABASE_URL"; value = "https://wbjgultqxqjjxzbdaxdt.supabase.co"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiamd1bHRxeHFqanh6YmRheGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTgyMzAsImV4cCI6MjA4Mzg5NDIzMH0.bTOKXAhfa1yh3_thhBXTemZk-elK5_cSo5LH2CBoANI"; target = @("production","preview") }
    @{ key = "SUPABASE_SERVICE_ROLE_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiamd1bHRxeHFqanh6YmRheGR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxODIzMCwiZXhwIjoyMDgzODk0MjMwfQ.P5U3oJds6LzYyS50gwwd3IVj5-fHZw8FXwVxNkxc3mc"; target = @("production","preview") }
    @{ key = "DATABASE_URL"; value = "postgresql://postgres.wbjgultqxqjjxzbdaxdt:Kiran%40Supabase@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"; target = @("production","preview") }
    @{ key = "DIRECT_URL"; value = "postgresql://postgres.wbjgultqxqjjxzbdaxdt:Kiran%40Supabase@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"; target = @("production","preview") }
    @{ key = "GMAIL_USER"; value = "continuum1105@gmail.com"; target = @("production","preview") }
    @{ key = "GMAIL_APP_PASSWORD"; value = "cfcxjjhrxafklere"; target = @("production","preview") }
    @{ key = "CRON_SECRET"; value = "uqUNpEE6dRWiXFxCJ6I+X1FyVm0tPilVuk093jbjrDM="; target = @("production","preview") }
    @{ key = "HOLIDAY_API_KEY"; value = "8186ce7f-a734-47fa-968f-e2553a4638c3"; target = @("production","preview") }
    @{ key = "CONSTRAINT_ENGINE_URL"; value = "https://continuum-constraint-engine-ukfv.onrender.com"; target = @("production","preview") }
    @{ key = "NEXT_PUBLIC_APP_URL"; value = "https://continiuum.vercel.app"; target = @("production","preview") }
)

$headers = @{
    "Authorization" = "Bearer $t"
    "Content-Type" = "application/json"
}

$successCount = 0
$failCount = 0

foreach ($envVar in $envVars) {
    $body = @{
        key = $envVar.key
        value = $envVar.value
        target = $envVar.target
        type = "encrypted"
    } | ConvertTo-Json -Depth 3

    try {
        $null = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&upsert=true" `
            -Method POST `
            -Headers $headers `
            -Body $body
        Write-Host "✅ Set: $($envVar.key)"
        $successCount++
    } catch {
        $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Host "❌ Failed: $($envVar.key) - $($err.error.message)"
        $failCount++
    }
}

Write-Host "`n=== Done: $successCount success, $failCount failed ==="
