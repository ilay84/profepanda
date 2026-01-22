$ErrorActionPreference = "Stop"

$source = "C:\Users\eeley\Documents\ProfePanda\ProfePanda Lessons App"
$webapp = "C:\Users\eeley\Documents\ProfePanda\ProfePanda WebApp (new build)"
$work = Join-Path $webapp ".lessons_app_build"
$overrides = Join-Path $webapp "scripts\lessons_app_overrides"
$distTarget = Join-Path $webapp "static\lessons_app"

if (-not (Test-Path $source)) {
  throw "Lessons App source not found: $source"
}

if (Test-Path $work) {
  Remove-Item -Recurse -Force $work
}

New-Item -ItemType Directory -Force $work | Out-Null

$copyItems = @(
  "package.json",
  "package-lock.json",
  "vite.config.js",
  "postcss.config.js",
  "tailwind.config.js",
  "index.html",
  "public",
  "src"
)

foreach ($item in $copyItems) {
  $srcPath = Join-Path $source $item
  if (Test-Path $srcPath) {
    Copy-Item -Recurse -Force $srcPath $work
  }
}

$servicesTarget = Join-Path $work "src\services"
if (-not (Test-Path $servicesTarget)) {
  throw "Expected services folder not found in build working copy."
}

Copy-Item -Recurse -Force (Join-Path $overrides "services\*") $servicesTarget
python (Join-Path $webapp "scripts\\patch_lessons_app_source.py")
if ($LASTEXITCODE -ne 0) {
  throw "Lessons App source patch failed."
}

@'
from pathlib import Path

root = Path(r"WORK_DIR")
src_root = root / "src"
if not src_root.exists():
    raise SystemExit("src folder not found for route patching.")

def patch_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if line.lstrip().startswith("import "):
            lines.append(line)
            continue
        line = line.replace("/admin/", "/courses-admin/")
        line = line.replace("\"/admin\"", "\"/courses-admin\"")
        line = line.replace("'/admin'", "'/courses-admin'")
        lines.append(line)
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

for path in src_root.rglob("*"):
    if path.suffix not in {".js", ".jsx"}:
        continue
    text = path.read_text(encoding="utf-8")
    new_text = patch_text(text)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
'@.Replace("WORK_DIR", $work.Replace('\', '\\')) | python -

Push-Location $work
try {
  npm install
  npx vite build --base /static/lessons_app/
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force $distTarget | Out-Null
$distPath = Join-Path $work "dist"
if (-not (Test-Path $distPath)) {
  throw "Build failed: dist folder not found at $distPath"
}
Copy-Item -Force (Join-Path $webapp "static\\lessons_app_overrides.css") (Join-Path $distPath "overrides.css")

$indexPath = Join-Path $distPath "index.html"
if (-not (Test-Path $indexPath)) {
  throw "index.html not found for override injection."
}

$indexContent = Get-Content -Raw -Path $indexPath
if ($indexContent -notmatch "lessons_app/overrides\.css") {
  $indexContent = $indexContent -replace "</head>", "  <link rel=`"stylesheet`" href=`"/static/lessons_app/overrides.css`">`n</head>"
}
if ($indexContent -notmatch "ppx-lessons-app") {
  $indexContent = [regex]::Replace($indexContent, "<body([^>]*)>", '<body$1 class="ppx-lessons-app">', 1)
}
Set-Content -Path $indexPath -Value $indexContent -Encoding UTF8
Copy-Item -Recurse -Force (Join-Path $distPath "*") $distTarget

$targetIndex = Join-Path $distTarget "index.html"
if (Test-Path $targetIndex) {
  python (Join-Path $webapp "scripts\\patch_lessons_app_bundle.py")
}

Write-Host "Lessons App bundle built and copied to $distTarget"
