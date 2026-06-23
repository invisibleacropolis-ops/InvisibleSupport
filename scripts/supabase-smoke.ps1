param(
  [string] $SupabaseUrl = $env:SUPABASE_URL,
  [string] $AnonKey = $env:SUPABASE_ANON_KEY,
  [string] $AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [string] $UserId = $env:SUPABASE_TEST_USER_ID,
  [string] $Bucket = $(if ($env:SUPABASE_BUCKET) { $env:SUPABASE_BUCKET } else { 'invisible-support-assets' }),
  [string] $AssetsTable = $(if ($env:SUPABASE_ASSETS_TABLE) { $env:SUPABASE_ASSETS_TABLE } else { 'assets' })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-Value {
  param([string] $Name, [string] $Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Name is required."
  }
}

function Invoke-SupabaseJson {
  param(
    [string] $Method,
    [string] $Uri,
    [object] $Body = $null
  )
  $headers = @{
    apikey = $AnonKey
    Authorization = "Bearer $AccessToken"
    'Content-Type' = 'application/json'
    Prefer = 'return=representation'
  }
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  }
  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
}

Require-Value -Name 'SUPABASE_URL' -Value $SupabaseUrl
Require-Value -Name 'SUPABASE_ANON_KEY' -Value $AnonKey
Require-Value -Name 'SUPABASE_ACCESS_TOKEN' -Value $AccessToken
Require-Value -Name 'SUPABASE_TEST_USER_ID' -Value $UserId

$SupabaseUrl = $SupabaseUrl.TrimEnd('/')
$assetId = [guid]::NewGuid().ToString()
$fileName = 'smoke-test.txt'
$storagePath = "$UserId/documents/$assetId/$fileName"
$tempFile = Join-Path ([System.IO.Path]::GetTempPath()) "invisible-support-$assetId.txt"
Set-Content -LiteralPath $tempFile -Value "Invisible Support Supabase smoke test $assetId" -NoNewline

try {
  $encodedPath = ($storagePath -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
  $uploadUri = "$SupabaseUrl/storage/v1/object/$Bucket/$encodedPath"
  $headers = @{
    apikey = $AnonKey
    Authorization = "Bearer $AccessToken"
    'x-upsert' = 'false'
  }
  Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType 'text/plain' -InFile $tempFile | Out-Null

  $row = @{
    id = $assetId
    owner_id = $UserId
    kind = 'document'
    name = $fileName
    title = $fileName
    description = 'Smoke test asset'
    alt = ''
    mime_type = 'text/plain'
    size_bytes = (Get-Item -LiteralPath $tempFile).Length
    storage_path = $storagePath
    exif = @{}
    updated_at = (Get-Date).ToUniversalTime().ToString('o')
  }
  Invoke-SupabaseJson -Method Post -Uri "$SupabaseUrl/rest/v1/$AssetsTable" -Body @($row) | Out-Null

  $found = Invoke-SupabaseJson -Method Get -Uri "$SupabaseUrl/rest/v1/$AssetsTable`?id=eq.$assetId&select=id,storage_path"
  if (-not $found -or $found.Count -lt 1) {
    throw 'Inserted asset row was not readable.'
  }

  $downloadUri = "$SupabaseUrl/storage/v1/object/$Bucket/$encodedPath"
  $download = Invoke-WebRequest -Method Get -Uri $downloadUri -Headers @{ apikey = $AnonKey; Authorization = "Bearer $AccessToken" }
  if ($download.Content -notlike '*Invisible Support Supabase smoke test*') {
    throw 'Downloaded object did not match uploaded content.'
  }

  Invoke-RestMethod -Method Delete -Uri "$SupabaseUrl/storage/v1/object/$Bucket/$encodedPath" -Headers @{ apikey = $AnonKey; Authorization = "Bearer $AccessToken" } | Out-Null
  Invoke-SupabaseJson -Method Delete -Uri "$SupabaseUrl/rest/v1/$AssetsTable`?id=eq.$assetId" | Out-Null

  Write-Host 'Supabase smoke test passed.'
} finally {
  if (Test-Path -LiteralPath $tempFile) {
    Remove-Item -LiteralPath $tempFile -Force
  }
}
