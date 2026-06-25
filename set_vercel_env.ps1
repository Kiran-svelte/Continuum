param(
    [string]$EnvFilePath = ".\.env.production.local",
    [string]$TeamId = $env:VERCEL_TEAM_ID,
    [string]$ProjectId = $env:VERCEL_PROJECT_ID,
    [string]$Token = $env:VERCEL_TOKEN
)

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "VERCEL_TOKEN is required. Set it in the shell, not in this script."
}

if ([string]::IsNullOrWhiteSpace($TeamId) -or [string]::IsNullOrWhiteSpace($ProjectId)) {
    throw "VERCEL_TEAM_ID and VERCEL_PROJECT_ID are required."
}

if (-not (Test-Path -LiteralPath $EnvFilePath)) {
    throw "Env file not found: $EnvFilePath. Use an ignored local file such as .env.production.local."
}

$keysToSet = @(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "CRON_SECRET",
    "HOLIDAY_API_KEY",
    "CONSTRAINT_ENGINE_URL",
    "NEXT_PUBLIC_APP_URL"
)

function Read-EnvFile {
    param([string]$Path)

    $parsed = @{}
    $currentKey = $null
    $currentVal = $null
    $inQuotedValue = $false

    foreach ($line in (Get-Content -LiteralPath $Path)) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($inQuotedValue) {
            $currentVal += "`n" + $line
            if ($line -match '"$') {
                $inQuotedValue = $false
                $parsed[$currentKey] = $currentVal.Trim('"')
                $currentKey = $null
                $currentVal = $null
            }
            continue
        }

        if ($line -match '^([^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            if ($value.StartsWith('"') -and -not $value.EndsWith('"')) {
                $inQuotedValue = $true
                $currentKey = $key
                $currentVal = $value
            } else {
                $parsed[$key] = $value.Trim('"')
            }
        }
    }

    return $parsed
}

$parsedEnv = Read-EnvFile -Path $EnvFilePath
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$successCount = 0
$failCount = 0

foreach ($key in $keysToSet) {
    $value = $parsedEnv[$key]
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "Skip empty: $key"
        continue
    }

    $body = @{
        key = $key
        value = $value
        target = @("production", "preview")
        type = "encrypted"
    } | ConvertTo-Json -Depth 3

    try {
        $null = Invoke-RestMethod `
            -Uri "https://api.vercel.com/v9/projects/$ProjectId/env?teamId=$TeamId&upsert=true" `
            -Method POST `
            -Headers $headers `
            -Body $body
        Write-Host "Set: $key"
        $successCount++
    } catch {
        Write-Host "Failed: $key - $($_.ErrorDetails.Message)"
        $failCount++
    }
}

Write-Host "`nDone: $successCount success, $failCount failed"
