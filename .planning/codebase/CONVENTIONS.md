# Coding Conventions

**Analysis Date:** 2026-04-06

## Naming Patterns

**Files:**
- Elixir modules: snake_case with descriptive names (`deal_store.ex`, `google_sheets.ex`, `webhook_controller.ex`)
- React components: PascalCase for component files (`CreateOrderModal.tsx`, `KPICard.tsx`, `MapChart.tsx`)
- React utility/hook files: camelCase (`useDashboardChannel.ts`, `dashboardLogic.ts`)
- Test files: append `_test.exs` for Elixir tests

**Functions:**
- Elixir: snake_case for all functions (`fetch_all_deals`, `append_deal`, `update_status`, `normalize_payload`)
- Elixir: Prefix internal functions with `defp` and typically name them with `_internal` suffix for implementation details
- React/TypeScript: camelCase for functions (`calculateMetrics`, `handleCreateOrder`, `handleUpdateStatus`)
- Handler functions: prefix with `handle` followed by action name (`handleChange`, `handleSubmit`, `handleDeleteRow`)

**Variables:**
- Elixir: snake_case for all variables and state atoms (`safe_pedido`, `composite_id`, `auth_header`)
- Elixir: Maps use string keys for data from external sources (`r["id"]`, `r["status"]`) and atom keys for internal state
- React/TypeScript: camelCase for all variables (`isConnected`, `formData`, `selectedState`, `isLoading`)
- Boolean variables: prefix with `is` or use status indicators (`isDark`, `isOpen`, `exists?`)

**Types:**
- Elixir: Module names are PascalCase (`LumentechMonitor.Data.DealStore`, `LumentechMonitorWeb.DashboardChannel`)
- Elixir: Behaviour modules define contracts without implementation (`LumentechMonitor.Data.SalesProvider`)
- TypeScript: Interface names PascalCase (`KPICardProps`, `SheetRow`, `DashboardMetrics`)
- TypeScript: Type aliases for union types (`type Theme = 'orange' | 'black' | 'slate'`)

## Code Style

**Formatting:**
- Elixir: Uses standard Mix formatter (no custom `.formatter.exs` detected)
- TypeScript: Uses Vite for bundling, no explicit prettier/eslint config but strict TypeScript enabled
- TypeScript strict mode: `strict: true` in `tsconfig.json` enforces null checks and type safety

