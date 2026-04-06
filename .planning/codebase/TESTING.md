# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework

**Runner:**
- Elixir: ExUnit (built-in Elixir testing framework, version not specified but standard with ~Elixir 1.14)
- Config: `test/test_helper.exs` contains `ExUnit.start()`
- TypeScript/React: No test framework configured (no Jest, Vitest, or similar detected)

**Assertion Library:**
- Elixir: ExUnit assertions (pattern matching, `assert`, `assert_receive`)
- TypeScript/React: N/A - no testing infrastructure

**Run Commands:**
```bash
mix test                    # Run all tests
mix test --watch           # Watch mode (if configured)
# Coverage: Not detected in codebase
```

## Test File Organization

**Location:**
- Elixir: `test/` directory mirrors source structure
- Organized in subdirectory: `test/lumentech_monitor_web/channels/dashboard_channel_test.exs`
- Support modules: `test/support/` for test utilities and mocks

**Naming:**
- Pattern: `module_name_test.exs` for channel/controller tests
- Example: `dashboard_channel_test.exs` tests `DashboardChannel` module

**Structure:**
```
backend/
├── test/
│   ├── test_helper.exs                  # ExUnit configuration
│   ├── support/                         # Mocks and test utilities
│   │   ├── mock_provider.ex
│   │   ├── mock_sales_provider.ex
│   │   └── mock_sheet_client.ex
│   └── lumentech_monitor_web/
│       └── channels/
│           └── dashboard_channel_test.exs
```

## Test Structure

**Suite Organization:**
```elixir
defmodule LumentechMonitorWeb.DashboardChannelTest do
  use ExUnit.Case
  use Phoenix.ChannelTest
  alias LumentechMonitorWeb.DashboardChannel
  alias LumentechMonitor.Data.DealStore

  @endpoint LumentechMonitorWeb.Endpoint

  setup do
    # Setup fixtures and mocks
    # Return test context
    %{socket: socket}
  end

  test "description", %{socket: socket} do
    # Test body
  end
end
```

**Patterns:**

*Setup Pattern (from `dashboard_channel_test.exs` lines 9-30):*
```elixir
setup do
  # Restart application for clean state
  Application.stop(:lumentech_monitor)
  
  # Configure mock adapter
  Application.put_env(
    :lumentech_monitor,
    :sales_adapter,
    LumentechMonitor.Test.MockSalesProvider
  )
  
  # Start application with mocks
  Application.start(:lumentech_monitor)
  
  # Connect to channel
  {:ok, socket} = connect(LumentechMonitorWeb.UserSocket, %{})
  {:ok, _, socket} = subscribe_and_join(socket, DashboardChannel, "dashboard:main")
  
  %{socket: socket}
end
```

*Teardown Pattern:*
- Implicit: ExUnit automatically cleans up GenServer state between tests via Application restarts in setup

*Assertion Pattern (from lines 32-56):*
```elixir
# Send message via channel
ref = push(socket, "add_order", %{"row" => row})
assert_reply(ref, :ok)

# Assert PubSub broadcast received
assert_receive {:new_data, %{rows: rows}}, 2000

# Find and verify data
found = Enum.find(rows, fn r -> r["id"] == composite_id end)
assert found, "Deal should be broadcasted"
assert found["cliente"] == "Test Client"

# Verify state
state = DealStore.get_all_deals()
stored = Enum.find(state.rows, fn r -> r["id"] == composite_id end)
assert stored, "Deal should be in DealStore state"
```

## Mocking

**Framework:** Behaviour-based module swapping via `Application.put_env/3`

**Patterns:**
```elixir
# Mock module implements behaviour
defmodule LumentechMonitor.Test.MockSalesProvider do
  @behaviour LumentechMonitor.Data.SalesProvider

  def fetch_all_deals do
    {:ok, []}
  end

  def append_deal(_row) do
    {:ok, :appended}
  end

  def update_status(_id, _status) do
    {:ok, :updated}
  end

  def normalize_payload(data) do
    # Return normalized data
    if is_list(data) do
      # Map list to expected structure
      %{
        "id" => id,
        "cliente" => Enum.at(data, 2),
        "produto" => Enum.at(data, 5),
        ...
      }
    else
      data
    end
  end
end
```

