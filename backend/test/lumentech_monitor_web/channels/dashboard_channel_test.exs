defmodule LumentechMonitorWeb.DashboardChannelTest do
  use ExUnit.Case
  use Phoenix.ChannelTest
  alias LumentechMonitorWeb.DashboardChannel
  alias LumentechMonitor.Data.DealStore

  @endpoint LumentechMonitorWeb.Endpoint

  setup do
    # Restart app to ensure config and state are clean
    Application.stop(:lumentech_monitor)

    Application.put_env(
      :lumentech_monitor,
      :sales_adapter,
      LumentechMonitor.Test.MockSalesProvider
    )

    Application.start(:lumentech_monitor)

    # Wait for DealStore to init? It's async.
    # But init is fast with Mock.
    # DealStore is a global GenServer. We can't easily reset it without restarting it.
    # We can fetch current state to account for pre-existing items.

    {:ok, socket} = connect(LumentechMonitorWeb.UserSocket, %{})
    {:ok, _, socket} = subscribe_and_join(socket, DashboardChannel, "dashboard:main")

    %{socket: socket}
  end

  test "add_order pushes to Sheet and updates DealStore", %{socket: socket} do
    # Generate a unique ID to avoid collision with existing data
    unique_id = "TEST-#{System.unique_integer()}"

    # Row: [id, emissao, cliente, categoria, origem, produto, valor, status, fechamento, cidade, estado]
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

    # Expected Composite ID: UNIQUE_ID-Test Product
    composite_id = "#{unique_id}-Test Product"

    # Push message
    ref = push(socket, "add_order", %{"row" => row})
    assert_reply(ref, :ok)

    # Verify DealStore has it
    # DealStore broadcasts raw message via PubSub, so the test process (which joined the topic) receives it as info.
    assert_receive {:new_data, %{rows: rows}}, 2000

    found = Enum.find(rows, fn r -> r["id"] == composite_id end)
    assert found, "Deal should be broadcasted"
    assert found["cliente"] == "Test Client"

    # Double check state
    state = DealStore.get_all_deals()
    stored = Enum.find(state.rows, fn r -> r["id"] == composite_id end)
    assert stored, "Deal should be in DealStore state"
  end

  test "update_status updates DealStore", %{socket: socket} do
    # 1. Add a temporary deal first
    id = "STATUS-TEST-#{System.unique_integer()}"
    row = [id, "2023-01-01", "Client", "Cat", "Org", "Prod", 100, "Old Status", nil, "City", "UF"]
    composite_id = "#{id}-Prod"

    push(socket, "add_order", %{"row" => row})

    # Consume add broadcast
    assert_receive {:new_data, _}
    assert_receive {:update_deals, _}

    # 2. Update Status
    ref = push(socket, "update_status", %{"id" => composite_id, "status" => "Ganho"})
    assert_reply(ref, :ok)

    # 3. Assert broadcast
    assert_receive {:update_deals, %{rows: rows}}, 2000

    updated = Enum.find(rows, fn r -> r["id"] == composite_id end)
    assert updated["status"] == "Ganho"
  end
end
