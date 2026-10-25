$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$authScripts = @(
  (Join-Path $repoRoot 'js/auth.js'),
  (Join-Path $repoRoot 'auth.js')
)

foreach ($scriptPath in $authScripts) {
  $content = Get-Content -Raw -LiteralPath $scriptPath
  if ($content -match "window\.location\.origin \+ '//auth'") {
    throw "Malformed authentication callback URL in $scriptPath"
  }
  if ($content -match '<strong>\$\{email\}</strong>') {
    throw "Unescaped email interpolation in $scriptPath"
  }
  if ($content -notmatch 'function escapeHtml\(') {
    throw "Missing HTML escaping helper in $scriptPath"
  }
}

$vercelConfig = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'vercel.json') | ConvertFrom-Json
$securityHeaders = $vercelConfig.headers | Where-Object { $_.source -eq '/(.*)' } | Select-Object -First 1
$headerKeys = @($securityHeaders.headers | ForEach-Object { $_.key })
foreach ($requiredHeader in 'Content-Security-Policy', 'Permissions-Policy', 'Cross-Origin-Resource-Policy') {
  if ($headerKeys -notcontains $requiredHeader) {
    throw "Missing $requiredHeader in vercel.json"
  }
}

$redirectSources = @($vercelConfig.redirects | ForEach-Object { $_.source })
foreach ($blockedPath in '/amin/:path*', '/mnt/:path*', '/ibloomi-website/:path*') {
  if ($redirectSources -notcontains $blockedPath) {
    throw "Missing deployment containment redirect for $blockedPath"
  }
}

Write-Output 'Security static checks passed.'
