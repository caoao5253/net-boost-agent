param(
  [string]$PluginName = "net-boost-agent",
  [string]$MarketplaceName = "net-boost-agent-local",
  [string]$RepositoryUrl = "https://github.com/caoao5253/net-boost-agent.git"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[net-boost-agent] $Message"
}

$pluginRoot = Join-Path $env:USERPROFILE "plugins"
$targetPath = Join-Path $pluginRoot $PluginName
$marketplaceDir = Join-Path $env:USERPROFILE ".agents\plugins"
$marketplacePath = Join-Path $marketplaceDir "marketplace.json"

New-Item -ItemType Directory -Force -Path $pluginRoot | Out-Null
New-Item -ItemType Directory -Force -Path $marketplaceDir | Out-Null

if (-not (Test-Path -LiteralPath $targetPath)) {
  Write-Step "Cloning plugin into $targetPath"
  git clone $RepositoryUrl $targetPath
} else {
  Write-Step "Plugin folder already exists at $targetPath"
}

$repoMarketplacePath = Join-Path $targetPath ".agents\plugins\marketplace.json"
if (-not (Test-Path -LiteralPath $repoMarketplacePath)) {
  throw "Cannot find marketplace template at $repoMarketplacePath"
}

$repoMarketplace = Get-Content -Raw -LiteralPath $repoMarketplacePath | ConvertFrom-Json
$entry = $repoMarketplace.plugins | Where-Object { $_.name -eq $PluginName } | Select-Object -First 1
if (-not $entry) {
  throw "Cannot find $PluginName entry in $repoMarketplacePath"
}

if (Test-Path -LiteralPath $marketplacePath) {
  $marketplace = Get-Content -Raw -LiteralPath $marketplacePath | ConvertFrom-Json
  $installMarketplaceName = $marketplace.name
  if (-not $installMarketplaceName) {
    $installMarketplaceName = $MarketplaceName
    $marketplace | Add-Member -MemberType NoteProperty -Name name -Value $installMarketplaceName
  }
  if (-not $marketplace.PSObject.Properties["interface"]) {
    $marketplace | Add-Member -MemberType NoteProperty -Name interface -Value ([pscustomobject]@{ displayName = "Personal" })
  }
  if (-not $marketplace.plugins) {
    $marketplace | Add-Member -MemberType NoteProperty -Name plugins -Value @()
  }
  $existing = @($marketplace.plugins | Where-Object { $_.name -eq $PluginName })
  if ($existing.Count -eq 0) {
    $marketplace.plugins += $entry
    Write-Step "Added $PluginName to existing personal marketplace"
  } else {
    Write-Step "$PluginName already exists in personal marketplace"
  }
} else {
  $marketplace = $repoMarketplace
  $installMarketplaceName = $MarketplaceName
  Write-Step "Created personal marketplace at $marketplacePath"
}

$marketplace | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $marketplacePath -Encoding UTF8

Write-Step "Installing plugin with Codex"
codex plugin add "$PluginName@$installMarketplaceName"

Write-Step "Done. Start a new Codex thread, then ask: @net-boost-agent help me optimize my network"