**What to Mock:**
- External API calls (Google Sheets) - replaces real adapter with test mock
- Stateful services that need clean state - `Application.start/1` and `Application.stop/1` control GenServer lifecycle
- Example: `DealStore` is restarted in setup to ensure clean test isolation

**What NOT to Mock:**
- Core GenServer logic - tests verify actual behaviour, not stubs
- Phoenix Channel message handling - tested against real endpoint
- PubSub broadcasts - tested with `assert_receive` to verify real messages

## Fixtures and Factories

**Test Data:**
```elixir
# From test, line 37-49: Inline row data
unique_id = "TEST-#{System.unique_integer()}"
row = [
  unique_id,
  "2023-10-27",
  "Test Client",
  "Test Cat",
  "Test Origin",
  "Test Product",
  1000.0,
  "Em andamento",
  nil,
  "Test City",
  "TS"
]
```

**Location:**
- No dedicated factory module detected
- Test data created inline with unique IDs using `System.unique_integer()`
- Prevents test collision and flakiness

## Coverage

**Requirements:** Not enforced (no configuration detected)

**View Coverage:** Not applicable - no coverage tool configured

## Test Types

**Unit Tests:**
- Scope: Individual GenServer callbacks and channel messages
- Approach: Set up isolated mocks, send message, assert response
- Example: `test "add_order pushes to Sheet and updates DealStore"` (line 32-70)
  - Sends `add_order` event via channel
  - Verifies handler returns `:ok`
  - Asserts PubSub broadcast with correct data
  - Checks DealStore internal state

**Integration Tests:**
- Scope: Cross-module interaction (Channel → DealStore → PubSub)
- Approach: Mock external dependencies (Google Sheets), test full flow
- Example: `test "update_status updates DealStore"` (line 72-93)
  - Creates deal via `add_order`
  - Updates status via `update_status`
  - Verifies both channel response and PubSub broadcast
  - Confirms DealStore state matches

**E2E Tests:**
- Framework: Not used
- Why: Application is real-time dashboard; E2E would require browser automation
- Manual testing is primary validation method

## Common Patterns

**Async Testing:**
```elixir
# Test receives async PubSub messages
test "update_status updates DealStore", %{socket: socket} do
  push(socket, "add_order", %{"row" => row})
  
  # Consume add broadcast
  assert_receive {:new_data, _}
  assert_receive {:update_deals, _}
  
  # Then update
  ref = push(socket, "update_status", %{"id" => composite_id, "status" => "Ganho"})
  assert_reply(ref, :ok)
  
  # Wait up to 2000ms for broadcast
  assert_receive {:update_deals, %{rows: rows}}, 2000
end
```

**Error Testing:**
```elixir
# Test error case in append_deal - would check if exists
if DealStore.exists?(composite_id) do
  {:reply, {:error, "Pedido duplicado: #{composite_id} já existe."}, socket}
else
  # proceed
end
```
- No explicit error test shown, but pattern is evident in channel code

## Test Configuration

**ExUnit Settings (test_helper.exs):**
```elixir
ExUnit.start()
```
Minimal config - defaults used

**Application Configuration for Tests:**
```elixir
Application.put_env(
  :lumentech_monitor,
  :sales_adapter,
  LumentechMonitor.Test.MockSalesProvider
)
```
Tests configure adapters before application start

## Current Test Coverage

**Tested Components:**
- `DashboardChannel` - WebSocket connection and message handling
- `DealStore` - GenServer state mutations and broadcasts
- Mock implementations for `SalesProvider` behaviour

**Untested Components:**
- `GoogleAuth` - Token management (complex auth flow, no test found)
- `GoogleSheets` adapter - Actual Google API integration
- All TypeScript/React components and hooks - No frontend tests detected
- `WebhookController` - Webhook endpoints
- `HealthController` - Health check endpoint

## Recommended Testing Additions

**Frontend (TypeScript/React):**
- Missing entirely: No Jest, Vitest, or Cypress configuration
- Would benefit from unit tests for:
  - `useDashboardChannel` hook - WebSocket connection logic
  - `calculateMetrics` - Math/aggregation logic
  - Modal and component rendering with various states

**Backend:**
- Would benefit from tests for:
  - `GoogleAuth` token refresh and clock drift handling
  - `GoogleSheets` adapter with real API (integration tests)
  - `WebhookController` authentication and event handling
  - Error scenarios (quota limits, network failures)

---

*Testing analysis: 2026-04-06*
