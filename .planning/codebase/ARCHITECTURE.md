# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview

**Overall:** Client-Server with Real-time Data Synchronization via WebSocket + Cache-Aside Pattern

**Key Characteristics:**
- Phoenix-based backend with stateful server caching (DealStore GenServer)
- Real-time bidirectional communication via Phoenix Channels and WebSocket
- Google Sheets as single source of truth with local in-memory cache
- Composable backend adapters for pluggable data providers
- React frontend with optimistic updates and reactive state

## Layers

**Presentation Layer:**
- Purpose: User-facing dashboard UI with interactive components
- Location: `frontend/src/`
- Contains: React components, views, hooks, utilities
- Depends on: Phoenix WebSocket connection, types from `lib/types.ts`
- Used by: Browser clients connecting via WebSocket

**Business Logic Layer (Frontend):**
- Purpose: Metrics calculation, filtering, sorting, data transformation
- Location: `frontend/src/lib/dashboardLogic.ts`
- Contains: `calculateMetrics()` function aggregating volume/origin/state/professional analytics
- Depends on: SheetRow data structure
- Used by: App.tsx for KPI rendering and Map visualization

**API/WebSocket Layer (Backend):**
- Purpose: Real-time event handling and client synchronization
- Location: `backend/lib/lumentech_monitor_web/`
- Contains: Router, Channels, Controllers, WebSocket endpoint
- Depends on: DealStore for data access
- Used by: Frontend clients via Phoenix Channels

**Data Access Layer (Backend):**
- Purpose: Abstraction over data providers and persistence
- Location: `backend/lib/lumentech_monitor/data/`
- Contains: DealStore (cache), Adapters, Providers
- Depends on: Google Sheets API, GoogleAuth
- Used by: WebSocket channels, Controllers

**Authentication Layer (Backend):**
- Purpose: Google OAuth token management with clock drift compensation
- Location: `backend/lib/lumentech_monitor/google_auth.ex`
- Contains: GenServer for token lifecycle, refresh scheduling
- Depends on: Goth (Google OAuth library), runtime config
- Used by: GoogleSheets adapter for API calls

**Application Supervision (Backend):**
- Purpose: Process initialization and supervision
- Location: `backend/lib/lumentech_monitor/application.ex`
- Contains: Supervisor tree with DealStore, GoogleAuth, PubSub, Phoenix endpoint
- Depends on: All backend modules
- Used by: OTP runtime on startup

## Data Flow

**Initial Load (Client Connection):**

1. Frontend connects to WebSocket socket at `ws://backend:4000/socket`
2. UserSocket accepts connection (no auth required, open access)
3. Client joins channel `"dashboard:main"`
4. DashboardChannel calls `DealStore.get_all_deals()` to retrieve current state
5. Initial state serialized (DateTime → ISO8601) and sent to client
6. Frontend stores in `data` state via `useDashboardChannel` hook
7. UI renders KPIs, map, and deals table from initial data

**Real-time Sync (Polling):**

1. DealStore polls Google Sheets every 10 seconds (`:poll` message)
2. GoogleSheets adapter calls `fetch_all_deals()` with metadata check optimization
3. If changed, new rows fetched and compared against cached state
4. Changes broadcast via `Phoenix.PubSub` to topic `"dashboard:main"`
5. All connected clients receive `:new_data` or `:update_deals` event
6. Frontend receives event via `chan.on("new_data")` handler
7. Frontend state updated, UI re-renders

**Webhook Ingestion (External Events):**

1. Google Apps Script detects changes in Sheet, sends webhook to `/api/webhooks/sheets`
2. WebhookController verifies Bearer token (`SHEETS_AUTH_TOKEN`)
3. Calls `DealStore.handle_webhook_event(params)` with event type ("edit" or "remove_row")
4. DealStore processes:
   - **"edit":** Delta update merges row_data into cache
   - **"remove_row":** Triggers full sync (fetch from Sheet)
5. Broadcast happens, clients synchronized

**Bidirectional Update (Client → Server → Sheet → Client):**

1. Frontend user creates/updates/deletes deal in modal
2. Optimistic update: local state changes immediately
3. Client sends message via WebSocket: `channel.push("add_order" | "update_status" | "delete_row", payload)`
4. DashboardChannel receives message, calls adapter method (e.g., `adapter().append_deal(row)`)
5. Adapter writes to Google Sheet via Sheets API
6. On success: `force_refresh()` triggers immediate poll (bypasses 10s wait)
7. Poll fetches updated data from Sheet
8. Broadcast to all clients, frontend state merged with server state
9. Optimistic update validated or corrected

**State Management:**

- **Backend Cache:** DealStore maintains `%{rows: [...], last_updated: DateTime}` state in memory
- **Frontend State:** `data: SheetData` in `useDashboardChannel` hook, supplemented with local UI state (view, category, filters)
- **Consistency:** Write-through pattern for mutations; read-aside for queries
- **Conflict Resolution:** Server-of-truth model - Sheet is always canonical, client optimistic updates are best-effort

## Key Abstractions

**DealStore (GenServer):**
- Purpose: In-memory cache of deals with polling and event handling
- Examples: `backend/lib/lumentech_monitor/data/deal_store.ex`
- Pattern: OTP GenServer with `:poll` timer, webhook event handling, PubSub broadcasting
- Responsibilities: Fetch, upsert, delete, validate, sort, broadcast

