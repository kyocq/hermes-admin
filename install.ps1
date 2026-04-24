# Hermes Admin PowerShell Installer
# Run: iwr -useb https://raw.githubusercontent.com/yourusername/hermes-admin/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$INSTALL_DIR = "$env:USERPROFILE\.hermes-admin"
$BIN_DIR = "$env:LOCALAPPDATA\Microsoft\WindowsApps"
$REPO_URL = "https://github.com/yourusername/hermes-admin"

function Write-Info { param($Message) Write-Host "[Hermes] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }

# Check Node.js
function Check-Node {
    Write-Info "Checking Node.js..."
    try {
        $nodeVersion = node --version
        $major = [int]($nodeVersion -replace 'v','').Split('.')[0]
        if ($major -lt 18) {
            Write-Error "Node.js 18+ required, but found $nodeVersion"
        }
        Write-Success "Node.js $nodeVersion"
    } catch {
        Write-Error "Node.js is required. Please install from https://nodejs.org/"
    }
}

# Download and install
function Install {
    Write-Info "Installing Hermes Admin..."
    
    # Remove old installation
    if (Test-Path $INSTALL_DIR) {
        Write-Info "Removing old installation..."
        Remove-Item -Recurse -Force $INSTALL_DIR
    }
    
    # Create directory
    New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
    
    # Check if running from source
    if (Test-Path "$PSScriptRoot\package.json") {
        Write-Info "Installing from local directory..."
        Copy-Item -Recurse "$PSScriptRoot\*" $INSTALL_DIR
    } else {
        # Download from GitHub
        Write-Info "Downloading from GitHub..."
        $zipUrl = "$REPO_URL/archive/refs/heads/main.zip"
        $zipPath = "$env:TEMP\hermes-admin.zip"
        
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
        
        $extractedPath = "$env:TEMP\hermes-admin-main"
        Copy-Item -Recurse "$extractedPath\*" $INSTALL_DIR
        
        Remove-Item $zipPath -Force
        Remove-Item $extractedPath -Recurse -Force
    }
    
    # Install dependencies
    Write-Info "Installing dependencies..."
    Push-Location $INSTALL_DIR
    try {
        npm install | Out-Null
    } finally {
        Pop-Location
    }
    
    # Build project
    Write-Info "Building project..."
    Push-Location $INSTALL_DIR
    try {
        npm run build | Out-Null
    } finally {
        Pop-Location
    }
    
    # Create batch wrapper
    $batchContent = @"
@echo off
node "$INSTALL_DIR\bin\hermes-admin.js" %*
"@
    Set-Content -Path "$BIN_DIR\hermes-admin.bat" -Value $batchContent
    
    # Create PowerShell wrapper
    $psContent = @"
& node "$INSTALL_DIR\bin\hermes-admin.js" `@args
"@
    Set-Content -Path "$BIN_DIR\hermes-admin.ps1" -Value $psContent
    
    Write-Success "Installation complete!"
    Write-Host ""
    Write-Info "Usage:"
    Write-Host "  hermes-admin           Start the admin dashboard"
    Write-Host "  hermes-admin --help    Show help"
    Write-Host ""
    Write-Info "The dashboard will be available at http://localhost:3001"
}

# Uninstall
function Uninstall {
    Write-Info "Uninstalling Hermes Admin..."
    
    if (Test-Path $INSTALL_DIR) {
        Remove-Item -Recurse -Force $INSTALL_DIR
        Write-Success "Removed $INSTALL_DIR"
    }
    
    $batchPath = "$BIN_DIR\hermes-admin.bat"
    $psPath = "$BIN_DIR\hermes-admin.ps1"
    
    if (Test-Path $batchPath) {
        Remove-Item $batchPath -Force
        Write-Success "Removed batch wrapper"
    }
    
    if (Test-Path $psPath) {
        Remove-Item $psPath -Force
        Write-Success "Removed PowerShell wrapper"
    }
    
    Write-Success "Uninstall complete!"
}

# Main
function Main {
    Write-Host ""
    Write-Host "  Hermes Admin Installer"
    Write-Host "  ======================="
    Write-Host ""
    
    # Check for uninstall flag
    if ($args -contains "--uninstall") {
        Uninstall
        return
    }
    
    Check-Node
    Install
}

Main @args
