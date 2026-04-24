#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

// Get package version
const packageJson = require('../package.json');
const VERSION = packageJson.version;

// Track start time
const startTime = Date.now();

// CLI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function logStep(status, message) {
  const icons = {
    check: `${colors.green}✓${colors.reset}`,
    info: `${colors.cyan}ℹ${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  };
  console.log(`${icons[status]} ${message}`);
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}Hermes Admin CLI v${VERSION}${colors.reset}

${colors.bright}Usage:${colors.reset}
  hermes-admin [options]

${colors.bright}Options:${colors.reset}
  -v, --version     Show version number
  -h, --help        Show this help message
  -p, --port <port> Specify port (default: 3001)

${colors.bright}Examples:${colors.reset}
  hermes-admin              # Start on default port 3001
  hermes-admin -p 8080        # Start on port 8080
  hermes-admin --version      # Show version
`);
}

// Show version
function showVersion() {
  console.log(`${colors.bright}Hermes Admin CLI v${VERSION}${colors.reset}`);
}

// Open browser
function openBrowser(url) {
  const platform = os.platform();
  const commands = {
    darwin: ['open', url],
    win32: ['start', url],
    linux: ['xdg-open', url],
  };
  
  const cmd = commands[platform];
  if (cmd) {
    try {
      const proc = spawn(cmd[0], cmd.slice(1), { detached: true, stdio: 'ignore' });
      proc.on('error', () => {
        // Silently ignore browser open errors
      });
      logStep('check', `Browser opened: ${url}`);
    } catch (error) {
      logStep('info', `Please open manually: ${url}`);
    }
  }
}

// Check if port is available
function findAvailablePort(preferredPort) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(preferredPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Port in use, try random port
      const testServer = http.createServer();
      testServer.listen(0, () => {
        const port = testServer.address().port;
        testServer.close(() => resolve(port));
      });
    });
  });
}

// Start the server
async function startServer(projectRoot, port) {
  const actualPort = await findAvailablePort(port);
  
  // server.cjs is in the parent directory (package root), not in bin/
  const serverPath = path.join(projectRoot, '..', 'server.cjs');
  
  // Set environment variables
  const env = {
    ...process.env,
    PORT: actualPort.toString(),
    NODE_ENV: 'production',
  };
  
  // Start the server - cwd should be the package root (parent of bin)
  const server = spawn('node', [serverPath], {
    cwd: path.join(projectRoot, '..'),
    env,
    stdio: 'pipe',
  });
  
  return new Promise((resolve, reject) => {
    let started = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      // Debug: show server output in development
      if (process.env.DEBUG) {
        console.log(`[server stdout] ${output.trim()}`);
      }
      if (output.includes('Server running') || output.includes('running on http') || output.includes('3001')) {
        if (!started) {
          started = true;
          resolve({ server, port: actualPort });
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (process.env.DEBUG) {
        console.log(`[server stderr] ${output.trim()}`);
      }
    });
    
    server.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!started) {
        resolve({ server, port: actualPort });
      }
    }, 5000);
  });
}

// Check Node.js version
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    logStep('error', `Node.js ${version} is too old. Please upgrade to 18+`);
    process.exit(1);
  }
  logStep('check', `Node.js ${version}`);
}

// Check dependencies
function checkDependencies(projectRoot) {
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    logStep('info', 'Installing dependencies...');
    try {
      execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
      logStep('check', 'Dependencies ready');
    } catch (error) {
      logStep('error', 'Failed to install dependencies');
      process.exit(1);
    }
  } else {
    logStep('check', 'Dependencies ready');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: parseInt(process.env.PORT) || 3001,
    showHelp: false,
    showVersion: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        options.showHelp = true;
        break;
      case '-v':
      case '--version':
        options.showVersion = true;
        break;
      case '-p':
      case '--port':
        if (args[i + 1]) {
          options.port = parseInt(args[i + 1]);
          i++;
        }
        break;
    }
  }

  return options;
}

// Main function
async function main() {
  // Parse arguments first
  const options = parseArgs();

  // Handle help and version
  if (options.showHelp) {
    showHelp();
    process.exit(0);
  }

  if (options.showVersion) {
    showVersion();
    process.exit(0);
  }

  console.log(`
${colors.bright}${colors.cyan}╔══════════════════════════════════════╗
║     Hermes Admin CLI v${VERSION}        ║
╚═══════════════════════════════════════╝${colors.reset}
`);

  const projectRoot = __dirname;

  // Check Node.js version
  checkNodeVersion();

  // Check dependencies
  checkDependencies(projectRoot);

  // Start the server
  logStep('info', 'Starting server...');
  
  try {
    const { server, port: actualPort } = await startServer(projectRoot, options.port);
    
    const url = `http://localhost:${actualPort}`;
    
    console.log(`
${colors.green}${colors.bright}─────────────────────────────────────${colors.reset}
${colors.green}  🚀  Hermes Admin is ready!${colors.reset}
${colors.cyan}  📍  URL: ${url}${colors.reset}
${colors.dim}  ⏱️   Started in ${((Date.now() - startTime) / 1000).toFixed(1)}s${colors.reset}
${colors.green}${colors.bright}─────────────────────────────────────${colors.reset}
`);

    // Open browser
    openBrowser(url);

    console.log(`${colors.dim}Press Ctrl+C to stop${colors.reset}\n`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
      server.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      server.kill();
      process.exit(0);
    });

  } catch (error) {
    console.log(`
${colors.red}${colors.bright}─────────────────────────────────────${colors.reset}
${colors.red}  ❌  Failed to start${colors.reset}
${colors.dim}   ${error.message}${colors.reset}
${colors.red}${colors.bold}─────────────────────────────────────${colors.reset}
`);
    process.exit(1);
  }
}

// Run main
main();
