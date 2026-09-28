# First publish: sign in to GitHub, switch GitHub Pages to the Actions workflow, push main.
# Later updates only need `git push`.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$repo = 'MuhammadWW/PersonalWebsite'

Write-Host 'Signing in to GitHub (a browser window may open)...'
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($cred | Select-String '^password=(.+)$').Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -First 1
if (-not $token) { throw 'GitHub sign-in did not complete.' }

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$pagesApi = "https://api.github.com/repos/$repo/pages"
$body = '{"build_type":"workflow"}'
try {
  Invoke-RestMethod -Method Post -Uri $pagesApi -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
  Write-Host 'GitHub Pages turned on.'
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -eq 409) {
    Invoke-RestMethod -Method Put -Uri $pagesApi -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
    Write-Host 'GitHub Pages was already on; source set to GitHub Actions.'
  } else {
    throw
  }
}
$cred | git credential approve

git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }

$site = (Invoke-RestMethod -Uri $pagesApi -Headers $headers).html_url
Write-Host ''
Write-Host "Pushed. The deploy takes about two minutes: https://github.com/$repo/actions"
Write-Host "Then the site is live at: $site"
