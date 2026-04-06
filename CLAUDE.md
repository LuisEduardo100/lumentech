<!-- GSD:project-start source:PROJECT.md -->
## Project

**Lumentech Dashboard KPI Enhancement**

Enhancement of the existing Lumentech monitoring/CRM dashboard to add annual KPI cards (budget/closed), date filters, and month-over-month percentage comparisons. The system is used by consultants to track sales performance and business metrics.

**Core Value:** Consultants can see both monthly and annual financial performance at a glance, with flexible date filtering, without scrolling.

### Constraints

- **Tech stack**: Must use existing Elixir/Phoenix + React stack
- **Layout**: Everything must fit on screen without scrolling
- **Data source**: Google Sheets remains the data source
- **Compatibility**: Must not break existing dashboard functionality
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Elixir 1.16.1 - Backend API server and business logic
- TypeScript 5.0.2 - Frontend UI components and type safety
- JavaScript (ES2020+) - Build system and development tooling
- Dockerfile (multi-stage builds) - Containerization for both frontend and backend
## Runtime
- OTP (Erlang) 26.2.2 - Elixir VM runtime
- Node.js 18-alpine - Frontend build and package management
- Debian bullseye-20240130-slim - Production backend runtime container
- Mix 1.16.1 - Elixir dependency management
- npm (via npm ci) - Node.js dependency management
- Lockfiles: `backend/mix.lock`, `frontend/package-lock.json`
## Frameworks
- Phoenix 1.8.3 - Web framework for REST API and WebSocket server
- React 18.2.0 - Frontend UI component library
- Vite 4.4.5 - Frontend build tool and dev server
- None currently in place - No Jest, Vitest, or ExUnit test configurations detected
- TypeScript 5.0.2 - Compilation and type checking
- Vite with @vitejs/plugin-react 4.0.0 - Fast build and HMR
- Tailwind CSS 3.3.5 - Utility-first CSS framework
- PostCSS 8.4.31 with autoprefixer 10.4.16 - CSS preprocessing
## Key Dependencies
- `goth` 1.4.5 - Google OAuth authentication and JWT token generation
- `google_api_sheets` 0.35.0 - Official Google Sheets API client library
- `finch` 0.21.0 - HTTP client for external API requests (Google Drive, Sheets)
- `phoenix_pubsub` 2.2.0 - Real-time pub/sub for WebSocket communication
- `plug_cowboy` 2.7.5 - HTTP adapter and web server
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
- `PORT` - HTTP server port (default: 4000)
- `PHX_HOST` - Hostname for production (syslumen.aled1.com)
- `SPREADSHEET_ID` - Google Sheets ID for data source
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` - Service account credentials
- `MIX_ENV` - Environment (dev, test, prod)
- `SECRET_KEY_BASE` - Phoenix session encryption key
- `VITE_API_URL` - Backend API base URL (built into Docker image)
- `backend/config/config.exs` - Phoenix, logger, and module configuration
- `backend/config/runtime.exs` - Runtime environment variable binding
- `frontend/vite.config.ts` - Vite build configuration with React plugin
- `frontend/tsconfig.json` - TypeScript compilation targets (ES2020, React JSX)
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/postcss.config.js` - PostCSS pipeline setup
- `syslumen.yaml` - Docker Swarm deployment configuration
## Platform Requirements
- Elixir 1.14+ with Mix
- Node.js 18+
- Google Cloud Service Account JSON credentials file
- Spreadsheet ID for Google Sheets data source
- Local development port 4000 (backend) and Vite dev server
- Docker and Docker Swarm (multi-stage builds)
- Traefik reverse proxy (for HTTPS and routing)
- Let's Encrypt certificates via Traefik
- External network `network_public` (Docker Swarm)
- Domain: syslumen.aled1.com
- Google Cloud credentials mounted as Docker config
## Deployment Architecture
- Multi-stage Docker build: Node 18-alpine builder → nginx:alpine runtime
- Static assets served by Nginx on port 80
- Traefik routing from `syslumen.aled1.com/` to Nginx
- Environment passed via Docker build arg `VITE_API_URL`
- Multi-stage Docker build: hexpm/elixir:1.16.1-erlang-26.2.2 → debian:bullseye runtime
- Mix release binary compiled in prod environment
- Runs on port 4000 with `PHX_SERVER=true`
- Traefik routing from `syslumen.aled1.com/socket` and `/api` paths
- Google credentials mounted as Docker secret at `/app/config/google_credentials.json`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Elixir modules: snake_case with descriptive names (`deal_store.ex`, `google_sheets.ex`, `webhook_controller.ex`)
- React components: PascalCase for component files (`CreateOrderModal.tsx`, `KPICard.tsx`, `MapChart.tsx`)
- React utility/hook files: camelCase (`useDashboardChannel.ts`, `dashboardLogic.ts`)
- Test files: append `_test.exs` for Elixir tests
- Elixir: snake_case for all functions (`fetch_all_deals`, `append_deal`, `update_status`, `normalize_payload`)
- Elixir: Prefix internal functions with `defp` and typically name them with `_internal` suffix for implementation details
- React/TypeScript: camelCase for functions (`calculateMetrics`, `handleCreateOrder`, `handleUpdateStatus`)
- Handler functions: prefix with `handle` followed by action name (`handleChange`, `handleSubmit`, `handleDeleteRow`)
- Elixir: snake_case for all variables and state atoms (`safe_pedido`, `composite_id`, `auth_header`)
- Elixir: Maps use string keys for data from external sources (`r["id"]`, `r["status"]`) and atom keys for internal state
- React/TypeScript: camelCase for all variables (`isConnected`, `formData`, `selectedState`, `isLoading`)
- Boolean variables: prefix with `is` or use status indicators (`isDark`, `isOpen`, `exists?`)
- Elixir: Module names are PascalCase (`LumentechMonitor.Data.DealStore`, `LumentechMonitorWeb.DashboardChannel`)
- Elixir: Behaviour modules define contracts without implementation (`LumentechMonitor.Data.SalesProvider`)
- TypeScript: Interface names PascalCase (`KPICardProps`, `SheetRow`, `DashboardMetrics`)
- TypeScript: Type aliases for union types (`type Theme = 'orange' | 'black' | 'slate'`)
## Code Style
- Elixir: Uses standard Mix formatter (no custom `.formatter.exs` detected)
- TypeScript: Uses Vite for bundling, no explicit prettier/eslint config but strict TypeScript enabled
- TypeScript strict mode: `strict: true` in `tsconfig.json` enforces null checks and type safety
- Elixir: Uses `@impl true` attributes to mark callback implementations
- TypeScript: `noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig - unused code is allowed
- TypeScript: `noFallthroughCasesInSwitch: true` enforces switch completeness
- Tailwind CSS: Configured with custom theme colors (`lumentech: { gold: "#f75900", dark: "#000000" }`)
## Import Organization
- TypeScript: Relative imports used throughout (`../lib/types`, `../hooks/useDashboardChannel`)
- No `@` or other path aliases detected in config
## Error Handling
- Tuple-based returns: `{:ok, data}` or `{:error, reason}` are standard across all functions
- Example: `fetch_all_deals()` returns `{:ok, rows}` or `{:error, reason}`
- GenServer handle callbacks use pattern matching to handle errors:
- Try/rescue for external API calls with logging:
- Phoenix Controller responses use `send_resp(200, "OK")` or `halt()` to stop request pipeline
- Promise-based async operations with try/catch
- Example from `CreateOrderModal.tsx`:
- Optimistic updates with fallback: UI updates immediately, then syncs with server
- Toast/Alert notifications for user feedback on errors
- Channel message protocol: `.receive("ok", handler)` / `.receive("error", handler)` / `.receive("timeout", handler)`
## Logging
- `Logger.info/1`: General information, connection status, initialization
- `Logger.warn/1`: Warning-level events (invalid payloads, unauthorized access)
- `Logger.error/1`: Error conditions and failures
- `Logger.debug/1`: Detailed debugging info (cache hit/miss)
- Examples from codebase:
- `console.log()`: Prefixed with emoji and context tags like `🟢 [Frontend]`, `🔴 [Frontend]`
- Used heavily for debugging connection state and data flow
- Example: `console.log("🟢 [Frontend] ✅ Joined successfully")`
- No structured logging library detected, relies on browser console
## Comments
- Above complex logic requiring explanation (e.g., date parsing, composite ID generation)
- For workarounds and temporary solutions (marked with comments like "Workaround:")
- For non-obvious algorithm choices
- Example from `deal_store.ex`:
- Minimal use detected in codebase
- Interface definitions have no doc comments
- Behaviour module has basic `@moduledoc` in `sales_provider.ex`:
## Function Design
- Elixir functions range 5-30 lines with clear single responsibility
- Example: `has_value?/1` (1 line), `valid_payload?/1` (3 lines), `sort_rows/1` (10 lines)
- React components 20-100+ lines with internal helpers
- Larger components split logic into smaller handler functions
- Elixir: Minimalist - most functions take 0-2 parameters, state passed via GenServer
- Pattern matching used heavily: `handle_cast({:update_deal, payload}, state)`
- React: Components accept props object with typed interface
- Hooks return destructured object: `{ data, isConnected, push, manualUpdate }`
- Elixir GenServer callbacks return `{:reply, result, state}` or `{:noreply, state}`
- Elixir data functions return `{:ok, data}` or `{:error, reason}`
- React hooks return objects with state + updaters: `{ data, isConnected, push, manualUpdate }`
- React event handlers are void (side effects only)
## Module Design
- Elixir: Public API at top (no `@doc` but functions are self-documenting)
- Example from `DealStore`:
- React: Single export per file
- Not used in this codebase - imports are direct file references
- Example: `import { SheetRow } from '../lib/types'` (direct file import)
## Architectural Patterns
- GenServer pattern for stateful services: `DealStore`, `GoogleAuth`
- Behaviour pattern for pluggable implementations: `SalesProvider` behaviour with `GoogleSheets` adapter
- Phoenix Channel for real-time WebSocket communication
- Plug pipeline for HTTP middleware and authentication
- React Hooks for state management: `useState`, `useEffect`
- Custom hooks for cross-cutting concerns: `useDashboardChannel` centralizes connection logic
- Component composition: modals, cards, charts are reusable components
- Utility functions for business logic: `dashboardLogic.ts` separates calculations from UI
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Phoenix-based backend with stateful server caching (DealStore GenServer)
- Real-time bidirectional communication via Phoenix Channels and WebSocket
- Google Sheets as single source of truth with local in-memory cache
- Composable backend adapters for pluggable data providers
- React frontend with optimistic updates and reactive state
## Layers
- Purpose: User-facing dashboard UI with interactive components
- Location: `frontend/src/`
- Contains: React components, views, hooks, utilities
- Depends on: Phoenix WebSocket connection, types from `lib/types.ts`
- Used by: Browser clients connecting via WebSocket
- Purpose: Metrics calculation, filtering, sorting, data transformation
- Location: `frontend/src/lib/dashboardLogic.ts`
- Contains: `calculateMetrics()` function aggregating volume/origin/state/professional analytics
- Depends on: SheetRow data structure
- Used by: App.tsx for KPI rendering and Map visualization
- Purpose: Real-time event handling and client synchronization
- Location: `backend/lib/lumentech_monitor_web/`
- Contains: Router, Channels, Controllers, WebSocket endpoint
- Depends on: DealStore for data access
- Used by: Frontend clients via Phoenix Channels
- Purpose: Abstraction over data providers and persistence
- Location: `backend/lib/lumentech_monitor/data/`
- Contains: DealStore (cache), Adapters, Providers
- Depends on: Google Sheets API, GoogleAuth
- Used by: WebSocket channels, Controllers
- Purpose: Google OAuth token management with clock drift compensation
- Location: `backend/lib/lumentech_monitor/google_auth.ex`
- Contains: GenServer for token lifecycle, refresh scheduling
- Depends on: Goth (Google OAuth library), runtime config
- Used by: GoogleSheets adapter for API calls
- Purpose: Process initialization and supervision
- Location: `backend/lib/lumentech_monitor/application.ex`
- Contains: Supervisor tree with DealStore, GoogleAuth, PubSub, Phoenix endpoint
- Depends on: All backend modules
- Used by: OTP runtime on startup
## Data Flow
- **Backend Cache:** DealStore maintains `%{rows: [...], last_updated: DateTime}` state in memory
- **Frontend State:** `data: SheetData` in `useDashboardChannel` hook, supplemented with local UI state (view, category, filters)
- **Consistency:** Write-through pattern for mutations; read-aside for queries
- **Conflict Resolution:** Server-of-truth model - Sheet is always canonical, client optimistic updates are best-effort
## Key Abstractions
- Purpose: In-memory cache of deals with polling and event handling
- Examples: `backend/lib/lumentech_monitor/data/deal_store.ex`
- Pattern: OTP GenServer with `:poll` timer, webhook event handling, PubSub broadcasting
- Responsibilities: Fetch, upsert, delete, validate, sort, broadcast
- Purpose: Abstract interface for pluggable data sources
- Examples: `backend/lib/lumentech_monitor/data/sales_provider.ex`
- Pattern: Elixir behaviour with callbacks (`fetch_all_deals`, `append_deal`, `update_status`, etc.)
- Implementations: `GoogleSheetsAdapter`, potentially `GoogleSheetsProvider` (legacy)
- Purpose: Concrete implementation of SalesProvider for Google Sheets
- Examples: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex`
- Pattern: Implements SalesProvider behaviour, delegates to SheetClient
- Key Methods: `fetch()` with metadata optimization, `append_row_internal()`, `update_status_internal()`, `delete_row_internal()`
- Purpose: Phoenix Channel for real-time client events
- Examples: `backend/lib/lumentech_monitor_web/channels/dashboard_channel.ex`
- Pattern: Phoenix.Channel with `join`, `handle_in` for messages, `handle_info` for PubSub events
- Message Types: `"add_order"`, `"update_status"`, `"update_row"`, `"delete_row"`
- Purpose: React hook encapsulating WebSocket logic
- Examples: `frontend/src/hooks/useDashboardChannel.ts`
- Pattern: Custom Hook with `useEffect` for connection lifecycle, state setters for data/connection
- Exports: `{ data, isConnected, push, manualUpdate }`
- Purpose: Canonical data model for deal records
- Examples: `frontend/src/lib/types.ts`
- Pattern: TypeScript interfaces defining shape
- Fields: `id`, `pedido_original`, `cliente`, `produto`, `valor`, `status`, `data_emissao`, `data_fechamento`, `estado`, `categoria`, `origem`, `profissional`, `cidade`
## Entry Points
- Location: `backend/lib/lumentech_monitor/application.ex`
- Triggers: OTP app startup via `mix phx.server`
- Responsibilities: Start supervisor tree (DealStore, GoogleAuth, Endpoint, PubSub, Finch HTTP client)
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Mount React App to DOM, initialize Vite HMR
- Location: `backend/lib/lumentech_monitor_web/router.ex`
- Endpoints:
- Location: `backend/lib/lumentech_monitor_web/user_socket.ex` and `channels/dashboard_channel.ex`
- Topic: `"dashboard:main"`
- Join: `DashboardChannel.join()` → retrieves initial state
- Messages: `add_order`, `update_status`, `update_row`, `delete_row`
- PubSub: Listens to `"dashboard:main"` topic
## Error Handling
- GenServer errors: Logged, state preserved, process survives unless critical
- Example: `DealStore.handle_info(:poll)` catches adapter errors, logs, continues polling
- HTTP errors: Token verification in WebhookController returns 401; parse errors logged
- Google API errors: Logged with reason, triggers retry with backoff (60s for quota)
- Database/adapter unavailability: Falls back to mock data or previous state
- Promise rejection in `channel.push()` caught, error alert shown to user
- Failed mutations: Optimistic update rolled back on error
- Connection loss: `isConnected` state shows disconnect indicator (WifiOff icon)
- JSON serialization: DateTime conversion to ISO8601 prevents JSON errors
```elixir
```
## Cross-Cutting Concerns
- Approach: Elixir Logger module with structured logging + prefix markers (🔴, 🟢, 🔵)
- Files: Backend logs in `lumentech_monitor/*`, frontend logs to `console.log`
- Pattern: `:info`, `:error`, `:warn` levels; `:debug` for optimization steps
- Example: `Logger.info("DealStore: Initializing and fetching full dataset...")`
- Approach: Schema validation at adapter layer before upsert
- Files: `deal_store.ex` `valid_payload?()` checks required fields
- Pattern: `has_value?()` helper verifies non-empty strings
- Validation Rules: `pedido_original`, `cliente`, `produto` required
- Approach: Token-based for webhooks, open socket for clients (no auth)
- Files: `webhook_controller.ex` verifies Bearer token; `user_socket.ex` open
- Pattern: `Plug.Crypto.secure_compare()` for timing-safe token comparison
- Environment: `SHEETS_AUTH_TOKEN` env var, `goth.json` credentials for Google
- Approach: PubSub + polling + webhooks (multi-channel redundancy)
- Files: `deal_store.ex` broadcasts on update; `dashboard_channel.ex` subscribes
- Pattern: `:poll` every 10s, webhook delta updates, broadcast `:new_data` and `:update_deals`
- Consistency: Server-of-truth (Sheet is canonical), optimistic client updates with server reconciliation
- Approach: Composite ID generation at adapter and channel layers
- Files: `dashboard_channel.ex` constructs `composite_id` from pedido + produto
- Pattern: `"#{pedido}-#{produto}"` if product present, else just `pedido`
- Purpose: Enable per-product row identification in Sheet without added ID column
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
