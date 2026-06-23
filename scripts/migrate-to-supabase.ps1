param(
  [switch] $DryRun,
  [string] $SupabaseUrl = $env:SUPABASE_URL,
  [string] $ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string] $OwnerId = $env:SUPABASE_MIGRATION_USER_ID,
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

function Join-EncodedPath {
  param([string[]] $Segments)
  return ($Segments | Where-Object { $_ } | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
}

function Invoke-SupabaseJson {
  param(
    [string] $Method,
    [string] $Uri,
    [object] $Body = $null
  )
  $headers = @{
    apikey = $ServiceRoleKey
    Authorization = "Bearer $ServiceRoleKey"
    'Content-Type' = 'application/json'
    Prefer = 'resolution=merge-duplicates,return=representation'
  }
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  }
  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
}

function Upload-Object {
  param(
    [string] $LocalPath,
    [string] $StoragePath,
    [string] $ContentType
  )
  $encodedPath = ($StoragePath -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
  $uri = "$SupabaseUrl/storage/v1/object/$Bucket/$encodedPath"
  $headers = @{
    apikey = $ServiceRoleKey
    Authorization = "Bearer $ServiceRoleKey"
    'x-upsert' = 'true'
  }
  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType $ContentType -InFile $LocalPath | Out-Null
}

function Get-OptionalProperty {
  param(
    [object] $Object,
    [string] $Name,
    [object] $Default = $null
  )
  if ($Object.PSObject.Properties.Name -contains $Name) {
    $value = $Object.$Name
    if ($null -ne $value) { return $value }
  }
  return $Default
}

function Convert-Asset {
  param(
    [object] $Item,
    [string] $Kind
  )
  $folder = if ($Kind -eq 'image') { 'images' } else { 'documents' }
  $storagePath = "$OwnerId/$folder/$($Item.id)/$([uri]::EscapeDataString($Item.name))"
  $localPath = Join-Path $PSScriptRoot "..\$($Item.repoPath -replace '/', '\')"
  [pscustomobject]@{
    item = $Item
    kind = $Kind
    localPath = $localPath
    storagePath = $storagePath
    row = @{
      id = $Item.id
      owner_id = $OwnerId
      kind = $Kind
      name = $Item.name
      title = Get-OptionalProperty -Object $Item -Name 'title' -Default $Item.name
      description = Get-OptionalProperty -Object $Item -Name 'description' -Default ''
      alt = Get-OptionalProperty -Object $Item -Name 'alt' -Default ''
      mime_type = Get-OptionalProperty -Object $Item -Name 'type' -Default 'application/octet-stream'
      size_bytes = [int64]$Item.size
      storage_path = $storagePath
      width = Get-OptionalProperty -Object $Item -Name 'width'
      height = Get-OptionalProperty -Object $Item -Name 'height'
      captured_at = Get-OptionalProperty -Object $Item -Name 'capturedAt'
      exif = Get-OptionalProperty -Object $Item -Name 'exif' -Default @{}
      updated_at = Get-OptionalProperty -Object $Item -Name 'updatedAt' -Default (Get-Date).ToUniversalTime().ToString('o')
    }
  }
}

Require-Value -Name 'SUPABASE_MIGRATION_USER_ID' -Value $OwnerId
if (-not $DryRun) {
  Require-Value -Name 'SUPABASE_URL' -Value $SupabaseUrl
  Require-Value -Name 'SUPABASE_SERVICE_ROLE_KEY' -Value $ServiceRoleKey
}

if ($SupabaseUrl) {
  $SupabaseUrl = $SupabaseUrl.TrimEnd('/')
}
$documentsPath = Join-Path $PSScriptRoot '..\storage\documents.json'
$imagesPath = Join-Path $PSScriptRoot '..\storage\images.json'
$assets = @()

if (Test-Path -LiteralPath $documentsPath) {
  $documents = Get-Content -LiteralPath $documentsPath -Raw | ConvertFrom-Json
  foreach ($document in $documents) { $assets += Convert-Asset -Item $document -Kind 'document' }
}

if (Test-Path -LiteralPath $imagesPath) {
  $images = Get-Content -LiteralPath $imagesPath -Raw | ConvertFrom-Json
  foreach ($image in $images) { $assets += Convert-Asset -Item $image -Kind 'image' }
}

Write-Host "Found $($assets.Count) asset(s) to migrate."

foreach ($asset in $assets) {
  if (-not (Test-Path -LiteralPath $asset.localPath -PathType Leaf)) {
    throw "Missing local file for $($asset.item.id): $($asset.localPath)"
  }
  Write-Host "$($asset.kind): $($asset.item.name) -> $($asset.storagePath)"
  if (-not $DryRun) {
    Upload-Object -LocalPath $asset.localPath -StoragePath $asset.storagePath -ContentType $asset.row.mime_type
    $uri = "$SupabaseUrl/rest/v1/$AssetsTable" + '?on_conflict=id'
    Invoke-SupabaseJson -Method Post -Uri $uri -Body @($asset.row) | Out-Null
  }
}

if ($DryRun) {
  Write-Host 'Dry run complete. No Supabase data was changed.'
} else {
  Write-Host 'Migration complete.'
}
