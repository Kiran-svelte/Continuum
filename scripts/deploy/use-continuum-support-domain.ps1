# Point Vercel production env + domain aliases at https://continuum.support
# Requires: Vercel CLI logged in (vercel whoami)

$ErrorActionPreference = "Stop"
$canonical = "https://continuum.support"
$cors = "https://continuum.support,https://www.continuum.support"
$webRoot = Join-Path $PSScriptRoot "..\..\web"

Push-Location $webRoot
try {
  Write-Host "Linking project (if needed)..."
  npx vercel@latest link --yes --project prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn --scope team_hTuQ50nKvTbROYgfNhRPNMe4 2>&1 | Out-Host

  foreach ($key in @("NEXT_PUBLIC_APP_URL", "APP_URL")) {
    Write-Host "Setting $key = $canonical (production)..."
    "y" | npx vercel@latest env rm $key production --yes 2>&1 | Out-Null
    $canonical | npx vercel@latest env add $key production 2>&1 | Out-Host
  }

  Write-Host "Setting CORS_ALLOWED_ORIGINS..."
  "y" | npx vercel@latest env rm CORS_ALLOWED_ORIGINS production --yes 2>&1 | Out-Null
  $cors | npx vercel@latest env add CORS_ALLOWED_ORIGINS production 2>&1 | Out-Host

  Write-Host "Adding domains to Vercel project..."
  npx vercel@latest domains add continuum.support 2>&1 | Out-Host
  npx vercel@latest domains add www.continuum.support 2>&1 | Out-Host

  Write-Host "Deploying production build..."
  npx vercel@latest deploy --prod --yes 2>&1 | Out-Host

  Write-Host ""
  Write-Host "Done. Ensure DNS for continuum.support points to Vercel (A/CNAME per Vercel dashboard)."
  Write-Host "Canonical URL: $canonical"
}
finally {
  Pop-Location
}
