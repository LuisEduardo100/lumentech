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
    # Schedule next tick first to ensure distinct intervals
    Process.send_after(self(), :tick, @interval)

    # Fetch asynchronously to avoid blocking the GenServer (which causes timeouts in get_data)
    parent = self()

    Task.start(fn ->
      try do
        case LumentechMonitor.DataIngestion.SheetClient.fetch() do
          {:ok, data} ->
            send(parent, {:fetch_result, {:ok, data}})

          error ->
            send(parent, {:fetch_result, error})
        end
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
    case result do
      {:ok, data} ->
        check_and_broadcast(state, data)
        {:noreply, data}

      {:error, reason} ->
        Logger.error("Failed to fetch sheet data (async): #{inspect(reason)}")
        {:noreply, state}
    end
  end

  defp check_and_broadcast(old_state, new_state) do
    # Simple comparison. In a real app, might want to compare specific fields or a hash.
    if old_state.rows != new_state.rows do
      Logger.info("Data changed. Broadcasting to #{@topic}")
      Phoenix.PubSub.broadcast(LumentechMonitor.PubSub, @topic, {:new_data, new_state})
    else
      Logger.debug("Data unchanged.")
    end
  end
end
