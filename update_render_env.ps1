param(
    [string]$EnvFilePath = ".\.env.render.local",
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "RENDER_API_KEY is required. Set it in the shell, not in this script."
}

if ([string]::IsNullOrWhiteSpace($ServiceId)) {
    throw "RENDER_SERVICE_ID is required."
}

if (-not (Test-Path -LiteralPath $EnvFilePath)) {
    throw "Env file not found: $EnvFilePath. Use an ignored local file such as .env.render.local."
}

function Read-EnvFile {
    param([string]$Path)

    $vars = @()
    foreach ($line in (Get-Content -LiteralPath $Path)) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($line -match '^([^=]+)=(.*)$') {
            $vars += @{
                key = $Matches[1].Trim()
                value = $Matches[2].Trim().Trim('"')
            }
        }
    }

    return $vars
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

Write-Host "Reading Render env vars from $EnvFilePath"
$allVars = Read-EnvFile -Path $EnvFilePath

if ($allVars.Count -eq 0) {
    throw "No env vars found in $EnvFilePath."
}

$body = $allVars | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod `
        -Uri "https://api.render.com/v1/services/$ServiceId/env-vars" `
        -Method PUT `
        -Headers $headers `
        -Body $body
    Write-Host "Success. Vars set:"
    $result | ForEach-Object { Write-Host "  $($_.envVar.key)" }
} catch {
    Write-Host "Error: $($_.ErrorDetails.Message)"
    throw
}
