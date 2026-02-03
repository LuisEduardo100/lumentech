defmodule LumentechMonitor.DataIngestion.SheetWatcher do
  use GenServer
  require Logger

  @topic "dashboard:main"
  # 10 seconds
  @interval 10_000

  # Client API

  def start_link(_) do
    GenServer.start_link(__MODULE__, nil, name: __MODULE__)
  end

  def get_data do
    GenServer.call(__MODULE__, :get_data)
  end

  # Server Callbacks

  @impl true
  def init(_) do
    # Schedule the first fetch after a delay to allow Goth to start
    Process.send_after(self(), :tick, 2000)
    # Initial state: empty data, last_updated nil
    {:ok, %{rows: [], last_updated: nil, metadata: %{}}}
  end

  @impl true

  def handle_call(:get_data, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    # Fetch asynchronously
    parent = self()

    Task.start(fn ->
      try do
        last_time = Map.get(state, :file_modified_time)
        result = LumentechMonitor.DataIngestion.SheetClient.fetch(last_time)
        send(parent, {:fetch_result, result})
      rescue
        e ->
          Logger.error("Crash during async fetch: #{inspect(e)}")
          send(parent, {:fetch_result, {:error, :crash}})
      end
    end)

    {:noreply, state}
  end

  # Handle the async result
  def handle_info({:fetch_result, result}, state) do
    {new_state, next_interval} =
      case result do
        # Data Changed - Update State & Time
        {:ok, data, modified_time} ->
          check_and_broadcast(state, data)

          updated_state =
            state
            |> Map.merge(data)
            |> Map.put(:file_modified_time, modified_time)

          # Only speed up if we have a valid modified_time (Optimization working)
          # If modified_time is nil, we fell back. Don't speed up to avoid rate limit.
          next_int =
            if modified_time do
              max(5_000, Map.get(state, :current_interval, @interval) - 1_000)
            else
              Map.get(state, :current_interval, @interval)
            end

          {updated_state, next_int}

        # Data Unchanged - Just Update Time & Poll
        {:ok, :unchanged, modified_time} ->
          next_int = max(5_000, Map.get(state, :current_interval, @interval))
          {Map.put(state, :file_modified_time, modified_time), next_int}

        {:ok, check_mock_data} ->
          check_and_broadcast(state, check_mock_data)
          {Map.merge(state, check_mock_data), 10_000}

        {:error, "Sheet API Error: 429" <> _} ->
          Logger.warning("Rate limit hit. Backing off.")
          next_int = min(60_000, Map.get(state, :current_interval, @interval) * 2)
          {state, next_int}

        {:error, _} ->
          {state, Map.get(state, :current_interval, @interval)}
      end

    Process.send_after(self(), :tick, next_interval)
    {:noreply, Map.put(new_state, :current_interval, next_interval)}
  end

  defp check_and_broadcast(old_state, new_state) do
    # Simple comparison
    if Map.get(old_state, :rows) != Map.get(new_state, :rows) do
      Logger.info("Data changed. Broadcasting to #{@topic} and syncing DealStore.")
      Phoenix.PubSub.broadcast(LumentechMonitor.PubSub, @topic, {:new_data, new_state})

      # Also update cache
      LumentechMonitor.Data.DealStore.set_rows(Map.get(new_state, :rows))
    else
      Logger.debug("Data unchanged.")
    end
  end
end