**Linting:**
- Elixir: Uses `@impl true` attributes to mark callback implementations
- TypeScript: `noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig - unused code is allowed
- TypeScript: `noFallthroughCasesInSwitch: true` enforces switch completeness
- Tailwind CSS: Configured with custom theme colors (`lumentech: { gold: "#f75900", dark: "#000000" }`)

## Import Organization

**Order - Elixir:**
1. Module definition and use statements (`defmodule`, `use`, `@behaviour`)
2. Aliases for external dependencies (`alias LumentechMonitor.Data.DealStore`)
3. Requires for Logger or other compile-time dependencies (`require Logger`)
4. Type specifications and module attributes (`@impl true`, `@type`)

**Order - TypeScript/React:**
1. React and standard library imports (`import React, { useState, useEffect }`)
2. Third-party libraries (`import { Socket } from 'phoenix'`, `import axios from 'axios'`)
3. Local type definitions and utilities (`import { SheetRow, DashboardMetrics } from '../lib/types'`)
4. Local components and hooks (`import { useDashboardChannel } from './hooks/useDashboardChannel'`)

**Path Aliases:**
- TypeScript: Relative imports used throughout (`../lib/types`, `../hooks/useDashboardChannel`)
- No `@` or other path aliases detected in config

## Error Handling

**Patterns - Elixir:**
- Tuple-based returns: `{:ok, data}` or `{:error, reason}` are standard across all functions
- Example: `fetch_all_deals()` returns `{:ok, rows}` or `{:error, reason}`
- GenServer handle callbacks use pattern matching to handle errors:
  ```elixir
  case adapter().fetch_all_deals() do
    {:ok, new_rows} -> ...
    {:error, reason} -> {:noreply, state}
  end
  ```
- Try/rescue for external API calls with logging:
  ```elixir
  try do
    # operation
  rescue
    e -> {:error, e}
  end
  ```
- Phoenix Controller responses use `send_resp(200, "OK")` or `halt()` to stop request pipeline

**Patterns - TypeScript/React:**
- Promise-based async operations with try/catch
- Example from `CreateOrderModal.tsx`:
  ```typescript
  try {
    await onSubmit({ row });
    onClose();
  } catch (e) {
    console.error("Failed to create order", e);
    alert("Erro ao criar pedido. Recarregue a página.");
  }
  ```
- Optimistic updates with fallback: UI updates immediately, then syncs with server
- Toast/Alert notifications for user feedback on errors
- Channel message protocol: `.receive("ok", handler)` / `.receive("error", handler)` / `.receive("timeout", handler)`

## Logging

**Framework:** Elixir Logger with `require Logger` in modules that log

**Patterns - Elixir:**
- `Logger.info/1`: General information, connection status, initialization
- `Logger.warn/1`: Warning-level events (invalid payloads, unauthorized access)
- `Logger.error/1`: Error conditions and failures
- `Logger.debug/1`: Detailed debugging info (cache hit/miss)
- Examples from codebase:
  ```elixir
  Logger.info("DealStore: Initializing and fetching full dataset...")
  Logger.error("DealStore: FAILED to fetch initial data: #{inspect(reason)}")
  Logger.warn("DealStore: Ignoring invalid payload (missing Pedido, Cliente, or Produto)")
  ```

**Patterns - TypeScript/React:**
- `console.log()`: Prefixed with emoji and context tags like `🟢 [Frontend]`, `🔴 [Frontend]`
- Used heavily for debugging connection state and data flow
- Example: `console.log("🟢 [Frontend] ✅ Joined successfully")`
- No structured logging library detected, relies on browser console

## Comments

**When to Comment:**
- Above complex logic requiring explanation (e.g., date parsing, composite ID generation)
- For workarounds and temporary solutions (marked with comments like "Workaround:")
- For non-obvious algorithm choices
- Example from `deal_store.ex`:
  ```elixir
  # Integrity Check
  if valid_payload?(normalized_deal) do
  ```

**JSDoc/TSDoc:**
- Minimal use detected in codebase
- Interface definitions have no doc comments
- Behaviour module has basic `@moduledoc` in `sales_provider.ex`:
  ```elixir
  @moduledoc """
  Behaviour for Sales Data Providers (e.g., Google Sheets, CRM).
  """
  ```

## Function Design

**Size:** 
- Elixir functions range 5-30 lines with clear single responsibility
- Example: `has_value?/1` (1 line), `valid_payload?/1` (3 lines), `sort_rows/1` (10 lines)
- React components 20-100+ lines with internal helpers
- Larger components split logic into smaller handler functions

**Parameters:**
- Elixir: Minimalist - most functions take 0-2 parameters, state passed via GenServer
- Pattern matching used heavily: `handle_cast({:update_deal, payload}, state)`
- React: Components accept props object with typed interface
- Hooks return destructured object: `{ data, isConnected, push, manualUpdate }`

**Return Values:**
- Elixir GenServer callbacks return `{:reply, result, state}` or `{:noreply, state}`
- Elixir data functions return `{:ok, data}` or `{:error, reason}`
- React hooks return objects with state + updaters: `{ data, isConnected, push, manualUpdate }`
- React event handlers are void (side effects only)

## Module Design

**Exports:**
- Elixir: Public API at top (no `@doc` but functions are self-documenting)
- Example from `DealStore`:
  ```elixir
  def get_all_deals
  def exists?(composite_id)
  def update_deal_async(deal_payload)
  def handle_webhook_event(payload)
  def delete_deal(id)
  def update_status(id, status)
  def set_rows(rows)
  def force_refresh
  ```
- React: Single export per file
  ```typescript
  export function useDashboardChannel() { ... }
  export function CreateOrderModal({ ... }) { ... }
  ```

**Barrel Files:**
- Not used in this codebase - imports are direct file references
- Example: `import { SheetRow } from '../lib/types'` (direct file import)

## Architectural Patterns

**Elixir:**
- GenServer pattern for stateful services: `DealStore`, `GoogleAuth`
- Behaviour pattern for pluggable implementations: `SalesProvider` behaviour with `GoogleSheets` adapter
- Phoenix Channel for real-time WebSocket communication
- Plug pipeline for HTTP middleware and authentication

**TypeScript/React:**
- React Hooks for state management: `useState`, `useEffect`
- Custom hooks for cross-cutting concerns: `useDashboardChannel` centralizes connection logic
- Component composition: modals, cards, charts are reusable components
- Utility functions for business logic: `dashboardLogic.ts` separates calculations from UI

---

*Convention analysis: 2026-04-06*
