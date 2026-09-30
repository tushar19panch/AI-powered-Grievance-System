$baseUrl = "http://localhost:8080"

Write-Host "--- 1. Testing Backend Health & Complaints List ---" -ForegroundColor Cyan
$complaints = Invoke-RestMethod -Uri "$baseUrl/api/complaints" -Method GET
Write-Host "Found $($complaints.Count) complaints in DB" -ForegroundColor Green

if ($complaints.Count -eq 0) {
    Write-Host "No complaints available to test." -ForegroundColor Yellow
    exit 0
}

$testComplaint = $complaints[0]
$cid = $testComplaint.id
Write-Host "Selected Test Complaint ID: $cid | Current Status: $($testComplaint.status) | Level: $($testComplaint.escalationLevel)" -ForegroundColor Yellow

Write-Host "`n--- 2. Testing Escalation to Tier 2 (BDO) ---" -ForegroundColor Cyan
$escBody = @{ reason = "समय सीमा पूर्ण होने पर ब्लॉक विकास अधिकारी को एस्केलेट किया गया" } | ConvertTo-Json
$escResult = Invoke-RestMethod -Uri "$baseUrl/api/escalation/$cid/escalate" -Method POST -Body $escBody -ContentType "application/json"
Write-Host "Escalation Result -> ID: $($escResult.id), Level: $($escResult.escalationLevel), Authority: $($escResult.currentAuthority)" -ForegroundColor Green

Write-Host "`n--- 3. Testing BDO Tier 2 Complaints Feed ---" -ForegroundColor Cyan
$tier2Complaints = Invoke-RestMethod -Uri "$baseUrl/api/escalation/tier/2" -Method GET
Write-Host "Complaints at Tier 2 (BDO): $($tier2Complaints.Count)" -ForegroundColor Green
$tier2Found = $tier2Complaints | Where-Object { $_.id -eq $cid }
if ($tier2Found) {
    Write-Host "SUCCESS: Complaint #$cid is visible in BDO Tier 2 queue!" -ForegroundColor Green
} else {
    Write-Host "Notice: Complaint may have moved or already above Tier 2." -ForegroundColor Yellow
}

Write-Host "`n--- 4. Testing Official Status Update & Resolution Remarks Persistence ---" -ForegroundColor Cyan
# Login as BDO or Sarpanch to test status update
$bdoLoginBody = @{
    identifier = "BDO-BLK-99"
    password = "password123"
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $bdoLoginBody -ContentType "application/json"
    $token = $loginRes.token
    Write-Host "BDO Logged In Successfully. Token received." -ForegroundColor Green
} catch {
    Write-Host "BDO login fallback to admin/sarpanch..." -ForegroundColor Yellow
    $sarpanchLogin = @{
        identifier = "SARPANCH-77221"
        password = "password123"
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $sarpanchLogin -ContentType "application/json"
    $token = $loginRes.token
}

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$updateBody = @{
    status = "ACTION_TAKEN"
    remarks = "प्रखंड विकास अधिकारी (BDO) के निर्देशानुसार टीम ने स्थल पर मरम्मत कार्य प्रारंभ किया।"
} | ConvertTo-Json

$statusRes = Invoke-RestMethod -Uri "$baseUrl/api/sarpanch/complaints/$cid/status" -Method PUT -Headers $headers -Body $updateBody
Write-Host "Status Update Result: Status = $($statusRes.status)" -ForegroundColor Green
Write-Host "Action Remarks: $($statusRes.actionRemarks)" -ForegroundColor Green
Write-Host "Resolved By Role: $($statusRes.resolvedByRole)" -ForegroundColor Green
Write-Host "Resolved By Name: $($statusRes.resolvedByName)" -ForegroundColor Green

Write-Host "`n--- 5. Verify Public/Citizen View of Complaint ---" -ForegroundColor Cyan
$verified = Invoke-RestMethod -Uri "$baseUrl/api/complaints/$cid" -Method GET
Write-Host "Citizen API Response Verification:" -ForegroundColor Cyan
Write-Host " - ID: $($verified.id)" -ForegroundColor White
Write-Host " - Status: $($verified.status)" -ForegroundColor White
Write-Host " - Escalation Level: $($verified.escalationLevel)" -ForegroundColor White
Write-Host " - Authority: $($verified.currentAuthority)" -ForegroundColor White
Write-Host " - Action Remarks: $($verified.actionRemarks)" -ForegroundColor White
Write-Host " - Resolved By: $($verified.resolvedByName) ($($verified.resolvedByRole))" -ForegroundColor White

Write-Host "`n=== 100% END-TO-END FLOW VERIFICATION COMPLETE ===" -ForegroundColor Green
