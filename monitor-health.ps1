#!/usr/bin/env powershell
<#
.SYNOPSIS
    Continuum Production Health Monitor
    
.DESCRIPTION  
    Monitors all critical endpoints and services for the Continuum HR platform.
    Run this periodically to verify production health.
#>

Write-Host "🔍 Continuum Production Health Monitor" -ForegroundColor Cyan
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$frontendUrl = "https://web-bice-eight-83.vercel.app"
$backendUrl = "https://continuum-constraint-engine-ukfv.onrender.com"
$passed = 0
$failed = 0

function Test-Endpoint($name, $url, $expectedStatus = 200, $timeout = 30) {
    try {
        Write-Host "Testing $name..." -NoNewline
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec $timeout
        Write-Host " ✅ PASS" -ForegroundColor Green
        $script:passed++
        return $true
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq $expectedStatus) {
            Write-Host " ✅ PASS (HTTP $statusCode)" -ForegroundColor Green
            $script:passed++
            return $true
        } else {
            Write-Host " ❌ FAIL (HTTP $statusCode)" -ForegroundColor Red
            $script:failed++
            return $false
        }
    }
}

Write-Host "🌐 Frontend Endpoints" -ForegroundColor Blue
Test-Endpoint "Landing Page" "$frontendUrl/"
Test-Endpoint "Sign In" "$frontendUrl/sign-in"
Test-Endpoint "Sign Up" "$frontendUrl/sign-up"
Test-Endpoint "Support" "$frontendUrl/support"
Test-Endpoint "Help" "$frontendUrl/help"

Write-Host ""
Write-Host "🔌 API Endpoints" -ForegroundColor Blue  
Test-Endpoint "API Health" "$frontendUrl/api/health"
Test-Endpoint "API Session" "$frontendUrl/api/auth/session"

Write-Host ""
Write-Host "⚙️ Backend Services" -ForegroundColor Blue
Test-Endpoint "Backend Health" "$backendUrl/health"

Write-Host ""
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "All systems operational!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Issues detected - check logs above" -ForegroundColor Red
    exit 1
}