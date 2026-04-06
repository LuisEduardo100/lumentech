# Codebase Concerns

**Analysis Date:** 2026-04-06

## Tech Debt

**Hardcoded System Clock Drift Compensation:**
- Issue: VPS system clock runs ~20 minutes ahead of real time, solved with hardcoded `@drift_offset` of 1500 seconds in production only
- Files: `backend/lib/lumentech_monitor/google_auth.ex` (lines 5-7)
- Impact: Root cause not fixed (clock issue), workaround will break if VPS time is corrected; makes token generation fragile and difficult to debug
- Fix approach: Fix the actual system clock on VPS using NTP configuration, then remove the drift offset workaround

**Oversized Adapter File:**
- Issue: `google_sheets.ex` is 566 lines with significant logic duplication, mixing concerns (HTTP, parsing, ID resolution, sheet operations)
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex`
- Impact: Difficult to maintain, test, and debug; changes in one area affect multiple responsibilities
- Fix approach: Split into smaller modules: GoogleSheetsClient (HTTP), RowMapper (parsing/normalization), IDResolver (composite ID logic), SheetOperations (update/delete/append operations)

**Composite ID Resolution Complexity:**
- Issue: Multiple overlapping ID schemes (sequential, UUID, composite "pedido-produto") with fallback logic scattered across `find_row_index`, `parse_composite_id`, and `map_row`
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 394-442, 552-560); `frontend/src/components/CreateOrderModal.tsx` (lines 53-58); `frontend/src/hooks/useDashboardChannel.ts` (lines 35)
- Impact: High risk of ID mismatches during updates/deletes; frontend and backend have duplicated logic that must stay in sync; migration path unclear (legacy UUID to sequential)
- Fix approach: Standardize on sequential IDs only, add data migration for existing UUID-based records, consolidate ID generation to single source of truth, add comprehensive test cases for ID lookups

**Hardcoded Spreadsheet Range:**
- Issue: Google Sheets range hardcoded as `A2:L` in multiple places, assumes fixed column layout (A-L = 12 columns, no room for schema evolution)
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 136, 162, 448); `frontend/src/components/CreateOrderModal.tsx` (lines 79-93)
- Impact: Adding new columns breaks entire system; no flexibility for schema changes; column mapping is implicit, not documented
- Fix approach: Externalize range/schema as configuration, implement schema versioning, document column mappings explicitly

**Crude Duplicate Detection:**
- Issue: Duplicate detection uses case-insensitive string comparison of composite IDs; vulnerable to typos and false positives
- Files: `frontend/src/components/CreateOrderModal.tsx` (lines 53-71); `backend/lib/lumentech_monitor_web/channels/dashboard_channel.ex` (lines 54-66)
- Impact: Users can accidentally create true duplicates with slight variations; no business rule validation
- Fix approach: Implement strict duplicate checking with user confirmation workflow, add Levenshtein distance matching for near-duplicates, validate against business rules (Pedido + Produto + Date uniqueness)

## Known Bugs

**WebSocket Token Hardcoded as "123":**
- Symptoms: WebSocket authentication uses dummy token `"token: 123"` instead of real authentication
- Files: `frontend/src/hooks/useDashboardChannel.ts` (line 35)
- Trigger: Any WebSocket connection attempt
- Workaround: None; security risk present
- Impact: Any client can connect to WebSocket channel; no user isolation; production security hole

**Missing Row ID at Append:**
- Symptoms: New deals created with `unique_id = "PENDING"`, backend then assigns sequential ID on next sync; creates race condition where frontend and backend disagree on row ID briefly
- Files: `frontend/src/components/CreateOrderModal.tsx` (line 77); `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 147-190)
- Trigger: Create new order via modal
- Workaround: Force refresh after creation (line 74 in dashboard_channel.ex handles this, but delay creates brief inconsistency)
- Impact: Optimistic UI updates may use different ID than backend assigns; can cause edit/delete failures on newly created records

**Naive Row Equality Check:**
- Symptoms: `DealStore` polling uses simple `new_rows != state.rows` (Elixir map equality); minor variations in data structure fail to detect actual data changes
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (line 98)
- Trigger: Polling cycle if sheet data changes slightly (e.g., whitespace, field order)
- Workaround: `force_refresh()` manually triggers sync
- Impact: Legitimate data changes may not propagate to clients; users see stale data

