# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout

```
lumentech/
├── backend/                           # Elixir/Phoenix backend
│   ├── config/                        # Runtime configuration
│   │   ├── config.exs                 # Base config (dev/test/prod)
│   │   └── runtime.exs                # Runtime config (secrets, env vars)
│   ├── lib/
│   │   ├── lumentech_monitor/         # Core business logic
│   │   │   ├── application.ex         # OTP Application supervisor
│   │   │   ├── google_auth.ex         # Google OAuth token manager
│   │   │   ├── data/                  # Data access layer
│   │   │   │   ├── deal_store.ex      # GenServer cache with polling
│   │   │   │   ├── sales_provider.ex  # Behaviour (interface)
│   │   │   │   ├── adapters/
│   │   │   │   │   └── google_sheets.ex  # GoogleSheets implementation
│   │   │   │   ├── google_sheets_provider.ex  # Legacy provider
│   │   │   │   └── data_provider.ex   # (Deprecated module reference)
│   │   │   └── data_ingestion/        # Deprecated: original polling approach
│   │   │       ├── sheet_client.ex    # (Shared utility for Sheet operations)
│   │   │       └── sheet_watcher.ex   # (Removed/commented out)
│   │   └── lumentech_monitor_web/     # Web layer (Phoenix)
│   │       ├── endpoint.ex            # Phoenix Endpoint (HTTP/WS config)
│   │       ├── router.ex              # Route definitions
│   │       ├── user_socket.ex         # WebSocket socket handler
│   │       ├── channels/
│   │       │   └── dashboard_channel.ex  # Real-time channel
│   │       ├── controllers/
│   │       │   ├── webhook_controller.ex # Webhook ingestion
│   │       │   └── health_controller.ex  # Health check
│   │       └── views/
│   │           └── error_view.ex      # Error rendering
│   ├── test/                          # Test directory
│   ├── mix.exs                        # Hex package manifest
│   └── mix.lock                       # Dependency lock file
├── frontend/                          # React + TypeScript frontend
│   ├── public/                        # Static assets
│   │   └── images/
│   │       └── lumentech_logo.png
│   ├── src/
│   │   ├── App.tsx                    # Root component (main dashboard)
│   │   ├── main.tsx                   # React entry point
│   │   ├── vite-env.d.ts              # Vite type definitions
│   │   ├── hooks/
│   │   │   └── useDashboardChannel.ts # WebSocket connection hook
│   │   ├── views/
│   │   │   └── DealsView.tsx          # Table view for deals
│   │   ├── components/
│   │   │   ├── CreateOrderModal.tsx   # Modal for creating deals
│   │   │   ├── EditOrderModal.tsx     # Modal for editing deals
│   │   │   ├── DeleteConfirmationModal.tsx  # Confirm delete dialog
│   │   │   ├── KPICard.tsx            # KPI metric card component
│   │   │   ├── RichMetricCard.tsx     # Extended metric card
│   │   │   ├── Toast.tsx              # Toast notification
│   │   │   └── charts/
│   │   │       ├── MapChart.tsx       # Brazil state choropleth map
│   │   │       ├── OriginPieChart.tsx # Origin distribution chart
│   │   │       └── ProfessionalList.tsx  # Professional ranking list
│   │   └── lib/
│   │       ├── types.ts               # TypeScript interfaces
│   │       └── dashboardLogic.ts      # Metrics calculation logic
│   ├── index.html                     # HTML entry point
│   ├── package.json                   # npm dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── vite.config.ts                 # Vite build configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── postcss.config.js              # PostCSS config
│   ├── nginx.conf                     # Production Nginx config
│   └── Dockerfile                     # Frontend container image
├── .planning/                         # GSD planning documents
│   └── codebase/
│       ├── ARCHITECTURE.md            # (This file describes architecture)
│       └── STRUCTURE.md               # (This file)
├── .git/                              # Git repository
├── .env                               # Local environment variables (not committed)
├── .env.prod.example                  # Production env template
├── .gitignore                         # Git ignore patterns
├── google_credentials.json            # Google API credentials (not committed)
├── syslumen.yaml                      # Project configuration manifest
├── package-lock.json                  # npm lock file (root)
└── README.md                          # Project documentation
```

## Directory Purposes

