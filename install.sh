#!/bin/bash
#
# PropOps One-Command Installer (macOS / Linux)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/himanshudongre/propops/main/install.sh | bash
#
# This installer handles:
#   1. Installing Node.js (via Homebrew on Mac, fnm on Linux) if missing
#   2. Installing Claude Code (via npm) if missing
#   3. Installing git if missing
#   4. Downloading PropOps to ~/Documents/propops
#   5. Running npm install + Playwright Chromium setup
#   6. Creating a double-clickable desktop launcher (Mac)
#
# After installation:
#   - Mac users: Double-click "PropOps.command" on your Desktop
#   - Linux users: Run ~/.local/bin/propops
#
# Re-running this script is safe. It updates existing installations.

set -e

# ─── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Config ─────────────────────────────────────────────────
# Overridable via env var: PROPOPS_DIR=/custom/path bash install.sh
PROPOPS_DIR="${PROPOPS_DIR:-$HOME/Documents/propops}"
LAUNCHER_DIR="${PROPOPS_LAUNCHER_DIR:-$HOME/Desktop}"
REPO_URL="${PROPOPS_REPO:-https://github.com/himanshudongre/propops.git}"
ZIP_URL="https://github.com/himanshudongre/propops/archive/refs/heads/main.zip"

# ─── OS Detection ──────────────────────────────────────────
OS=""
case "$(uname -s)" in
    Darwin*)    OS=mac;;
    Linux*)     OS=linux;;
    *)          echo "${RED}Unsupported OS: $(uname -s). This installer supports macOS and Linux.${NC}"; exit 1;;
esac

# ─── Banner ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║       PropOps Installer                ║${NC}"
echo -e "${BOLD}${BLUE}║       AI property intelligence tool    ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Installing PropOps on ${BOLD}$OS${NC}..."
echo ""

# ─── Step 1: Git ────────────────────────────────────────────
echo -e "${BLUE}[1/6]${NC} Checking for git..."
if ! command -v git >/dev/null 2>&1; then
    echo -e "  ${YELLOW}Git not found.${NC}"
    if [ "$OS" = "mac" ]; then
        echo -e "  Triggering Xcode Command Line Tools install (this will open a dialog)..."
        xcode-select --install 2>/dev/null || true
        echo -e "  ${YELLOW}Please complete the Xcode install in the popup window, then press Enter to continue.${NC}"
        read -r
    elif [ "$OS" = "linux" ]; then
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y git
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y git
        elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y git
        else
            echo -e "  ${RED}Could not auto-install git. Please install it manually and re-run this script.${NC}"
            exit 1
        fi
    fi
fi
echo -e "  ${GREEN}✓ Git available${NC}"

# ─── Step 2: Node.js ───────────────────────────────────────
echo -e "${BLUE}[2/6]${NC} Checking for Node.js..."
NODE_OK=false
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}✓ Node.js installed ($(node --version))${NC}"
        NODE_OK=true
    else
        echo -e "  ${YELLOW}Node.js version is too old ($(node --version)). Need v18+.${NC}"
    fi
fi

if [ "$NODE_OK" = false ]; then
    echo -e "  ${YELLOW}Installing Node.js...${NC}"
    if [ "$OS" = "mac" ]; then
        # Mac: use Homebrew
        if ! command -v brew >/dev/null 2>&1; then
            echo -e "  ${YELLOW}Homebrew not found. Installing Homebrew (will require your password)...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            # Add Homebrew to PATH for Apple Silicon
            if [ -f /opt/homebrew/bin/brew ]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
            fi
        fi
        brew install node
    elif [ "$OS" = "linux" ]; then
        # Linux: use fnm (Fast Node Manager)
        curl -fsSL https://fnm.vercel.app/install | bash
        export PATH="$HOME/.local/share/fnm:$PATH"
        eval "$(fnm env)" 2>/dev/null || true
        fnm install --lts
        fnm use lts-latest
    fi
    echo -e "  ${GREEN}✓ Node.js installed ($(node --version))${NC}"
fi

# ─── Step 3: Claude Code ────────────────────────────────────
echo -e "${BLUE}[3/6]${NC} Checking for Claude Code..."
if command -v claude >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Claude Code installed${NC}"
else
    echo -e "  ${YELLOW}Installing Claude Code via npm...${NC}"
    # Use -g for global install. May need sudo on some Linux systems.
    if ! npm install -g @anthropic-ai/claude-code 2>/dev/null; then
        echo -e "  ${YELLOW}Retrying with sudo...${NC}"
        sudo npm install -g @anthropic-ai/claude-code
    fi
    echo -e "  ${GREEN}✓ Claude Code installed${NC}"
fi