**SalesProvider (Behaviour):**
- Purpose: Abstract interface for pluggable data sources
- Examples: `backend/lib/lumentech_monitor/data/sales_provider.ex`
- Pattern: Elixir behaviour with callbacks (`fetch_all_deals`, `append_deal`, `update_status`, etc.)
- Implementations: `GoogleSheetsAdapter`, potentially `GoogleSheetsProvider` (legacy)

**GoogleSheets Adapter:**
- Purpose: Concrete implementation of SalesProvider for Google Sheets
- Examples: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex`
- Pattern: Implements SalesProvider behaviour, delegates to SheetClient
- Key Methods: `fetch()` with metadata optimization, `append_row_internal()`, `update_status_internal()`, `delete_row_internal()`

**DashboardChannel:**
- Purpose: Phoenix Channel for real-time client events
- Examples: `backend/lib/lumentech_monitor_web/channels/dashboard_channel.ex`
- Pattern: Phoenix.Channel with `join`, `handle_in` for messages, `handle_info` for PubSub events
- Message Types: `"add_order"`, `"update_status"`, `"update_row"`, `"delete_row"`

**useDashboardChannel Hook:**
- Purpose: React hook encapsulating WebSocket logic
- Examples: `frontend/src/hooks/useDashboardChannel.ts`
- Pattern: Custom Hook with `useEffect` for connection lifecycle, state setters for data/connection
- Exports: `{ data, isConnected, push, manualUpdate }`

**SheetRow/SheetData Types:**
- Purpose: Canonical data model for deal records
- Examples: `frontend/src/lib/types.ts`
- Pattern: TypeScript interfaces defining shape
- Fields: `id`, `pedido_original`, `cliente`, `produto`, `valor`, `status`, `data_emissao`, `data_fechamento`, `estado`, `categoria`, `origem`, `profissional`, `cidade`

## Entry Points

**Backend Entry:**
- Location: `backend/lib/lumentech_monitor/application.ex`
- Triggers: OTP app startup via `mix phx.server`
- Responsibilities: Start supervisor tree (DealStore, GoogleAuth, Endpoint, PubSub, Finch HTTP client)

**Frontend Entry:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Mount React App to DOM, initialize Vite HMR

**API Routes:**
- Location: `backend/lib/lumentech_monitor_web/router.ex`
- Endpoints:
  - `POST /api/webhooks/sheets` → WebhookController.handle_sheets_update
  - `GET /api/health/deals` → HealthController.deals
  - WebSocket `/socket` → UserSocket (routes to DashboardChannel)

**WebSocket Channels:**
- Location: `backend/lib/lumentech_monitor_web/user_socket.ex` and `channels/dashboard_channel.ex`
- Topic: `"dashboard:main"`
- Join: `DashboardChannel.join()` → retrieves initial state
- Messages: `add_order`, `update_status`, `update_row`, `delete_row`
- PubSub: Listens to `"dashboard:main"` topic

## Error Handling

**Strategy:** Layered error handling with logging, graceful degradation, and user feedback

**Patterns:**

**Backend:**
- GenServer errors: Logged, state preserved, process survives unless critical
- Example: `DealStore.handle_info(:poll)` catches adapter errors, logs, continues polling
- HTTP errors: Token verification in WebhookController returns 401; parse errors logged
- Google API errors: Logged with reason, triggers retry with backoff (60s for quota)
- Database/adapter unavailability: Falls back to mock data or previous state

**Frontend:**
- Promise rejection in `channel.push()` caught, error alert shown to user
- Failed mutations: Optimistic update rolled back on error
- Connection loss: `isConnected` state shows disconnect indicator (WifiOff icon)
- JSON serialization: DateTime conversion to ISO8601 prevents JSON errors

**Example from deal_store.ex (line 121-126):**
```elixir
{:error, reason} ->
  Logger.error("DealStore: FAILED to fetch initial data: #{inspect(reason)}")
  Process.send_after(self(), :initial_fetch, 60_000)
  {:noreply, state}
```

## Cross-Cutting Concerns

**Logging:**
- Approach: Elixir Logger module with structured logging + prefix markers (🔴, 🟢, 🔵)
- Files: Backend logs in `lumentech_monitor/*`, frontend logs to `console.log`
- Pattern: `:info`, `:error`, `:warn` levels; `:debug` for optimization steps
- Example: `Logger.info("DealStore: Initializing and fetching full dataset...")`

**Validation:**
- Approach: Schema validation at adapter layer before upsert
- Files: `deal_store.ex` `valid_payload?()` checks required fields
- Pattern: `has_value?()` helper verifies non-empty strings
- Validation Rules: `pedido_original`, `cliente`, `produto` required

**Authentication:**
- Approach: Token-based for webhooks, open socket for clients (no auth)
- Files: `webhook_controller.ex` verifies Bearer token; `user_socket.ex` open
- Pattern: `Plug.Crypto.secure_compare()` for timing-safe token comparison
- Environment: `SHEETS_AUTH_TOKEN` env var, `goth.json` credentials for Google

**Real-time Synchronization:**
- Approach: PubSub + polling + webhooks (multi-channel redundancy)
- Files: `deal_store.ex` broadcasts on update; `dashboard_channel.ex` subscribes
- Pattern: `:poll` every 10s, webhook delta updates, broadcast `:new_data` and `:update_deals`
- Consistency: Server-of-truth (Sheet is canonical), optimistic client updates with server reconciliation

**Data Normalization:**
- Approach: Composite ID generation at adapter and channel layers
- Files: `dashboard_channel.ex` constructs `composite_id` from pedido + produto
- Pattern: `"#{pedido}-#{produto}"` if product present, else just `pedido`
- Purpose: Enable per-product row identification in Sheet without added ID column