**Unsafe Composite ID Splitting:**
- Symptoms: ID parsing splits on "-" (dash) assuming Pedido-Product format, but doesn't handle Pedidos that contain dashes
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 423-442)
- Trigger: Creating order with Pedido ID containing dashes
- Workaround: Avoid dashes in Pedido IDs
- Impact: Composite ID lookup fails; row cannot be updated/deleted if Pedido contains dashes

**Missing Null Validation in Row Parsing:**
- Symptoms: `parse_float` and `map_row` functions assume row indices exist; calling `Enum.at(row, index)` returns `nil` if row is too short
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 500-544)
- Trigger: Malformed rows from Google Sheets API (fewer than 12 columns)
- Workaround: None; causes silent data corruption
- Impact: Missing columns become `nil` in maps, calculations break, frontend receives incomplete records

## Security Considerations

**Hardcoded WebSocket Token:**
- Risk: Token `"123"` is hardcoded in frontend; no authentication, authorization, or user isolation
- Files: `frontend/src/hooks/useDashboardChannel.ts` (line 35)
- Current mitigation: None; endpoint relies on URL secrecy only
- Recommendations: Implement real authentication (JWT token exchange), add authorization checks in channel handler, implement per-user subscriptions, rotate secrets in production

**Webhook Token Not Validated on Missing Env Var:**
- Risk: If `SHEETS_AUTH_TOKEN` env var is missing or empty, webhook endpoint may accept any request
- Files: `backend/lib/lumentech_monitor_web/controllers/webhook_controller.ex` (lines 23-25)
- Current mitigation: `is_nil()` check will reject if missing
- Recommendations: Fail fast at startup if `SHEETS_AUTH_TOKEN` is not configured; add logging for failed auth attempts; implement rate limiting on webhook endpoint

**Google Credentials in Config File:**
- Risk: `google_credentials.json` committed to git or left in repository root (line 59 in runtime.exs shows fallback to local file)
- Files: `backend/config/runtime.exs` (lines 56-62); `.gitignore` should exclude this but repo shows `google_credentials.json` exists
- Current mitigation: `.env` skipping mechanism, Docker config-based injection in prod
- Recommendations: Remove any local `google_credentials.json` from repo history, enforce env var only in production, use secret management service (HashiCorp Vault, AWS Secrets Manager)

**Unencrypted Sensitive Data Over WebSocket:**
- Risk: Deal data (client names, values, contract details) sent unencrypted over WebSocket in development (http:// not wss://)
- Files: `frontend/src/hooks/useDashboardChannel.ts` (lines 12-20)
- Current mitigation: HTTPS/WSS in production only
- Recommendations: Force WSS in production via config validation, log security warnings on protocol downgrades, audit deal data sensitivity

**No Input Sanitization on Webhook Payload:**
- Risk: Webhook handler passes user data directly to `DealStore` without validation
- Files: `backend/lib/lumentech_monitor_web/controllers/webhook_controller.ex` (line 15); `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 200-203)
- Current mitigation: Basic payload shape checks in `valid_payload?` function
- Recommendations: Add schema validation (Ecto.Changeset or similar), sanitize strings (trim, reject nulls), validate field types, implement allowlist for event types

## Performance Bottlenecks

**Polling Approach with Inefficient Diff:**
- Problem: 10-second polling interval (line 64 in deal_store.ex) fetches entire spreadsheet on every poll; only compares if rows changed using `!=`
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (line 64); `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 69-105)
- Cause: No incremental sync; metadata check exists (Drive API) but only in production and has fallback to full fetch on error
- Improvement path: Implement proper change tracking (use `modifiedTime` consistently), reduce polling interval to 30-60s, cache metadata checks, implement binary search for modified timestamp ranges

**Redundant Broadcast on Poll Miss:**
- Problem: Two separate broadcast calls (`new_data` and `update_deals`) sent even when rows haven't changed; Phoenix/PubSub may queue both
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 239-250)
- Cause: No deduplication; both events contain identical data
- Improvement path: Consolidate to single event, add event type field if different semantics needed, implement debouncing before broadcast

**All-at-Once Row Fetch and Sorting:**
- Problem: Every poll fetches ALL rows from A2:L regardless of display needs; sorts all rows in memory even if UI shows paginated view
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 261-273); `frontend/src/views/DealsView.tsx` (lines 50-83)
- Cause: No pagination support; no server-side filtering
- Improvement path: Implement server-side pagination (limit/offset), lazy load rows on scroll, add server-side filtering by status/category, cache sort results

