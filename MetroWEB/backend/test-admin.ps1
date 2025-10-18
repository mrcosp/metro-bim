# test-admin.ps1
# Usage: .\test-admin.ps1 [-CreateTestUser]
param(
    [switch]$CreateTestUser
)

$base = "http://127.0.0.1:3000"
$token = (Get-Content .env | Where-Object { $_ -match '^ADMIN_TOKEN=' } | ForEach-Object { $_ -replace '^ADMIN_TOKEN=', '' }).Trim()
if (-not $token) {
    Write-Error "ADMIN_TOKEN not found in .env"
    exit 1
}

function Wait-ForPort {
    param($targetHost, $port, $timeoutSec=10)
    $end = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $end) {
        try {
            $s = New-Object System.Net.Sockets.TcpClient
            $async = $s.BeginConnect($targetHost, $port, $null, $null)
            $wait = $async.AsyncWaitHandle.WaitOne(500)
            if ($s.Connected) { $s.EndConnect($async); $s.Close(); return $true }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

Write-Host "Waiting for $base..."
if (-not (Wait-ForPort '127.0.0.1' 3000 15)) {
    Write-Error "Port 3000 not responding"
    exit 1
}

# Quick health check
try {
    $health = Invoke-RestMethod -Uri "$base/health" -Method Get -ErrorAction Stop
    Write-Host "/health ->"; $health | ConvertTo-Json -Depth 2
} catch {
    Write-Error "Health check failed:"; $_ | Format-List -Force
    exit 1
}

$headers = @{ 'x-admin-token' = $token; 'Content-Type' = 'application/json' }

Write-Host "GET /admin/tbusuario"
try {
    $users = Invoke-RestMethod -Uri "$base/admin/tbusuario" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "Response:"; $users | ConvertTo-Json -Depth 5
} catch {
    Write-Host "GET failed:"
    $_ | Format-List -Force
}

if ($CreateTestUser) {
    $testBody = @{ email = "test+" + ([guid]::NewGuid().ToString().Substring(0,6)) + "@example.com"; cpf = ((Get-Random -Maximum 99999999999) -as [string]) } | ConvertTo-Json
    Write-Host "Creating test user..."
    try {
        $created = Invoke-RestMethod -Uri "$base/admin/tbusuario" -Headers $headers -Method Post -Body $testBody -ErrorAction Stop
        Write-Host "Created:"; $created | ConvertTo-Json -Depth 5
        $id = $created._id
        Write-Host "Deleting test user $id"
        Invoke-RestMethod -Uri "$base/admin/tbusuario/$id" -Headers @{ 'x-admin-token' = $token } -Method Delete -ErrorAction Stop
        Write-Host "Deleted test user"
    } catch {
        Write-Host "Create/Delete test user failed:"; $_ | Format-List -Force
    }
}

Write-Host "Done."