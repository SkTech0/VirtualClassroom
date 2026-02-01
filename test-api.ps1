# VirtualClassroom API Test Script
$base = "http://localhost:5275/api/v1"
$token = $null
$results = @()

function Test-Endpoint {
    param($Name, $Method, $Uri, $Body, $Headers)
    try {
        $params = @{ Uri = $Uri; Method = $Method; ContentType = "application/json" }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json) }
        if ($Headers) { $params.Headers = $Headers }
        $r = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return @{ Name = $Name; Status = "PASS"; Response = $r }
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = $_.Exception.Response.StatusCode.value__ }
        $msg = $_.Exception.Message
        if ($status) { Write-Host "[$status] $Name - $msg" -ForegroundColor Yellow }
        else { Write-Host "[FAIL] $Name - $msg" -ForegroundColor Red }
        return @{ Name = $Name; Status = if ($status) { $status } else { "FAIL" }; Error = $msg }
    }
}

Write-Host "`n=== 1. Health ===" -ForegroundColor Cyan
Test-Endpoint -Name "GET /health" -Method Get -Uri "http://localhost:5275/health" | Out-Null

Write-Host "`n=== 2. Auth (no token) ===" -ForegroundColor Cyan
$reg = Test-Endpoint -Name "POST register" -Method Post -Uri "$base/auth/register" -Body @{
    email = "testuser@example.com"; username = "testuser"; password = "TestPass123"
}
if ($reg.Status -eq "PASS" -and $reg.Response) { $token = $reg.Response.accessToken }

# Duplicate register should fail with 400
Test-Endpoint -Name "POST register (duplicate)" -Method Post -Uri "$base/auth/register" -Body @{
    email = "testuser@example.com"; username = "testuser2"; password = "TestPass123"
} | Out-Null

if ($token) {
    $auth = @{ Authorization = "Bearer $token" }
    Write-Host "`n=== 3. Auth (with token) ===" -ForegroundColor Cyan
    Test-Endpoint -Name "GET /auth/me" -Method Get -Uri "$base/auth/me" -Headers $auth | Out-Null

    Write-Host "`n=== 4. Rooms ===" -ForegroundColor Cyan
    $room = Test-Endpoint -Name "POST rooms/create" -Method Post -Uri "$base/rooms/create" -Headers $auth -Body @{ subject = "Math" }
    $roomCode = if ($room.Response) { $room.Response.code } else { $null }
    $sessionId = if ($room.Response) { $room.Response.sessionId } else { $null }
    if ($roomCode) {
        Test-Endpoint -Name "GET rooms/{code}" -Method Get -Uri "$base/rooms/$roomCode" -Headers $auth | Out-Null
        Test-Endpoint -Name "GET rooms/{code}/participants" -Method Get -Uri "$base/rooms/$roomCode/participants" -Headers $auth | Out-Null
    }

    Write-Host "`n=== 5. Pomodoro ===" -ForegroundColor Cyan
    if ($sessionId) {
        $pomo = Test-Endpoint -Name "POST pomodoro/start" -Method Post -Uri "$base/pomodoro/start" -Headers $auth -Body @{
            sessionId = $sessionId; isBreak = $false
        }
        $pomoId = if ($pomo.Response) { $pomo.Response.id } else { $null }
        if ($pomoId) {
            Test-Endpoint -Name "POST pomodoro/end" -Method Post -Uri "$base/pomodoro/end" -Headers $auth -Body @{
                pomodoroId = $pomoId; endTime = (Get-Date).ToUniversalTime().ToString("o")
            } | Out-Null
        }
        Test-Endpoint -Name "GET pomodoro/session/{id}" -Method Get -Uri "$base/pomodoro/session/$sessionId" -Headers $auth | Out-Null
    } else { Write-Host "[SKIP] Pomodoro - no sessionId" -ForegroundColor Yellow }

    Write-Host "`n=== 6. Video (LiveKit token) ===" -ForegroundColor Cyan
    if ($roomCode) {
        Test-Endpoint -Name "POST video/livekit-token" -Method Post -Uri "$base/video/livekit-token" -Headers $auth -Body @{
            roomCode = $roomCode; canPublish = $true; canSubscribe = $true
        } | Out-Null
    }

    Write-Host "`n=== 7. Login & Refresh ===" -ForegroundColor Cyan
    $login = Test-Endpoint -Name "POST login" -Method Post -Uri "$base/auth/login" -Body @{
        email = "testuser@example.com"; password = "TestPass123"
    }
    $refreshToken = if ($login.Response) { $login.Response.refreshToken } else { $null }
    if ($refreshToken) {
        Test-Endpoint -Name "POST refresh" -Method Post -Uri "$base/auth/refresh" -Body @{ refreshToken = $refreshToken } | Out-Null
    }
}

Write-Host "`n=== 8. Validation tests ===" -ForegroundColor Cyan
Test-Endpoint -Name "POST register (invalid - weak password)" -Method Post -Uri "$base/auth/register" -Body @{
    email = "bad@x.com"; username = "baduser"; password = "weak"
} | Out-Null

Test-Endpoint -Name "POST register (invalid - bad email)" -Method Post -Uri "$base/auth/register" -Body @{
    email = "notanemail"; username = "user1"; password = "ValidPass123"
} | Out-Null

Write-Host "`n=== Tests complete ===" -ForegroundColor Cyan
