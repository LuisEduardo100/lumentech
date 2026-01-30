defmodule LumentechMonitorWeb.DashboardChannel do
  use Phoenix.Channel

  def join("dashboard:main", _payload, socket) do
    # Send the current state immediately upon joining
    current_data = LumentechMonitor.DataIngestion.SheetWatcher.get_data()
    {:ok, current_data, socket}
  end

  # We can also handle incoming messages if needed, but this is mostly read-only for the client
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("add_order", %{"row" => row}, socket) do
    case LumentechMonitor.DataIngestion.SheetClient.append_row(row) do
      {:ok, _} ->
        # Trigger immediate refresh
        send(LumentechMonitor.DataIngestion.SheetWatcher, :tick)
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, inspect(reason)}, socket}
    end
  end

  def handle_in("update_status", %{"id" => id, "status" => status}, socket) do
    case LumentechMonitor.DataIngestion.SheetClient.update_status(id, status) do
      {:ok, _} ->
        # Trigger immediate refresh
        send(LumentechMonitor.DataIngestion.SheetWatcher, :tick)
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, inspect(reason)}, socket}
    end
  end
end
