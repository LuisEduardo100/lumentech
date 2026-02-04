defmodule LumentechMonitor.Data.DealStore do
  use GenServer
  require Logger

  # Configurable Provider
  # @provider LumentechMonitor.Data.GoogleSheetsProvider

  defp adapter do
    Application.get_env(
      :lumentech_monitor,
      :sales_adapter,
      LumentechMonitor.Data.Adapters.GoogleSheets
    )
  end

  def start_link(_) do
    GenServer.start_link(__MODULE__, nil, name: __MODULE__)
  end

  def get_all_deals do
    GenServer.call(__MODULE__, :get_all)
  end

  def exists?(composite_id) do
    GenServer.call(__MODULE__, {:exists, composite_id})
  end

  def update_deal_async(deal_payload) do
    # Legacy support or internal calls
    GenServer.cast(__MODULE__, {:update_deal, deal_payload})
  end

  def handle_webhook_event(payload) do
    GenServer.cast(__MODULE__, {:webhook_event, payload})
  end

  def delete_deal(id) do
    GenServer.cast(__MODULE__, {:delete_deal, id})
  end

  def update_status(id, status) do
    GenServer.cast(__MODULE__, {:update_status, id, status})
  end

  def set_rows(rows) do
    GenServer.cast(__MODULE__, {:set_rows, rows})
  end

  def force_refresh do
    send(__MODULE__, :poll)
  end

  # Initial Load
  @impl true
  def init(_) do
    Logger.info("DealStore: Initializing and fetching full dataset...")

    # Run initial fetch in a continuation or immediate task to not block supervisor too long?
    # For simplicity, blocking init is safer for data consistency on startup,
    # but if it fails, app fails. Let's do send_after to self.
    # Run initial fetch
    send(self(), :initial_fetch)
    # Start Polling Timer (10s)
    :timer.send_interval(10_000, :poll)

    {:ok, %{rows: [], last_updated: nil}}
  end

  @impl true
  def handle_call(:get_all, _from, state) do
    Logger.info(
      "DealStore: Serving get_all request. Row count: #{length(state.rows)} | PID: #{inspect(self())}"
    )

    {:reply, state, state}
  end

  @impl true
  def handle_call({:exists, id}, _from, state) do
    exists =
      Enum.any?(state.rows, fn r ->
        # Case insensitive check for robustness
        String.downcase(to_string(r["id"])) == String.downcase(to_string(id))
      end)

    {:reply, exists, state}
  end

  @impl true
  @impl true
  def handle_info(:poll, state) do
    # Periodic Sync
    case adapter().fetch_all_deals() do
      {:ok, new_rows} ->
        # Optimization: Only broadcast if changed
        # We can implement a more robust diff, but strict equality works for now
        # Note: Map order might vary? Rows are list of Maps.
        if new_rows != state.rows do
          Logger.info("DealStore: Polling detected changes. Syncing...")
          broadcast_update(new_rows)
          {:noreply, %{state | rows: new_rows, last_updated: DateTime.utc_now()}}
        else
          {:noreply, state}
        end

      _ ->
        {:noreply, state}
    end
  end

  @impl true
  def handle_info(:initial_fetch, state) do
    Logger.info("DealStore: Attempting initial fetch...")

    case adapter().fetch_all_deals() do
      {:ok, rows} ->
        Logger.info("DealStore: Fetch successful. Loaded #{length(rows)} rows.")
        broadcast_update(rows)
        {:noreply, %{state | rows: rows, last_updated: DateTime.utc_now()}}

      {:error, reason} ->
        Logger.error("DealStore: FAILED to fetch initial data: #{inspect(reason)}")

        # Retry with backoff (60s) to handle 429 Quota Limits
        Process.send_after(self(), :initial_fetch, 60_000)
        {:noreply, state}
    end
  end

  @impl true
  def handle_cast({:update_deal, payload}, state) do
    Logger.info("DealStore: Processing async update...")

    normalized_deal = adapter().normalize_payload(payload)

    # Integrity Check
    if valid_payload?(normalized_deal) do
      id = normalized_deal["id"]
      Logger.info("DealStore: Valid update for Deal #{id}")

      # Upsert logic
      new_rows =
        case Enum.find_index(state.rows, fn r -> r["id"] == id end) do
          nil ->
            # Case insensitive check to prevent duplicates if IDs vary slightly
            # Actually, we rely on exact ID match in `find_index`.
            # If we want to be safe against casing issues, we should check existence first?
            # For now, keep as is.
            [normalized_deal | state.rows]

          index ->
            List.replace_at(state.rows, index, normalized_deal)
        end

      broadcast_update(new_rows)
      {:noreply, %{state | rows: new_rows, last_updated: DateTime.utc_now()}}
    else
      Logger.warn("DealStore: Ignoring invalid payload (missing Pedido, Cliente, or Produto)")
      {:noreply, state}
    end
  end

  @impl true
  def handle_cast({:update_status, id, status}, state) do
    Logger.info("DealStore: Updating status for deal #{id} to #{status}")

    new_rows =
      Enum.map(state.rows, fn r ->
        if to_string(r["id"]) == to_string(id) do
          Map.put(r, "status", status)
        else
          r
        end
      end)

    broadcast_update(new_rows)
    {:noreply, %{state | rows: new_rows, last_updated: DateTime.utc_now()}}
  end

  @impl true
  def handle_cast({:delete_deal, id}, state) do
    Logger.info("DealStore: Removing deal #{id} from cache.")

    # Filter out by composite ID
    new_rows = Enum.reject(state.rows, fn r -> r["id"] == id end)

    broadcast_update(new_rows)
    {:noreply, %{state | rows: new_rows, last_updated: DateTime.utc_now()}}
  end

  @impl true
  def handle_cast({:webhook_event, %{"event" => "remove_row"}}, state) do
    Logger.info("DealStore: Received remove_row event. Triggering Full Sync.")
    # Reuse initial_fetch logic for full sync
    send(self(), :initial_fetch)
    {:noreply, state}
  end

  @impl true
  def handle_cast({:webhook_event, %{"event" => "edit", "row_data" => row_data}}, state) do
    # Delta update
    handle_cast({:update_deal, row_data}, state)
  end

  @impl true
  def handle_cast({:webhook_event, _}, state) do
    # Fallback for unknown events - maybe full sync to be safe?
    Logger.info("DealStore: Unknown webhook event. Triggering Full Sync safety.")
    send(self(), :initial_fetch)
    {:noreply, state}
  end

  @impl true
  def handle_cast({:set_rows, rows}, state) do
    Logger.info("DealStore: Syncing cache with SheetWatcher (#{length(rows)} rows).")
    broadcast_update(rows)
    {:noreply, %{state | rows: rows, last_updated: DateTime.utc_now()}}
  end

  @impl true
  def handle_cast(msg, state) do
    Logger.error("DealStore: Received unexpected cast: #{inspect(msg)}")
    {:noreply, state}
  end

  defp valid_payload?(deal) do
    # Check "pedido_original" instead of "id" to ensure the base components existed.
    has_value?(deal["pedido_original"]) &&
      has_value?(deal["cliente"]) &&
      has_value?(deal["produto"])
  end

  defp has_value?(val), do: not (is_nil(val) || to_string(val) |> String.trim() == "")

  defp broadcast_update(rows) do
    try do
      # Ensure sorting before broadcast
      sorted_rows = sort_rows(rows)

      Phoenix.PubSub.broadcast(
        LumentechMonitor.PubSub,
        "dashboard:main",
        {:new_data, %{rows: sorted_rows, last_updated: DateTime.utc_now()}}
      )

      Phoenix.PubSub.broadcast(
        LumentechMonitor.PubSub,
        "dashboard:main",
        {:update_deals, %{rows: sorted_rows, last_updated: DateTime.utc_now()}}
      )
    rescue
      e ->
        Logger.error(
          "DealStore: Error during broadcast (likely sorting or pubsub): #{inspect(e)}"
        )

        # Don't crash, just log. State update will proceed in caller.
    end
  end

  defp sort_rows(rows) do
    Enum.sort_by(
      rows,
      fn r ->
        date_str = r["data_emissao"]

        case parse_date(date_str) do
          {:ok, date} -> date
          _ -> ~D[1970-01-01]
        end
      end,
      {:asc, Date}
    )
  end

  defp parse_date(str) when is_binary(str) do
    # Try ISO
    case Date.from_iso8601(str) do
      {:ok, d} ->
        {:ok, d}

      _ ->
        # Try BR DD/MM/YYYY
        case String.split(str, "/") do
          [day, month, year] ->
            Date.new(String.to_integer(year), String.to_integer(month), String.to_integer(day))

          _ ->
            :error
        end
    end
  end

  defp parse_date(_), do: :error
end
