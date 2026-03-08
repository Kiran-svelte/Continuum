# Continuum Health Monitor
Write-Host "Continuum Production Health Monitor" -ForegroundColor Cyan
Write-Host "Generated: $(Get-Date)" -ForegroundColor Gray

$frontendUrl = "https://web-bice-eight-83.vercel.app"
$backendUrl = "https://continuum-constraint-engine-ukfv.onrender.com"

# Test endpoints
$tests = @(
    @{Name="Frontend Home"; Url="$frontendUrl/" },
    @{Name="API Health"; Url="$frontendUrl/api/health" },
    @{Name="API Session"; Url="$frontendUrl/api/auth/session" },
    @{Name="Backend Health"; Url="$backendUrl/health" }
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "Testing $($test.Name)... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri $test.Url -TimeoutSec 30
        Write-Host "PASS" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "FAIL" -ForegroundColor Red  
        $failed++
    }
}

Write-Host ""
Write-Host "Summary: $passed passed, $failed failed" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "All systems operational!" -ForegroundColor Green
} else {
    Write-Host "Issues detected" -ForegroundColor Red
}