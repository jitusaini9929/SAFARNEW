$mongorestore = "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe"
$uri = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true"
$attempt = 0

do {
    $attempt++
    Write-Host "=== Attempt $attempt ===" -ForegroundColor Cyan

    & $mongorestore `
        --uri=$uri `
        --nsInclude="safar.users" `
        --numInsertionWorkersPerCollection=4 `
        --bypassDocumentValidation `
        "Safar_dump"

    $exit = $LASTEXITCODE
    Write-Host "Exit code: $exit" -ForegroundColor Yellow

    if ($exit -ne 0) {
        Write-Host "Connection dropped. Waiting 15 seconds before retry..." -ForegroundColor Red
        Start-Sleep -Seconds 15
    }

} while ($exit -ne 0)

Write-Host "SUCCESS! safar.users fully synced to new database." -ForegroundColor Green
