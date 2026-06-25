param(
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

& "$PSScriptRoot\..\..\check_render.ps1" -ServiceId $ServiceId -ApiKey $ApiKey
