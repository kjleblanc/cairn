# Launch Cairn without a terminal window.
#
# What this does, in plain words: if any source file is newer than the last
# build, it rebuilds first (so the shortcut never shows you a stale app),
# then starts Cairn and lets this script exit — no console left behind.
# If the build fails, it says so and opens the build log instead of failing
# silently.

$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $appDir

$buildMarker = Join-Path $appDir ".vite\build\main.js"
$needsBuild = -not (Test-Path $buildMarker)

if (-not $needsBuild) {
  $builtAt = (Get-Item $buildMarker).LastWriteTime
  $watch = @(
    "src",
    "package.json",
    "vite.main.config.ts",
    "vite.preload.config.ts",
    "vite.renderer.config.ts",
    "scripts\copy-assets.mjs"
  )
  foreach ($w in $watch) {
    $p = Join-Path $appDir $w
    if (-not (Test-Path $p)) { continue }
    $item = Get-Item $p
    $newest = if ($item.PSIsContainer) {
      Get-ChildItem $p -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    } else {
      $item
    }
    if ($newest -and $newest.LastWriteTime -gt $builtAt) { $needsBuild = $true; break }
  }
}

if ($needsBuild) {
  $log = Join-Path $appDir "launch-build.log"
  & npm.cmd run build:vite *> $log
  if ($LASTEXITCODE -ne 0) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      "Cairn could not build itself, so it was not started. The build log will open now; bringing it to the chat is the fastest way to a fix.",
      "Cairn"
    ) | Out-Null
    Start-Process notepad.exe $log
    exit 1
  }
}

Start-Process -FilePath (Join-Path $appDir "node_modules\electron\dist\electron.exe") -ArgumentList "." -WorkingDirectory $appDir
