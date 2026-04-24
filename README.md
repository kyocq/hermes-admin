# Hermes Admin

[![npm version](https://img.shields.io/npm/v/hermes-admin.svg)](https://www.npmjs.com/package/hermes-admin)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%5E18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0-blue.svg)](https://www.typescriptlang.org/)

A modern, real-time web dashboard for managing your [Hermes](https://github.com/streety/hyperagent) AI agent. Built with React, TypeScript, and Tailwind CSS.

![Dashboard Preview](https://raw.githubusercontent.com/streety/hyperagent/main/docs/images/admin-dashboard.png)

## Features

### Real-time System Monitoring
- **CPU**: Core usage, load averages, processor details
- **Memory**: Total, used, free with visual progress bars
- **Disk**: Usage statistics and health monitoring
- **Process**: Uptime and resource consumption

### Session Management
- Browse all conversation sessions with pagination
- Filter by source (WeChat, CLI, Telegram, Discord, etc.)
- Full-text search across messages
- View detailed message history with token usage
- Delete sessions individually or in batch
- Rename sessions for better organization

### Interactive Chat
- Built-in chat interface powered by Hermes CLI
- Stream responses in real-time
- Resume previous sessions
- Automatic session creation

### Skills & Tools
- View all available agent skills
- Browse skill documentation
- Category-based organization

### Cron Job Management
- List all scheduled tasks
- View job details and schedules
- Check execution history

### Configuration
- View current agent settings
- Edit configuration safely (with secret masking)
- Model provider management

### Additional Features
- **Dark/Light Theme**: Automatic system preference detection
- **Multi-language**: i18n support (English, Chinese, more coming)
- **Responsive**: Works on desktop and mobile devices
- **TypeScript**: Full type safety throughout

## Prerequisites

- **Node.js** 18 or higher
- **Hermes Agent** installed and configured (`~/.hermes/` directory exists)
- **SQLite3** CLI (for database queries)

## Installation

### Global Installation (Recommended)

```bash
npm install -g hermes-admin
hermes-admin
```

### Local Installation

```bash
npm install hermes-admin
npx hermes-admin
```

### Development Setup

```bash
git clone https://github.com/yourusername/hermes-admin.git
cd hermes-admin
npm install
npm run dev          # Frontend development server
npm run serve        # Backend API server
```

## Usage

### CLI Commands

```bash
# Start the dashboard (default)
hermes-admin
hermes-admin web
hermes-admin start

# With options
hermes-admin --port 8080           # Custom port
hermes-admin --no-browser          # Don't auto-open browser
hermes-admin --skip-install        # Skip dependency check
hermes-admin --skip-build          # Skip build step

# Other commands
hermes-admin --version             # Show version
hermes-admin --help                # Show help
```

### Accessing the Dashboard

Once started, open your browser at:
- Local: `http://localhost:3001` (or your custom port)
- Network: Check CLI output for network URLs

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│   Express API   │────▶│   Hermes CLI    │
│   (Frontend)    │◄────│   (Backend)     │◄────│   (Agent Core)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ SQLite  │          │  YAML    │          │  JSON    │
   │ state.db│          │ config   │          │  files   │
   └─────────┘          └──────────┘          └──────────┘
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health status |
| `/api/system` | GET | Real-time system stats (CPU, memory, disk) |
| `/api/stats` | GET | Dashboard statistics overview |
| `/api/sessions` | GET | List sessions with filters |
| `/api/sessions/:id` | GET | Session details with messages |
| `/api/sessions/:id` | PUT | Update session title |
| `/api/sessions/:id` | DELETE | Delete a session |
| `/api/sessions/batch-delete` | POST | Delete multiple sessions |
| `/api/search` | GET | Full-text search messages |
| `/api/chat` | POST | Start streaming chat (SSE) |
| `/api/config` | GET/PUT | Read/Update configuration |
| `/api/cron` | GET | List cron jobs |
| `/api/skills` | GET | List all skills |
| `/api/processes` | GET | Background processes |
| `/api/memory` | GET/POST | Memory management |

### Data Sources

Hermes Admin reads directly from your local Hermes installation:

| Path | Type | Data |
|------|------|------|
| `~/.hermes/state.db` | SQLite | Sessions, messages, token usage |
| `~/.hermes/config.yaml` | YAML | Agent configuration |
| `~/.hermes/sessions/sessions.json` | JSON | Live session mappings |
| `~/.hermes/gateway_state.json` | JSON | Platform connection status |
| `~/.hermes/processes.json` | JSON | Background process tracking |
| `~/.hermes/memories/` | Directory | Persistent memory files |

## Security

- **No Shell Injection**: All CLI calls use `execFile` with argument arrays
- **SQL Injection Protection**: Parameterized queries with proper escaping
- **Secret Masking**: API keys and tokens are masked in UI
- **Input Validation**: Strict validation on all user inputs
- **Session ID Sanitization**: Only alphanumeric + underscore allowed

## Development

### Project Structure

```
hermes-admin/
├── bin/hermes-admin.js      # CLI entry point
├── server.cjs                # Express API server
├── src/
│   ├── api/                  # API client functions
│   ├── components/           # Reusable UI components
│   ├── components/ui/        # Base UI components (Card, Button, etc.)
│   ├── pages/                # Page components (Dashboard, Sessions, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── i18n/                 # Translation files
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── public/                   # Static assets
├── dist/                     # Production build (generated)
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### Available Scripts

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production	npm run preview      # Preview production build
npm run serve        # Start Express API server (port 3001)
npm start            # Build + start production server
```

### Adding Translations

1. Edit `src/i18n/index.ts`
2. Add new language to `resources` object
3. Create translation file in `src/i18n/locales/[lang].json`

## Troubleshooting

### Port Already in Use

```bash
# Hermes will automatically find an available port
# Or specify a custom port:
hermes-admin --port 8080
```

### Dependencies Not Found

```bash
# The CLI will auto-install dependencies
# Or manually install:
cd $(npm root -g)/hermes-admin
npm install
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Database Errors

Ensure SQLite3 CLI is installed:
```bash
# macOS
brew install sqlite3

# Ubuntu/Debian
sudo apt-get install sqlite3

# Verify
sqlite3 --version
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE) © Hermes Admin Contributors

## Acknowledgments

- Built with [Vite](https://vitejs.dev/), [React](https://react.dev/), and [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Charts by [Recharts](https://recharts.org/)
- Powered by [Hermes Agent](https://github.com/streety/hyperagent)

---

<p align="center">
  Made with ❤️ for the Hermes community
</p>