# ─── Step 4: Download PropOps ──────────────────────────────
echo -e "${BLUE}[4/6]${NC} Setting up PropOps..."
if [ -d "$PROPOPS_DIR/.git" ]; then
    echo -e "  ${YELLOW}Existing install found. Updating to latest...${NC}"
    cd "$PROPOPS_DIR"
    git pull --rebase origin main || echo -e "  ${YELLOW}(Update skipped — local changes detected)${NC}"
else
    if [ -d "$PROPOPS_DIR" ]; then
        echo -e "  ${YELLOW}Directory exists but is not a git repo. Moving aside to ${PROPOPS_DIR}.old${NC}"
        mv "$PROPOPS_DIR" "${PROPOPS_DIR}.old.$(date +%s)"
    fi
    mkdir -p "$(dirname "$PROPOPS_DIR")"
    echo -e "  ${YELLOW}Cloning PropOps to $PROPOPS_DIR...${NC}"
    git clone --depth 1 "$REPO_URL" "$PROPOPS_DIR"
fi
echo -e "  ${GREEN}✓ PropOps downloaded${NC}"

# ─── Step 5: Install Dependencies ──────────────────────────
cd "$PROPOPS_DIR"
echo -e "${BLUE}[5/6]${NC} Installing PropOps dependencies..."
npm install --silent
echo -e "  ${GREEN}✓ Dependencies installed${NC}"

echo -e "  ${YELLOW}Installing Playwright Chromium (this downloads ~150MB)...${NC}"
npx playwright install chromium
echo -e "  ${GREEN}✓ Playwright Chromium installed${NC}"

# ─── Step 6: Create Launcher ────────────────────────────────
echo -e "${BLUE}[6/6]${NC} Creating launcher..."

if [ "$OS" = "mac" ]; then
    mkdir -p "$LAUNCHER_DIR"
    LAUNCHER="$LAUNCHER_DIR/PropOps.command"
    cat > "$LAUNCHER" <<EOF
#!/bin/bash
# PropOps Launcher
cd "$PROPOPS_DIR"
clear
echo ""
echo "╔════════════════════════════════════════╗"
echo "║         Welcome to PropOps             ║"
echo "║                                        ║"
echo "║  Starting Claude Code...               ║"
echo "║                                        ║"
echo "║  When Claude Code opens, type:         ║"
echo "║    /propops                            ║"
echo "║                                        ║"
echo "║  First time? It will guide you         ║"
echo "║  through a quick 2-minute setup.       ║"
echo "║                                        ║"
echo "║  To quit, press Ctrl+C (twice).        ║"
echo "╚════════════════════════════════════════╝"
echo ""
sleep 2
exec claude
EOF
    chmod +x "$LAUNCHER"
    echo -e "  ${GREEN}✓ Desktop launcher: PropOps.command${NC}"
elif [ "$OS" = "linux" ]; then
    # Linux: create a small script in ~/.local/bin
    mkdir -p "$HOME/.local/bin"
    LAUNCHER="$HOME/.local/bin/propops"
    cat > "$LAUNCHER" <<EOF
#!/bin/bash
cd "$PROPOPS_DIR"
clear
echo "PropOps — starting Claude Code..."
echo "When it opens, type /propops to begin."
echo ""
sleep 1
exec claude
EOF
    chmod +x "$LAUNCHER"
    echo -e "  ${GREEN}✓ Launcher: run 'propops' from your terminal${NC}"
fi

# ─── Done ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║    PropOps installation complete!      ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}What's next:${NC}"
echo ""
echo -e "  ${BOLD}1.${NC} Make sure you have a Claude Pro or Max subscription."
echo -e "     (Sign up at ${BLUE}https://claude.ai${NC} if you don't have one.)"
echo ""
if [ "$OS" = "mac" ]; then
    echo -e "  ${BOLD}2.${NC} Double-click ${BOLD}PropOps.command${NC} on your Desktop to launch."
else
    echo -e "  ${BOLD}2.${NC} Run ${BOLD}propops${NC} from your terminal to launch."
fi
echo ""
echo -e "  ${BOLD}3.${NC} The first time Claude Code opens, it'll ask you to log in."
echo -e "     Follow the prompts (opens in your browser, 30 seconds)."
echo ""
echo -e "  ${BOLD}4.${NC} Once you're in, type:  ${BOLD}/propops${NC}"
echo -e "     PropOps will ask you a few setup questions (2 minutes) and"
echo -e "     you're ready to start checking builders and properties."
echo ""
echo -e "${YELLOW}Installed at:${NC} $PROPOPS_DIR"
echo -e "${YELLOW}Docs & help:${NC} https://github.com/himanshudongre/propops"
echo ""