**backend:**
- Purpose: Elixir/Phoenix HTTP and WebSocket server
- Contains: Business logic, data access, real-time channels, API routes
- Key files: `application.ex`, `deal_store.ex`, `router.ex`, `dashboard_channel.ex`

**backend/config:**
- Purpose: Application configuration management
- Contains: Environment-specific configs (dev/test/prod), runtime secrets
- Key files: `config.exs` (static), `runtime.exs` (dynamic/secrets)

**backend/lib/lumentech_monitor:**
- Purpose: Core business domain and data logic
- Contains: Data models, providers, authentication, supervision
- Key files: `application.ex`, `google_auth.ex`, `data/deal_store.ex`

**backend/lib/lumentech_monitor/data:**
- Purpose: Data access abstraction layer
- Contains: Cache (DealStore), provider interface, adapters
- Key files: `deal_store.ex`, `sales_provider.ex`, `adapters/google_sheets.ex`

**backend/lib/lumentech_monitor_web:**
- Purpose: HTTP and WebSocket presentation layer
- Contains: Routes, channels, controllers, views
- Key files: `router.ex`, `endpoint.ex`, `user_socket.ex`, `channels/`

**backend/lib/lumentech_monitor_web/channels:**
- Purpose: Real-time WebSocket message handlers
- Contains: DashboardChannel for bidirectional updates
- Key files: `dashboard_channel.ex`

**backend/lib/lumentech_monitor_web/controllers:**
- Purpose: HTTP request handlers
- Contains: Webhook receiver, health checks
- Key files: `webhook_controller.ex`, `health_controller.ex`

**frontend/src:**
- Purpose: React application root
- Contains: Components, hooks, utilities, styles
- Key files: `App.tsx`, `main.tsx`

**frontend/src/components:**
- Purpose: Reusable UI components
- Contains: Modals, cards, lists, charts
- Key files: `CreateOrderModal.tsx`, `KPICard.tsx`, `DeleteConfirmationModal.tsx`

**frontend/src/components/charts:**
- Purpose: Data visualization components
- Contains: ECharts wrappers for maps, pie charts, lists
- Key files: `MapChart.tsx`, `OriginPieChart.tsx`, `ProfessionalList.tsx`

**frontend/src/hooks:**
- Purpose: Custom React hooks
- Contains: WebSocket connection management
- Key files: `useDashboardChannel.ts`

**frontend/src/lib:**
- Purpose: Shared utilities and types
- Contains: Type definitions, business logic functions
- Key files: `types.ts`, `dashboardLogic.ts`

**frontend/src/views:**
- Purpose: Page-level components
- Contains: Different view modes (Dashboard vs Deals list)
- Key files: `DealsView.tsx`

**frontend/public:**
- Purpose: Static assets served directly
- Contains: Images, icons, favicon
- Key files: `images/lumentech_logo.png`

## Key File Locations

