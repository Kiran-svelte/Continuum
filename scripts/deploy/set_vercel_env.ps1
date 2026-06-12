# Read the saved Vercel CLI token
$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"

Write-Host "Using Vercel CLI auth token from local profile (token not printed)."

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
$parsedEnv["NEXT_PUBLIC_APP_URL"] = "https://web-bice-eight-83.vercel.app"

# Prefer explicit Neon vars for database wiring
if ($parsedEnv.ContainsKey("NEON_DATABASE_URL") -and -not [string]::IsNullOrWhiteSpace($parsedEnv["NEON_DATABASE_URL"])) {
    $parsedEnv["DATABASE_URL"] = $parsedEnv["NEON_DATABASE_URL"]
}
if ($parsedEnv.ContainsKey("NEON_DIRECT_URL") -and -not [string]::IsNullOrWhiteSpace($parsedEnv["NEON_DIRECT_URL"])) {
    $parsedEnv["DIRECT_URL"] = $parsedEnv["NEON_DIRECT_URL"]
}

# Normalize auth secrets so Edge middleware + Node routes never diverge.
# Use the first configured secret as the canonical value, trim it, and apply to all three keys.
$canonicalAuthSecret = $null
foreach ($k in @("JWT_SECRET", "SESSION_SECRET", "CSRF_SECRET")) {
    $v = [string]$parsedEnv[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) {
        $canonicalAuthSecret = $v.Trim()
        break
    }
}

if ([string]::IsNullOrWhiteSpace($canonicalAuthSecret)) {
    throw "Missing auth signing secret in $envFilePath. Set JWT_SECRET (preferred) or SESSION_SECRET or CSRF_SECRET."
}

$parsedEnv["JWT_SECRET"] = $canonicalAuthSecret
$parsedEnv["SESSION_SECRET"] = $canonicalAuthSecret
$parsedEnv["CSRF_SECRET"] = $canonicalAuthSecret

# Keep server-only origin env aligned with the public app URL.
$parsedEnv["APP_URL"] = [string]$parsedEnv["NEXT_PUBLIC_APP_URL"]

# List of keys to deploy to Vercel
$keysToSet = @(
    "JWT_SECRET"
    "SESSION_SECRET"
    "CSRF_SECRET"
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "NEXT_PUBLIC_FIREBASE_APP_ID"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_CLIENT_EMAIL"
    "FIREBASE_PRIVATE_KEY"
    "NEON_DATABASE_URL"
    "NEON_DIRECT_URL"
    "DATABASE_URL"
    "DIRECT_URL"
    "GMAIL_USER"
    "GMAIL_APP_PASSWORD"
    "CRON_SECRET"
    "HOLIDAY_API_KEY"
    "CONSTRAINT_ENGINE_URL"
    "NEXT_PUBLIC_APP_URL"
    "APP_URL"
)

$headers = @{
    "Authorization" = "Bearer $t"
    "Content-Type" = "application/json"
}

$successCount = 0
$failCount = 0

foreach ($key in $keysToSet) {
    $value = ([string]$parsedEnv[$key]).Trim()
    if ([string]::IsNullOrWhiteSpace($value)) {
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
