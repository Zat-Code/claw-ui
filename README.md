# Claw UI - OpenClaw Configuration Manager

A modern web UI for managing OpenClaw configuration, built with React + Vite + Tailwind CSS.

<p align="center">
  <img src="https://img.shields.io/github/license/Zat-Code/claw-ui" alt="License">
  <img src="https://img.shields.io/github/stars/Zat-Code/claw-ui" alt="Stars">
  <img src="https://img.shields.io/github/issues/Zat-Code/claw-ui" alt="Issues">
</p>

## Features

- **Dashboard**: Overview of gateway status, cron jobs, agents, and channels
- **Configuration**: Edit `openclaw.json` with JSON schema validation
- **Cron Jobs**: Create, update, enable/disable, run, and delete scheduled tasks
- **Agents**: View configured agents and their identities
- **Channels**: Monitor connection status of Telegram, Discord, and other channels
- **Sessions**: Browse active conversation sessions

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenClaw Gateway running

### Installation

```bash
# Clone the repository
git clone https://github.com/Zat-Code/claw-ui.git
cd claw-ui
```

### Configuration

1. **Network Setup**: Ensure the `openclaw-network` Docker network exists:

```bash
docker network create openclaw-network 2>/dev/null || true
```

2. **Gateway Token**: Get your gateway token:

```bash
# Option 1: From OpenClaw config
cat ~/.openclaw/openclaw.json | grep -A5 '"token"'

# Option 2: Generate new token
openclaw doctor --generate-gateway-token
```

3. **Allow UI Access in Gateway**: Edit your OpenClaw config to allow the UI's IP and port:

In your OpenClaw configuration (`~/.openclaw/openclaw.json`), add:

```json
{
  "gateway": {
    "allowedOrigins": ["http://localhost:5173", "http://YOUR_UI_IP:5173"],
    "allowedIps": ["127.0.0.1", "YOUR_UI_IP"]
  }
}
```

Then restart the gateway:
```bash
openclaw gateway restart
```

4. **Environment Variables**: Create a `.env` file:

```bash
cp .env.example .env
# Edit .env and set your GATEWAY_TOKEN
```

Example `.env`:
```bash
GATEWAY_TOKEN=your-token-here
```

### Running with Docker

#### Development

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Access at: `http://localhost:5173`

#### Production

```bash
docker-compose up --build -d
```

Access at: `http://localhost:5173`

### Running Locally (without Docker)

```bash
# Install dependencies
cd ui && npm install

# Start dev server
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GATEWAY_URL` | WebSocket URL to gateway | `ws://localhost:18789` |
| `VITE_GATEWAY_TOKEN` | Gateway authentication token | Required |

### Docker Network

The UI connects to OpenClaw via the `openclaw-network` Docker network. Make sure:

1. The network exists: `docker network create openclaw-network`
2. Both containers (OpenClaw & Claw UI) are on the same network
3. The Gateway allows connections from the UI's IP

### Gateway Permissions

In your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "gateway": {
    "host": "0.0.0.0",
    "port": 18789,
    "allowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    "allowedIps": [
      "127.0.0.1",
      "172.16.0.0/12"  # Docker network range
    ]
  }
}
```

## Architecture

```
claw-ui/
├── ui/                    # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/
│   │   │   ├── gateway.ts # WebSocket client
│   │   │   ├── store.ts   # Zustand state management
│   │   │   └── format.ts  # Formatting utilities
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker-compose.yml     # Production compose
├── docker-compose.dev.yml # Development compose
├── .env                  # Environment config
└── .env.example          # Environment template
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **Ajv** - JSON schema validation

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Open an issue on [GitHub](https://github.com/Zat-Code/claw-ui/issues)
- Join the [OpenClaw Discord](https://discord.com/invite/clawd)