**Expensive String Parsing on Every Request:**
- Problem: `parse_date` function (lines 276-291 in deal_store.ex) called on every sort, but date format is fixed; no caching
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 276-291)
- Cause: Date values fetched as strings, parsed on demand in Elixir instead of parsed once during ingestion
- Improvement path: Parse dates at ingestion time, store as Date struct, add date validation at schema level

**Frontend Optimistic Updates Without Rollback:**
- Problem: UI updates immediately on user action (create/update/delete), but if backend fails, inconsistency persists until next server push
- Files: `frontend/src/App.tsx` (lines 71-148)
- Cause: No rollback mechanism on error; alerts shown but state not reverted
- Improvement path: Implement proper error recovery (revert state on backend failure), add undo/retry UX, implement Optimistic Concurrency Control with version numbers

## Fragile Areas

**Google Auth Token Lifecycle:**
- Files: `backend/lib/lumentech_monitor/google_auth.ex`
- Why fragile: Token refresh scheduled based on expiration time; if system clock drifts during session, next refresh may never trigger (drift offset only applied at creation, not on expiry check)
- Safe modification: Test with mock time, add explicit token validation before use, implement max-age based refresh (not just expiration-based), log refresh lifecycle
- Test coverage: No test file found for GoogleAuth module

**ID Lookup Logic:**
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 394-421)
- Why fragile: `find_row_index` has two-level fallback (unique ID -> composite ID) but relies on exact string matching and composite ID splitting; if Pedido contains "-", split fails silently
- Safe modification: Add comprehensive test cases for all ID formats, add logging when fallback is used, implement strict mode with error on ambiguous ID
- Test coverage: No tests found for ID resolution logic

**Date Parsing with No Error Feedback:**
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 276-291)
- Why fragile: `parse_date` silently returns `~D[1970-01-01]` on parse error; invalid dates sort to epoch and may hide data issues
- Safe modification: Add explicit error logging, return `nil` on parse error and handle at call site, add date validation in schema
- Test coverage: No validation of date parsing behavior

**WebSocket Connection Recovery:**
- Files: `frontend/src/hooks/useDashboardChannel.ts` (lines 85-90)
- Why fragile: Connection cleanup in return handler assumes channel exists; if join fails, `chan.leave()` may throw; no reconnection retry
- Safe modification: Add try-catch around cleanup, implement exponential backoff reconnection, add connection state machine
- Test coverage: No test for WebSocket connection failures or recovery

## Scaling Limits

**Google Sheets API Rate Limits:**
- Current capacity: Google Sheets v4 API allows 500 quota units per 100 seconds per project (varies by quota type)
- Limit: With current polling every 10 seconds + metadata check + occasional writes, will exceed quota under 500+ concurrent users or during batch operations
- Scaling path: Implement request deduplication, switch to push-based sync (Sheets webhooks instead of polling), implement request queuing with backoff, batch operations

**In-Memory Row Storage:**
- Current capacity: No limit enforced on row count; entire dataset kept in `DealStore` state
- Limit: Elixir process heap memory grows unbounded; beyond ~100K rows, startup/polling becomes slow
- Scaling path: Implement database backend (PostgreSQL) instead of in-memory, add pagination, implement data archival for old records

**WebSocket Connection Density:**
- Current capacity: Single Phoenix channel (`dashboard:main`) serves all connected clients; broadcasts to all
- Limit: Beyond 500 concurrent connections, broadcast latency increases; one slow client blocks others
- Scaling path: Implement user-scoped channels, add connection pooling, implement message queuing with per-client buffers

**Monolithic Adapter:**
- Current capacity: Google Sheets adapter handles auth, sync, transformation, and all CRUD in one module
- Limit: Difficult to scale horizontally; all operations serialized through single adapter instance
- Scaling path: Extract into microservice, implement connection pooling, parallelize independent operations

## Dependencies at Risk

**Outdated google_api_sheets (~> 0.34):**
- Risk: Google API client last updated 2023; potential incompatibility with latest Google Sheets API v4 changes, missing security patches
- Impact: May fail on new API features or deprecated endpoints
- Migration plan: Update to latest version, test comprehensive integration suite, audit breaking changes

