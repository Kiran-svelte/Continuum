param(
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

& "$PSScriptRoot\..\..\trigger_render_deploy.ps1" -ServiceId $ServiceId -ApiKey $ApiKey
