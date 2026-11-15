
$baseUrl = "http://localhost:3000"
$id = "9567fd12-8086-4915-a3ff-2b92a6ba7867"

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/queries/inventory/$id/events" `
        -Method Get

    if ($response.aggregateId -ne $id) {
        throw "Aggregate ID does not match."
    }

    if ($response.totalEvents -lt 1) {
        throw "No events returned."
    }

    Write-Host "PASS: Event history API is working." -ForegroundColor Green
    Write-Host "Aggregate ID: $($response.aggregateId)"
    Write-Host "Total events: $($response.totalEvents)"

    $response.events | ForEach-Object {
        Write-Host "Version $($_.version): $($_.eventType)"
    }
}
catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
