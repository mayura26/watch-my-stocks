# Add VAPID keys to .env file
$envContent = Get-Content .env
$vapidKeys = @"

# Web Push VAPID Keys
VAPID_PUBLIC_KEY=BATRGN42ZUlYk76TcG1cQ-xw0OY49IfqXNY9rhaJO3rkX5NqMKy7uqIgBKeXZht3wVpOU5xr4sd0ZlW2NkiOvBY
VAPID_PRIVATE_KEY=A32gOezwYyfK-p_FF0XLughKhS3NXrFkEnDKywMfH5o
"@

# Check if VAPID keys already exist
if ($envContent -notcontains "# Web Push VAPID Keys") {
    $envContent += $vapidKeys
    $envContent | Set-Content .env
    Write-Host "VAPID keys added to .env file"
} else {
    Write-Host "VAPID keys already exist in .env file"
}
