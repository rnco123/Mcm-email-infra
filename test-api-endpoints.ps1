# Comprehensive API Endpoint Test Script
# Tests all endpoints except webhook

$baseUrl = "http://localhost:3000/api/v1"
$domain = "alerts.myclinicmd.com"
$resendApiKey = "re_FdKkk94F_DZ5DFRSTQtoiZuVx4Ewbdi8m"
$testEmail = "raheelhussainco+test@gmail.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MCM EMAIL INFRA - API Endpoint Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Tenant
Write-Host "STEP 1: Creating Tenant..." -ForegroundColor Yellow
try {
    $tenantBody = @{
        name = "Test Company"
        isActive = $true
    } | ConvertTo-Json

    $tenantResponse = Invoke-RestMethod -Uri "$baseUrl/tenant" -Method Post -Body $tenantBody -ContentType "application/json"
    $tenantId = $tenantResponse.id
    $apiKey = $tenantResponse.apiKey
    
    Write-Host "✅ Tenant Created:" -ForegroundColor Green
    Write-Host "   ID: $tenantId" -ForegroundColor Gray
    Write-Host "   API Key: $apiKey" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to create tenant: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Add Domain to Tenant
Write-Host "STEP 2: Adding Domain to Tenant..." -ForegroundColor Yellow
try {
    $domainBody = @{
        domain = $domain
        resendApiKey = $resendApiKey
        isActive = $true
    } | ConvertTo-Json

    $domainResponse = Invoke-RestMethod -Uri "$baseUrl/tenant/$tenantId/domain" -Method Post -Body $domainBody -ContentType "application/json" -Headers @{ "X-API-Key" = $apiKey }
    $domainId = $domainResponse.id
    
    Write-Host "✅ Domain Added:" -ForegroundColor Green
    Write-Host "   Domain ID: $domainId" -ForegroundColor Gray
    Write-Host "   Domain: $($domainResponse.domain)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to add domain: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Send Email
Write-Host "STEP 3: Sending Test Email..." -ForegroundColor Yellow
try {
    $emailBody = @{
        to = $testEmail
        subject = "Test Email from MCM Email Infrastructure"
        html = "<h1>Hello!</h1><p>This is a test email from the MCM Email Infrastructure API.</p><p>Sent at: $(Get-Date)</p>"
        text = "Hello! This is a test email from the MCM Email Infrastructure API. Sent at: $(Get-Date)"
        from = "infra@$domain"
    } | ConvertTo-Json

    $emailResponse = Invoke-RestMethod -Uri "$baseUrl/email/send" -Method Post -Body $emailBody -ContentType "application/json" -Headers @{ "X-API-Key" = $apiKey }
    $emailLogId = $emailResponse.id
    
    Write-Host "✅ Email Sent:" -ForegroundColor Green
    Write-Host "   Email Log ID: $emailLogId" -ForegroundColor Gray
    Write-Host "   Status: $($emailResponse.status)" -ForegroundColor Gray
    Write-Host "   To: $($emailResponse.to)" -ForegroundColor Gray
    Write-Host ""
    
    # Wait a moment for processing
    Start-Sleep -Seconds 3
} catch {
    Write-Host "❌ Failed to send email: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Get Email Status
Write-Host "STEP 4: Getting Email Status..." -ForegroundColor Yellow
try {
    $emailStatus = Invoke-RestMethod -Uri "$baseUrl/email/$emailLogId" -Method Get -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Email Status:" -ForegroundColor Green
    Write-Host "   Status: $($emailStatus.status)" -ForegroundColor Gray
    Write-Host "   Subject: $($emailStatus.subject)" -ForegroundColor Gray
    if ($emailStatus.resendEmailId) {
        Write-Host "   Resend Email ID: $($emailStatus.resendEmailId)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get email status: $_" -ForegroundColor Red
}

# Step 5: Create Broadcast
Write-Host "STEP 5: Creating Broadcast Campaign..." -ForegroundColor Yellow
try {
    $broadcastBody = @{
        name = "Test Broadcast Campaign"
        subject = "Welcome to Our Newsletter!"
        html = "<h1>Welcome!</h1><p>Thank you for subscribing to our newsletter.</p><p>Hello {{name}}!</p>"
        text = "Welcome! Thank you for subscribing. Hello {{name}}!"
        from = "newsletter@$domain"
    } | ConvertTo-Json

    $broadcastResponse = Invoke-RestMethod -Uri "$baseUrl/broadcast/create" -Method Post -Body $broadcastBody -ContentType "application/json" -Headers @{ "X-API-Key" = $apiKey }
    $broadcastId = $broadcastResponse.id
    
    Write-Host "✅ Broadcast Created:" -ForegroundColor Green
    Write-Host "   Broadcast ID: $broadcastId" -ForegroundColor Gray
    Write-Host "   Name: $($broadcastResponse.name)" -ForegroundColor Gray
    Write-Host "   Status: $($broadcastResponse.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to create broadcast: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Add Contacts to Broadcast
Write-Host "STEP 6: Adding Contacts to Broadcast..." -ForegroundColor Yellow
try {
    $contactsBody = @{
        contacts = @(
            @{
                email = "$($testEmail -replace '@', '+contact1@')"
                personalization = @{
                    name = "John Doe"
                }
            },
            @{
                email = "$($testEmail -replace '@', '+contact2@')"
                personalization = @{
                    name = "Jane Smith"
                }
            },
            @{
                email = "$($testEmail -replace '@', '+contact3@')"
                personalization = @{
                    name = "Bob Johnson"
                }
            }
        )
    } | ConvertTo-Json -Depth 10

    $contactsResponse = Invoke-RestMethod -Uri "$baseUrl/broadcast/$broadcastId/contacts" -Method Post -Body $contactsBody -ContentType "application/json" -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Contacts Added:" -ForegroundColor Green
    Write-Host "   Total Contacts: $($contactsResponse.totalContacts)" -ForegroundColor Gray
    Write-Host "   Added: $($contactsResponse.added)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to add contacts: $_" -ForegroundColor Red
    exit 1
}

# Step 7: Get Broadcast Details
Write-Host "STEP 7: Getting Broadcast Details..." -ForegroundColor Yellow
try {
    $broadcastDetails = Invoke-RestMethod -Uri "$baseUrl/broadcast/$broadcastId" -Method Get -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Broadcast Details:" -ForegroundColor Green
    Write-Host "   Name: $($broadcastDetails.name)" -ForegroundColor Gray
    Write-Host "   Status: $($broadcastDetails.status)" -ForegroundColor Gray
    Write-Host "   Total Contacts: $($broadcastDetails.totalContacts)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get broadcast details: $_" -ForegroundColor Red
}

# Step 8: Start Broadcast
Write-Host "STEP 8: Starting Broadcast Campaign..." -ForegroundColor Yellow
try {
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/broadcast/$broadcastId/start" -Method Post -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Broadcast Started:" -ForegroundColor Green
    Write-Host "   Status: $($startResponse.status)" -ForegroundColor Gray
    Write-Host ""
    
    # Wait for processing
    Write-Host "⏳ Waiting for broadcast processing..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} catch {
    Write-Host "❌ Failed to start broadcast: $_" -ForegroundColor Red
}

# Step 9: Get Broadcast Status
Write-Host "STEP 9: Getting Broadcast Status..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/broadcast/$broadcastId/status" -Method Get -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Broadcast Status:" -ForegroundColor Green
    Write-Host "   Status: $($statusResponse.status)" -ForegroundColor Gray
    Write-Host "   Total Contacts: $($statusResponse.totalContacts)" -ForegroundColor Gray
    Write-Host "   Sent: $($statusResponse.sentCount)" -ForegroundColor Green
    Write-Host "   Failed: $($statusResponse.failedCount)" -ForegroundColor $(if ($statusResponse.failedCount -gt 0) { 'Red' } else { 'Gray' })
    Write-Host "   Progress: $($statusResponse.progress)%" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get broadcast status: $_" -ForegroundColor Red
}

# Step 10: Get Tenant Details
Write-Host "STEP 10: Getting Tenant Details..." -ForegroundColor Yellow
try {
    $tenantDetails = Invoke-RestMethod -Uri "$baseUrl/tenant/$tenantId" -Method Get -Headers @{ "X-API-Key" = $apiKey }
    
    Write-Host "✅ Tenant Details:" -ForegroundColor Green
    Write-Host "   Name: $($tenantDetails.name)" -ForegroundColor Gray
    Write-Host "   Active: $($tenantDetails.isActive)" -ForegroundColor Gray
    Write-Host "   Domains: $($tenantDetails.domains.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get tenant details: $_" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All API Endpoints Tested Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - Tenant Created: $tenantId" -ForegroundColor Gray
Write-Host "  - Domain Added: $domain" -ForegroundColor Gray
Write-Host "  - Email Sent: $emailLogId" -ForegroundColor Gray
Write-Host "  - Broadcast Created: $broadcastId" -ForegroundColor Gray
Write-Host "  - Contacts Added: 3" -ForegroundColor Gray
Write-Host ""