**Hardcoded Elixir Version (~> 1.14):**
- Risk: Elixir 1.14 released 2022; newer versions have performance improvements and bug fixes
- Impact: Missing optimizations, potential compatibility issues with newer dependencies
- Migration plan: Update to Elixir 1.16+, test all modules, verify Phoenix version compatibility

**No Lock on Minor Dependencies:**
- Risk: `dotenvy`, `cors_plug`, `goth` versions use `~>` which allows minor updates; transitive dependency updates not pinned
- Impact: Unexpected breaking changes in deployment
- Migration plan: Use exact versions in mix.lock (already done by default), add CI tests on each mix update

## Missing Critical Features

**No Database Persistence:**
- Problem: Data exists only in memory in `DealStore`; application restart loses all rows not synced to Sheets
- Blocks: Cannot implement audit logs, cannot query historical data, cannot support offline mode, cannot scale horizontally
- Impact: Single-node dependency; catastrophic data loss on crash before next Sheets sync

**No User Authentication/Authorization:**
- Problem: All users see all data; no role-based access control; no user attribution of changes
- Blocks: Cannot implement user-scoped dashboards, cannot enforce data isolation, cannot audit user actions, cannot support multi-tenant
- Impact: Security risk in multi-user environments; no accountability for data modifications

**No Audit Trail:**
- Problem: No record of who changed what when; data modifications are permanent and untrackable
- Blocks: Cannot implement undo, cannot comply with compliance audits, cannot detect unauthorized changes
- Impact: No forensic capability; changes appear to be from system

**No Error Recovery/Retry Logic:**
- Problem: API failures (quota exceeded, network timeout) are not retried; data loss on temporary outages
- Blocks: Cannot guarantee data delivery; users cannot reliably create/update records during API issues
- Impact: Unavailability during Google API incidents

**No Data Validation Schema:**
- Problem: No formal schema validation; invalid data silently passes through (nil values, type mismatches, out-of-range values)
- Blocks: Cannot ensure data integrity, cannot provide meaningful validation errors to users
- Impact: Data corruption; users unsure why their input is rejected

## Test Coverage Gaps

**No Tests for GoogleAuth Module:**
- What's not tested: Token fetch, refresh scheduling, drift offset logic, error handling on credential fetch
- Files: `backend/lib/lumentech_monitor/google_auth.ex`
- Risk: Clock drift compensation is untested; token lifecycle bugs undetected; production-only behavior not validated
- Priority: High

**No Tests for ID Resolution Logic:**
- What's not tested: Composite ID parsing, fallback to sequential ID, edge cases (IDs with dashes, empty values, null handling)
- Files: `backend/lib/lumentech_monitor/data/adapters/google_sheets.ex` (lines 394-442)
- Risk: ID lookup failures on real-world data; missing rows on update/delete; hidden data corruption
- Priority: High

**No Tests for WebSocket Channel:**
- What's not tested: Join/leave lifecycle, message handling (add_order, update_status, update_row, delete_row), PubSub broadcast
- Files: `backend/lib/lumentech_monitor_web/channels/dashboard_channel.ex`
- Risk: Channel failures undetected; real-time sync breaks without warning
- Priority: High

**No Tests for Frontend Components:**
- What's not tested: Modal forms, data binding, event handling, optimistic updates, error states
- Files: `frontend/src/components/CreateOrderModal.tsx`, `frontend/src/components/EditOrderModal.tsx`, `frontend/src/views/DealsView.tsx`
- Risk: UI bugs in production; user input validation broken; modal state inconsistencies
- Priority: Medium

**No Integration Tests:**
- What's not tested: End-to-end flow (frontend create -> backend append -> Sheets write -> sync back to frontend)
- Risk: Distributed failures (frontend + backend inconsistency) undetected
- Priority: Medium

**No Tests for Date Parsing:**
- What's not tested: BR date format (DD/MM/YYYY), ISO format, invalid dates, null dates
- Files: `backend/lib/lumentech_monitor/data/deal_store.ex` (lines 276-291)
- Risk: Sorting errors, date corruption, silent failures
- Priority: Medium

**No Performance Tests:**
- What's not tested: Row fetch performance with 10K/100K rows, polling latency, broadcast speed
- Files: All data access paths
- Risk: Performance degradation unnoticed; scaling limits unknown
- Priority: Low

---

*Concerns audit: 2026-04-06*