**Entry Points:**
- Backend HTTP/WS: `backend/lib/lumentech_monitor_web/endpoint.ex` (port 4000 by default)
- Backend OTP App: `backend/lib/lumentech_monitor/application.ex` (supervisor)
- Frontend: `frontend/src/main.tsx` (mounts React to #app)
- Frontend HTML: `frontend/index.html` (loads app, Vite manifest)

**Configuration:**
- Backend Static Config: `backend/config/config.exs`
- Backend Runtime Config: `backend/config/runtime.exs` (secrets from env)
- Frontend Build Config: `frontend/vite.config.ts`
- Frontend Type Config: `frontend/tsconfig.json`
- Styling Config: `frontend/tailwind.config.js`, `frontend/postcss.config.js`

**Core Logic:**
- Data Cache: `backend/lib/lumentech_monitor/data/deal_store.ex`
- Authentication: `backend/lib/lumentech_monitor/google_auth.ex`
- WebSocket Handler: `backend/lib/lumentech_monitor_web/channels/dashboard_channel.ex`
- Metrics Engine: `frontend/src/lib/dashboardLogic.ts`
- Data Model: `frontend/src/lib/types.ts`

**Testing:**
- Backend Tests: `backend/test/` (structure mirrors `lib/`)
- Frontend Tests: Not present in current structure

## Naming Conventions

**Files:**
- Elixir: `snake_case.ex` (e.g., `deal_store.ex`, `google_auth.ex`)
- React Components: `PascalCase.tsx` for components, `camelCase.ts` for utilities (e.g., `CreateOrderModal.tsx`, `dashboardLogic.ts`)
- Config: `config.exs` (Elixir config files), `.json` for JSON configs
- Env Secrets: `.env` (gitignored), `.env.prod.example` (template)

**Directories:**
- Elixir Domain: `snake_case` matching namespace (e.g., `lumentech_monitor/`, `data/`, `data_ingestion/`)
- React Components: `PascalCase` or grouped by feature (e.g., `components/`, `views/`, `hooks/`)
- Feature grouping: Semantic folders by domain (`channels/`, `controllers/`, `adapters/`)

**Modules:**
- Elixir: Hierarchical atoms using `CamelCase` (e.g., `LumentechMonitor.Data.DealStore`)
- React: Exported function/const (e.g., `export function useDashboardChannel()`, `export const calculateMetrics`)
- Behaviour (interface): Module starting with capital letter, no implementation (e.g., `SalesProvider`)
- Adapter: Specific implementation in `adapters/` subdirectory (e.g., `GoogleSheets` in `adapters/google_sheets.ex`)

## Where to Add New Code

**New Feature (e.g., new data provider):**
- Primary code: `backend/lib/lumentech_monitor/data/adapters/new_provider.ex`
- Behaviour implementation: Implement `@behaviour LumentechMonitor.Data.SalesProvider`
- Configuration: Add to `backend/config/config.exs` if conditionally loaded
- Tests: `backend/test/lumentech_monitor/data/adapters/new_provider_test.exs`

**New Component/Module (Frontend):**
- UI Component: `frontend/src/components/NewComponent.tsx`
- Page/View: `frontend/src/views/NewView.tsx`
- Chart: `frontend/src/components/charts/NewChart.tsx`
- Hook: `frontend/src/hooks/useNewFeature.ts`
- Utility: `frontend/src/lib/newLogic.ts`

**Utilities (Shared):**
- Backend Helpers: `backend/lib/lumentech_monitor/` (new module) or extend existing `data/` module
- Frontend Helpers: `frontend/src/lib/` (new file for new domain, e.g., `filterLogic.ts`)

**Controllers/Routes (Backend):**
- New HTTP endpoint: `backend/lib/lumentech_monitor_web/controllers/new_controller.ex`
- Add route: `backend/lib/lumentech_monitor_web/router.ex` in `:api` pipeline
- Pattern: `get|post|put|delete("/resource/:id", NewController, :action)`

**Channels (Backend):**
- New real-time channel: `backend/lib/lumentech_monitor_web/channels/new_channel.ex`
- Register socket: `backend/lib/lumentech_monitor_web/user_socket.ex` add `channel "topic:*", NewChannel`
- Pattern: Implement `join/3`, `handle_in/3` (messages), `handle_info/2` (PubSub)

**Tests (Backend):**
- Unit tests: `backend/test/lumentech_monitor/domain/module_test.exs`
- Integration tests: `backend/test/lumentech_monitor_web/channels/channel_test.exs`
- Run: `mix test`

## Special Directories

**backend/_build:**
- Purpose: Compiled artifacts and dependencies
- Generated: Yes (by Mix)
- Committed: No (gitignored)
- Cleanup: `mix clean`

**backend/deps:**
- Purpose: Elixir dependency packages
- Generated: Yes (by Mix via mix.lock)
- Committed: No (gitignored, use mix.lock instead)
- Cleanup: `rm -rf deps && mix deps.get`

**frontend/node_modules:**
- Purpose: npm packages
- Generated: Yes (by npm via package-lock.json)
- Committed: No (gitignored, use package-lock.json instead)
- Cleanup: `rm -rf node_modules && npm install`

**.env files:**
- Purpose: Local environment variable overrides
- Generated: Manual creation (from `.env.prod.example` template)
- Committed: No (gitignored, contains secrets)
- Access: `System.get_env("VAR_NAME")` in Elixir, `import.meta.env.VITE_VAR_NAME` in frontend

**google_credentials.json:**
- Purpose: Google API OAuth service account key
- Generated: Manual (exported from Google Cloud Console)
- Committed: No (gitignored, contains secrets)
- Access: Loaded in `backend/config/runtime.exs`, passed to Goth library

---

*Structure analysis: 2026-04-06*
