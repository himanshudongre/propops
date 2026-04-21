# PropOps One-Command Installer (Windows)
#
# Usage (in PowerShell, run as regular user):
#   iwr -useb https://raw.githubusercontent.com/himanshudongre/propops/main/install.ps1 | iex
#
# This installer handles:
#   1. Installing Node.js (via winget) if missing
#   2. Installing git (via winget) if missing
#   3. Installing Claude Code (via npm) if missing
#   4. Downloading PropOps to Documents\propops
#   5. Running npm install + Playwright Chromium setup
#   6. Creating a double-clickable desktop launcher (PropOps.bat)
#
# Re-running is safe — it updates existing installations.

$ErrorActionPreference = "Stop"

# ─── Config ────────────────────────────────────────────────
# Overridable via env vars before running:
#   $env:PROPOPS_DIR = "C:\custom\path"; iwr -useb ... | iex
$PropOpsDir = if ($env:PROPOPS_DIR) { $env:PROPOPS_DIR } else { "$env:USERPROFILE\Documents\propops" }
$LauncherDir = if ($env:PROPOPS_LAUNCHER_DIR) { $env:PROPOPS_LAUNCHER_DIR } else { "$env:USERPROFILE\Desktop" }
$RepoUrl = if ($env:PROPOPS_REPO) { $env:PROPOPS_REPO } else { "https://github.com/himanshudongre/propops.git" }
$ZipUrl = "https://github.com/himanshudongre/propops/archive/refs/heads/main.zip"

# ─── Helper: pretty output ─────────────────────────────────
function Write-Step($num, $text) {
    Write-Host ""
    Write-Host "[$num/6] " -ForegroundColor Blue -NoNewline
    Write-Host $text
}
function Write-OK($text) { Write-Host "  ✓ $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  $text" -ForegroundColor Yellow }
function Write-Err($text) { Write-Host "  $text" -ForegroundColor Red }

function Test-Cmd($name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ─── Banner ────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║       PropOps Installer                ║" -ForegroundColor Blue
Write-Host "║       AI property intelligence tool    ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "Installing PropOps on Windows..."

# ─── Step 1: Check winget ──────────────────────────────────
Write-Step 1 "Checking for winget (Windows package manager)..."
if (-not (Test-Cmd winget)) {
    Write-Err "winget is not installed."
    Write-Err "Please install 'App Installer' from the Microsoft Store, then re-run this installer."
    Write-Err "Direct link: https://apps.microsoft.com/store/detail/app-installer/9NBLGGH4NNS1"
    exit 1
}
Write-OK "winget available"

# ─── Step 2: Git ────────────────────────────────────────────
Write-Step 2 "Checking for Git..."
if (-not (Test-Cmd git)) {
    Write-Warn "Git not found. Installing via winget..."
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    Refresh-Path
}
Write-OK "Git available"

# ─── Step 3: Node.js ───────────────────────────────────────
Write-Step 3 "Checking for Node.js..."
$NodeOK = $false
if (Test-Cmd node) {
    try {
        $nodeVer = (& node --version).TrimStart('v')
        $nodeMajor = [int]($nodeVer.Split('.')[0])
        if ($nodeMajor -ge 18) {
            Write-OK "Node.js installed (v$nodeVer)"
            $NodeOK = $true
        } else {
            Write-Warn "Node.js v$nodeVer is too old. Need v18+."
        }
    } catch { }
}

if (-not $NodeOK) {
    Write-Warn "Installing Node.js LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
    Refresh-Path
    Write-OK "Node.js installed"
}

# ─── Step 4: Claude Code ───────────────────────────────────
Write-Step 4 "Checking for Claude Code..."
if (Test-Cmd claude) {
    Write-OK "Claude Code installed"
} else {
    Write-Warn "Installing Claude Code via npm..."
    npm install -g "@anthropic-ai/claude-code"
    Refresh-Path
    Write-OK "Claude Code installed"
}

# ─── Step 5: PropOps ───────────────────────────────────────
Write-Step 5 "Setting up PropOps..."
if (Test-Path "$PropOpsDir\.git") {
    Write-Warn "Existing install found. Updating..."
    Set-Location $PropOpsDir
    try {
        git pull --rebase origin main
    } catch {
        Write-Warn "(Update skipped — local changes detected)"
    }
} else {
    if (Test-Path $PropOpsDir) {
        $backup = "${PropOpsDir}.old.$(Get-Date -UFormat %s)"
        Write-Warn "Directory exists but is not a git repo. Moving to $backup"
        Move-Item -Path $PropOpsDir -Destination $backup
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $PropOpsDir) | Out-Null
    Write-Warn "Cloning PropOps to $PropOpsDir..."
    git clone --depth 1 $RepoUrl $PropOpsDir
}
Write-OK "PropOps downloaded"

# Install deps
Set-Location $PropOpsDir
Write-Warn "Installing PropOps dependencies..."
npm install --silent
Write-OK "Dependencies installed"

Write-Warn "Installing Playwright Chromium (downloads ~150MB)..."
npx playwright install chromium
Write-OK "Playwright Chromium installed"

# ─── Step 6: Desktop Launcher ──────────────────────────────
Write-Step 6 "Creating desktop launcher..."

if (-not (Test-Path $LauncherDir)) {
    New-Item -ItemType Directory -Force -Path $LauncherDir | Out-Null
}
$launcher = "$LauncherDir\PropOps.bat"
$launcherContent = @"
@echo off
cd /d "$PropOpsDir"
cls
echo.
echo ========================================
echo          Welcome to PropOps
echo.
echo  Starting Claude Code...
echo.
echo  When Claude Code opens, type:
echo    /propops
echo.
echo  First time? It will guide you through
echo  a quick 2-minute setup.
echo ========================================
echo.
timeout /t 2 /nobreak >nul
claude
pause
"@

$launcherContent | Out-File -FilePath $launcher -Encoding ASCII -Force
Write-OK "Desktop launcher created: PropOps.bat"

# ─── Done ───────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    PropOps installation complete!      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "What's next:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Make sure you have a Claude Pro or Max subscription."
Write-Host "     (Sign up at https://claude.ai if you don't have one.)"
Write-Host ""
Write-Host "  2. Double-click " -NoNewline
Write-Host "PropOps.bat" -ForegroundColor Cyan -NoNewline
Write-Host " on your Desktop to launch."
Write-Host ""
Write-Host "  3. The first time Claude Code opens, it'll ask you to log in."
Write-Host "     Follow the prompts (opens in your browser, 30 seconds)."
Write-Host ""
Write-Host "  4. Once you're in, type: " -NoNewline
Write-Host "/propops" -ForegroundColor Cyan
Write-Host "     PropOps will ask you a few setup questions (2 minutes)"
Write-Host "     and you're ready to start."
Write-Host ""
Write-Host "Installed at: $PropOpsDir" -ForegroundColor Yellow
Write-Host "Docs & help: https://github.com/himanshudongre/propops" -ForegroundColor Yellow
Write-Host ""
