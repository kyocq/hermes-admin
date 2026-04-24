#!/bin/bash
# Hermes Admin CLI Installer
# Cross-platform installation script

set -e

REPO_URL="https://github.com/yourusername/hermes-admin"
INSTALL_DIR="$HOME/.hermes-admin"
BIN_DIR="$HOME/.local/bin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[Hermes]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS=Linux;;
        Darwin*)    OS=Mac;;
        CYGWIN*|MINGW*|MSYS*) OS=Windows;;
        *)          OS=Unknown;;
    esac
    echo "$OS"
}

# Install dependencies for different platforms
install_deps() {
    log "Checking dependencies..."
    
    if ! command_exists node; then
        error "Node.js is required but not installed. Please install Node.js 18+ first.\nVisit: https://nodejs.org/"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 18+ is required, but you have $(node --version)"
    fi
    
    success "Node.js $(node --version)"
    
    # Check for git
    if ! command_exists git; then
        warn "Git not found. Some features may not work."
    fi
}

# Download and install
download_and_install() {
    log "Installing Hermes Admin..."
    
    # Remove old installation
    if [ -d "$INSTALL_DIR" ]; then
        log "Removing old installation..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    
    # Clone or copy project
    if [ -f "./package.json" ]; then
        # Running from project directory
        log "Installing from local directory..."
        cp -r . "$INSTALL_DIR/"
    else
        # Download from GitHub (placeholder - update with actual repo)
        log "Downloading from repository..."
        git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" || error "Failed to clone repository"
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    cd "$INSTALL_DIR"
    npm install --production || error "Failed to install dependencies"
    
    # Build project
    log "Building project..."
    npm run build || error "Failed to build project"
    
    # Create launcher script
    create_launcher
    
    success "Installation complete!"
}

# Create launcher script
create_launcher() {
    LAUNCHER="$BIN_DIR/hermes-admin"
    
    cat > "$LAUNCHER" << 'EOF'
#!/bin/bash
# Hermes Admin Launcher

INSTALL_DIR="$HOME/.hermes-admin"
NODE="$(which node)"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "Error: Hermes Admin not found at $INSTALL_DIR"
    echo "Please run the installer first."
    exit 1
fi

# Parse arguments
PORT=""
NO_BROWSER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --port|-p)
            PORT="$2"
            shift 2
            ;;
        --no-browser|-n)
            NO_BROWSER="true"
            shift
            ;;
        --help|-h)
            echo "Usage: hermes-admin [options]"
            echo ""
            echo "Options:"
            echo "  -p, --port <number>  Port to run on (default: 3001)"
            echo "  -n, --no-browser     Don't open browser automatically"
            echo "  -h, --help           Show this help"
            echo ""
            echo "Examples:"
            echo "  hermes-admin"
            echo "  hermes-admin --port 8080"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build the CLI arguments for the Node script
CLI_ARGS=""
if [ -n "$PORT" ]; then
    CLI_ARGS="$CLI_ARGS --port $PORT"
fi
if [ -n "$NO_BROWSER" ]; then
    CLI_ARGS="$CLI_ARGS --no-browser"
fi

# Run the CLI
exec "$NODE" "$INSTALL_DIR/bin/hermes-admin.js" $CLI_ARGS
EOF

    chmod +x "$LAUNCHER"
    
    # Add to PATH if needed
    add_to_path
}

# Add to PATH
add_to_path() {
    local shell_rc=""
    local path_entry="export PATH=\"\$HOME/.local/bin:\$PATH\""
    
    # Detect shell
    case "$SHELL" in
        */bash) shell_rc="$HOME/.bashrc" ;;
        */zsh) shell_rc="$HOME/.zshrc" ;;
        */fish) shell_rc="$HOME/.config/fish/config.fish" ;;
        *) shell_rc="$HOME/.profile" ;;
    esac
    
    # Check if already in PATH
    if ! grep -q "$HOME/.local/bin" "$shell_rc" 2>/dev/null; then
        log "Adding ~/.local/bin to PATH in $shell_rc"
        echo "" >> "$shell_rc"
        echo "# Hermes Admin CLI" >> "$shell_rc"
        echo "$path_entry" >> "$shell_rc"
        warn "Please run: source $shell_rc"
    fi
}

# Uninstall
uninstall() {
    log "Uninstalling Hermes Admin..."
    
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        success "Removed $INSTALL_DIR"
    fi
    
    if [ -f "$BIN_DIR/hermes-admin" ]; then
        rm "$BIN_DIR/hermes-admin"
        success "Removed launcher"
    fi
    
    success "Uninstall complete!"
}

# Main
main() {
    log "Hermes Admin Installer"
    log "======================"
    
    # Check for uninstall flag
    if [ "$1" = "--uninstall" ]; then
        uninstall
        exit 0
    fi
    
    # Detect OS
    OS=$(detect_os)
    log "Detected OS: $OS"
    
    # Install
    install_deps
    download_and_install
    
    echo ""
    success "Hermes Admin is ready!"
    echo ""
    log "Usage:"
    log "  hermes-admin           Start the admin dashboard"
    log "  hermes-admin --help    Show help"
    echo ""
    log "The dashboard will be available at http://localhost:3001"
}

# Run
main "$@"
