param(
    [string]$EnvFilePath = ".\.env.render.local",
    [string]$ServiceId = $env:RENDER_SERVICE_ID,
    [string]$ApiKey = $env:RENDER_API_KEY
)

& "$PSScriptRoot\..\..\update_render_env.ps1" `
    -EnvFilePath $EnvFilePath `
    -ServiceId $ServiceId `
    -ApiKey $ApiKey
