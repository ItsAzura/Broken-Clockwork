# Build script for Wavedash deployment
# Creates a clean dist/ folder with only game files (no node_modules, no tests)

$dist = "dist"

# Clean previous build
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
New-Item -ItemType Directory -Path "$dist/css" | Out-Null
New-Item -ItemType Directory -Path "$dist/js" | Out-Null

# Copy index.html
Copy-Item "index.html" "$dist/"

# Copy CSS
Copy-Item "css/style.css" "$dist/css/"

# Copy JS files (exclude test files)
Get-ChildItem "js" -Filter "*.js" | Where-Object { $_.Name -notmatch '\.test\.js$' -and $_.Name -notmatch '\.integration\.test\.js$' } | ForEach-Object {
    Copy-Item $_.FullName "$dist/js/"
}

Write-Host "Build complete! dist/ folder ready for deployment."
Write-Host "Files in dist/:"
Get-ChildItem $dist -Recurse -File | ForEach-Object { Write-Host "  $($_.FullName.Replace((Get-Location).Path + '\dist\', ''))" }
