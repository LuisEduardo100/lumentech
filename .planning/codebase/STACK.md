# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- Elixir 1.16.1 - Backend API server and business logic
- TypeScript 5.0.2 - Frontend UI components and type safety
- JavaScript (ES2020+) - Build system and development tooling

**Secondary:**
- Dockerfile (multi-stage builds) - Containerization for both frontend and backend

## Runtime

**Environment:**
- OTP (Erlang) 26.2.2 - Elixir VM runtime
- Node.js 18-alpine - Frontend build and package management
- Debian bullseye-20240130-slim - Production backend runtime container

**Package Manager:**
- Mix 1.16.1 - Elixir dependency management
- npm (via npm ci) - Node.js dependency management
- Lockfiles: `backend/mix.lock`, `frontend/package-lock.json`

## Frameworks

**Core:**
- Phoenix 1.8.3 - Web framework for REST API and WebSocket server
- React 18.2.0 - Frontend UI component library
- Vite 4.4.5 - Frontend build tool and dev server

**Testing:**
- None currently in place - No Jest, Vitest, or ExUnit test configurations detected

**Build/Dev:**
- TypeScript 5.0.2 - Compilation and type checking
- Vite with @vitejs/plugin-react 4.0.0 - Fast build and HMR
- Tailwind CSS 3.3.5 - Utility-first CSS framework
- PostCSS 8.4.31 with autoprefixer 10.4.16 - CSS preprocessing

## Key Dependencies

**Critical:**

- `goth` 1.4.5 - Google OAuth authentication and JWT token generation
- `google_api_sheets` 0.35.0 - Official Google Sheets API client library
- `finch` 0.21.0 - HTTP client for external API requests (Google Drive, Sheets)
- `phoenix_pubsub` 2.2.0 - Real-time pub/sub for WebSocket communication
- `plug_cowboy` 2.7.5 - HTTP adapter and web server

**Infrastructure:**

- `jason` 1.4.4 - JSON encoding/decoding
- `cors_plug` 3.0.3 - CORS middleware for cross-origin requests
- `dotenvy` 0.8 - Environment variable loading (.env file support)
- `jose` 1.11.12 - JWT and cryptographic operations (dependency of goth)
- axios 1.6.0 - HTTP client for frontend API calls
- echarts 5.4.3 + echarts-for-react 3.0.2 - Data visualization for dashboards
- lucide-react 0.292.0 - Icon library for UI components
- phoenix 1.7.0 (frontend) - WebSocket client library (different from backend package)
- date-fns 2.30.0 - Date manipulation and formatting utilities

## Configuration

**Environment:**

Backend configuration loaded in `backend/config/runtime.exs`:
- `PORT` - HTTP server port (default: 4000)
- `PHX_HOST` - Hostname for production (syslumen.aled1.com)
- `SPREADSHEET_ID` - Google Sheets ID for data source
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` - Service account credentials
- `MIX_ENV` - Environment (dev, test, prod)
- `SECRET_KEY_BASE` - Phoenix session encryption key

Frontend environment:
- `VITE_API_URL` - Backend API base URL (built into Docker image)

**Build:**

- `backend/config/config.exs` - Phoenix, logger, and module configuration
- `backend/config/runtime.exs` - Runtime environment variable binding
- `frontend/vite.config.ts` - Vite build configuration with React plugin
- `frontend/tsconfig.json` - TypeScript compilation targets (ES2020, React JSX)
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/postcss.config.js` - PostCSS pipeline setup
- `syslumen.yaml` - Docker Swarm deployment configuration

## Platform Requirements

**Development:**

- Elixir 1.14+ with Mix
- Node.js 18+
- Google Cloud Service Account JSON credentials file
- Spreadsheet ID for Google Sheets data source
- Local development port 4000 (backend) and Vite dev server

**Production:**

- Docker and Docker Swarm (multi-stage builds)
- Traefik reverse proxy (for HTTPS and routing)
- Let's Encrypt certificates via Traefik
- External network `network_public` (Docker Swarm)
- Domain: syslumen.aled1.com
- Google Cloud credentials mounted as Docker config

## Deployment Architecture

**Frontend:**
- Multi-stage Docker build: Node 18-alpine builder → nginx:alpine runtime
- Static assets served by Nginx on port 80
- Traefik routing from `syslumen.aled1.com/` to Nginx
- Environment passed via Docker build arg `VITE_API_URL`

**Backend:**
- Multi-stage Docker build: hexpm/elixir:1.16.1-erlang-26.2.2 → debian:bullseye runtime
- Mix release binary compiled in prod environment
- Runs on port 4000 with `PHX_SERVER=true`
- Traefik routing from `syslumen.aled1.com/socket` and `/api` paths
- Google credentials mounted as Docker secret at `/app/config/google_credentials.json`

---

*Stack analysis: 2026-04-06*
