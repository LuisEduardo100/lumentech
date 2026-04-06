# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**Google APIs:**
- Google Sheets API (v4) - Source of truth for business deal/sales data
  - SDK/Client: `google_api_sheets` 0.35.0 via `goth` 1.4.5
  - Auth: Service account with JWT tokens
  - Endpoints: `https://sheets.googleapis.com/v4/spreadsheets/`
  - Scopes: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.readonly`
  - Implementation: `backend/lib/lumentech_monitor/data_ingestion/sheet_client.ex`
  - Implementation: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex`

- Google Drive API (v3) - Metadata checks for spreadsheet modification time
  - SDK/Client: Finch HTTP client (goth handles auth)
  - Auth: Same service account JWT tokens
  - Endpoints: `https://www.googleapis.com/drive/v3/files/{id}?fields=modifiedTime`
  - Purpose: Optimization - check if sheet changed before full fetch
  - Implementation: `backend/lib/lumentech_monitor/data_ingestion/sheet_client.ex` (check_modified/3)

## Data Storage

**Databases:**
- Google Sheets - Primary data store for sales/deals
  - Connection: REST API with Bearer token authentication
  - Client: `goth` for token generation, `finch` for HTTP requests
  - Schema: 12 columns (A-L): Unique ID, Pedido Original, Data Emissão, Cliente, Categoria, Origem, Produto, Valor, Status, Data Fechamento, Cidade, Estado
  - Range: A2:L (header in row 1)
  - Operations: Read (GET), Append (POST), Update (PUT), Delete (batchUpdate)

**File Storage:**
- Local filesystem - Google credentials JSON file
  - Location: `/app/config/google_credentials.json` (production) or `../google_credentials.json` or `google_credentials.json` (development)
  - Type: Service account credentials (sensitive - never committed to git)
  - Loading: `backend/config/runtime.exs` via `GOOGLE_APPLICATION_CREDENTIALS_JSON` env var or file path

**Caching:**
- In-memory cache via GenServer `DealStore`
  - Location: `backend/lib/lumentech_monitor/data/deal_store.ex`
  - Strategy: Cache-aside pattern
  - Invalidation: On webhook updates from sheets or manual refresh

## Authentication & Identity

**Auth Provider:**
- Google Service Account (OAuth 2.0 JWT Bearer Grant)
  - Implementation: `backend/lib/lumentech_monitor/google_auth.ex`
  - Approach: Custom GenServer handling token refresh
  - Token Management:
    - Initial fetch on application startup
    - Automatic refresh 5 minutes before expiration
    - Retry on failure (10s backoff)
  - Clock Drift Handling: 20-minute VPS clock drift offset applied in production only
  - Scopes:
    - `https://www.googleapis.com/auth/spreadsheets` (read/write)
    - `https://www.googleapis.com/auth/drive.readonly` (metadata read)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar error reporting

**Logs:**
- Logger console output with request IDs
  - Configuration: `backend/config/config.exs`
  - Format: `$time $metadata[$level] $message\n`
  - Metadata: `:request_id`
  - Levels used throughout: Logger.info, Logger.warn, Logger.error, Logger.debug

## CI/CD & Deployment

**Hosting:**
- Docker Swarm (multi-service orchestration)
- Traefik reverse proxy (HTTPS, SSL termination, routing)
- Let's Encrypt certificate resolver integration
- Domain: `syslumen.aled1.com`

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or Jenkins configured

**Deployment Configuration:**
- File: `syslumen.yaml` (Docker Compose v3.8 format for Swarm)
- Services:
  - Frontend: Node 18-alpine builder → nginx:alpine (port 80)
  - Backend: Elixir 1.16.1 → Debian bullseye (port 4000)
- Routing:
  - Frontend: `Host(syslumen.aled1.com)` → Nginx
  - Backend: `Host(syslumen.aled1.com) && (PathPrefix(/socket) || PathPrefix(/api))` → Elixir
- Configs: Google credentials mounted as Docker config (read-only)

## Environment Configuration

**Required env vars:**

Backend (from `syslumen.yaml`):
- `SPREADSHEET_ID` - Google Sheets document ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to credentials file (set to `/app/config/google_credentials.json`)
- `MIX_ENV` - Set to `prod` for production
- `PORT` - HTTP server port (4000)
- `PHX_HOST` - Hostname (syslumen.aled1.com)

Backend development (from `.env` or `.env.prod.example`):
- `PORT` - Server port
- `PHX_HOST` - Host for URL generation
- `SPREADSHEET_ID` - Sheets document ID
- `GOOGLE_JSON` or `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Inline JSON or file path
- `SECRET_KEY_BASE` - Generate with `mix phx.gen.secret`

Frontend (Docker build):
- `VITE_API_URL` - Backend API base URL (e.g., `https://syslumen.aled1.com`)

**Secrets location:**
- Production: Docker configs (managed by Swarm)
- Development: `.env` file (should NOT be committed, ignored in `.gitignore`)
- Credentials file: `google_credentials.json` (ignored in `.gitignore`, mounted at runtime)

## Webhooks & Callbacks

**Incoming:**
- Webhook endpoint: `POST /api/webhooks/sheets`
  - Location: `backend/lib/lumentech_monitor_web/controllers/webhook_controller.ex`
  - Purpose: Handle Google Sheets update notifications
  - Processing: Triggers data refresh and cache invalidation

**Outgoing:**
- None detected - Application does not call external webhooks

## Data Flow

**Read Path:**
1. Frontend makes `axios` request to `GET /api/health/deals`
2. Backend controller calls `LumentechMonitor.Data.GoogleSheetsProvider`
3. Provider checks cache in `DealStore`
4. If cache miss or stale, `GoogleSheets` adapter fetches from sheets
5. Adapter uses `GoogleAuth` to get fresh token
6. Adapter calls Sheets API: `GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/A2:L`
7. Optional optimization: Drive API metadata check for modification time
8. Response mapped to Deal struct and returned to frontend
9. Frontend renders with echarts for visualization

**Write Path:**
1. Frontend submits deal update to `POST /api/webhooks/sheets` or API endpoint
2. Backend calls `GoogleSheets` adapter (append_deal, update_row, update_status, delete_deal)
3. Adapter generates/manages row IDs (sequential or composite)
4. Adapter constructs proper range (e.g., A2:L2) for target row
5. Request sent to Sheets API with PUT/POST/batchUpdate
6. Cache invalidated on success
7. WebSocket broadcast via PubSub to connected clients

**Token Refresh Flow:**
1. `GoogleAuth` GenServer calculates expiration time from JWT claims
2. Schedules refresh 5 minutes before expiration
3. On refresh message, fetches new token from `https://oauth2.googleapis.com/token`
4. Updates internal state with new token
5. Reschedules next refresh
6. On failure, retries in 10 seconds

---

*Integration audit: 2026-04-06*
