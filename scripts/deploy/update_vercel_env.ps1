$authJson = Get-Content "C:\Users\kiran\AppData\Roaming\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$t = $authJson.token
$teamId = "team_hTuQ50nKvTbROYgfNhRPNMe4"
$projId = "prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn"
$headers = @{ "Authorization" = "Bearer $t"; "Content-Type" = "application/json" }

function Read-DotEnvValueMap {
    param([Parameter(Mandatory = $true)][string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }

    foreach ($line in (Get-Content $Path)) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim().Trim('"')
            if (-not $map.ContainsKey($key)) {
                $map[$key] = $val
            }
        }
    }

    return $map
}

$localEnvPath = "D:\Continuum\web\.env"
$localEnv = Read-DotEnvValueMap -Path $localEnvPath

Write-Host "=== Getting existing env vars ==="
$existing = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId&limit=100" -Headers $headers
Write-Host "Total env vars: $($existing.envs.Count)"
$existing.envs | ForEach-Object { Write-Host "  $($_.id) | $($_.key) | targets: $($_.target -join ',')" }

Write-Host "`n=== Vars to update ==="
$toUpdate = @{
    "CONSTRAINT_ENGINE_URL" = "https://continuum-constraint-engine-ukfv.onrender.com"
    "NEXT_PUBLIC_APP_URL" = "https://web-bice-eight-83.vercel.app"
}

# Normalize auth secrets for JWT signing/verification across Edge middleware + Node routes.
$canonicalAuthSecret = $null
foreach ($k in @("JWT_SECRET", "SESSION_SECRET", "CSRF_SECRET")) {
    $v = [string]$localEnv[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) {
        $canonicalAuthSecret = $v.Trim()
        break
    }
}

if ([string]::IsNullOrWhiteSpace($canonicalAuthSecret)) {
    throw "Missing auth signing secret in $localEnvPath. Set JWT_SECRET (preferred) or SESSION_SECRET or CSRF_SECRET."
}

$toUpdate["JWT_SECRET"] = $canonicalAuthSecret
$toUpdate["SESSION_SECRET"] = $canonicalAuthSecret
$toUpdate["CSRF_SECRET"] = $canonicalAuthSecret

# Keep server-only origin env aligned with the public app URL.
$toUpdate["APP_URL"] = $toUpdate["NEXT_PUBLIC_APP_URL"]

# Ensure DB URLs include SSL hints (Neon requires SSL).
foreach ($key in @("DATABASE_URL", "DIRECT_URL", "NEON_DATABASE_URL", "NEON_DIRECT_URL")) {
    $value = [string]$localEnv[$key]
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        $toUpdate[$key] = $value
    }
}

foreach ($key in $toUpdate.Keys) {
    $ev = $existing.envs | Where-Object { $_.key -eq $key } | Select-Object -First 1
    if ($ev) {
        Write-Host "Updating $key (id: $($ev.id))"
        $body = @{ value = ([string]$toUpdate[$key]).Trim(); target = @("production","preview"); type = "encrypted" } | ConvertTo-Json -Depth 3
        try {
            Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env/$($ev.id)?teamId=$teamId" `
                -Method PATCH -Headers $headers -Body $body | Out-Null
            Write-Host "  ✅ Updated $key"
        } catch { Write-Host "  ❌ Failed: $($_.ErrorDetails.Message)" }
    } else {
        Write-Host "Creating $key (not found)"
        $body = @{ key = $key; value = ([string]$toUpdate[$key]).Trim(); target = @("production","preview"); type = "encrypted" } | ConvertTo-Json -Depth 3
        try {
            Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projId/env?teamId=$teamId" `
                -Method POST -Headers $headers -Body $body | Out-Null
            Write-Host "  ✅ Created $key"
        } catch { Write-Host "  ❌ Failed: $($_.ErrorDetails.Message)" }
    }
}

Write-Host "`n=== Done ===" 
