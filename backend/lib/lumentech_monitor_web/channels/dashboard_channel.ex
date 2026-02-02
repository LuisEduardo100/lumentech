defmodule LumentechMonitorWeb.DashboardChannel do
  use Phoenix.Channel
  alias LumentechMonitor.Data.DealStore
  alias LumentechMonitor.DataIngestion.SheetClient

  def join("dashboard:main", _payload, socket) do
    # Send the current state immediately upon joining
    current_data = DealStore.get_all_deals()
    {:ok, current_data, socket}
  end

  # We can also handle incoming messages if needed, but this is mostly read-only for the client
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("add_order", %{"row" => row}, socket) do
    # Row format from SheetClient: [id, emissao, cliente, categoria, origem, produto, ...]
    pedido = Enum.at(row, 0)
    produto = Enum.at(row, 5)

    # Reconstruct composite ID logic from Provider
    safe_pedido = to_string(pedido || "") |> String.trim()
    safe_produto = to_string(produto || "") |> String.trim()

    composite_id =
      if safe_produto == "" do
        safe_pedido
      else
        "#{safe_pedido}-#{safe_produto}"
      end

    if DealStore.exists?(composite_id) do
      {:reply, {:error, "Pedido duplicado: #{composite_id} já existe."}, socket}
    else
      case SheetClient.append_row(row) do
        {:ok, _} ->
          {:reply, :ok, socket}

        {:error, reason} ->
          {:reply, {:error, inspect(reason)}, socket}
      end
    end
  end

  def handle_in("update_status", %{"id" => id, "status" => status}, socket) do
    case SheetClient.update_status(id, status) do
      {:ok, _} ->
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, inspect(reason)}, socket}
    end
  end

  def handle_in("update_row", %{"id" => id, "row" => row_map}, socket) do
    case SheetClient.update_row(id, row_map) do
      {:ok, _} ->
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, inspect(reason)}, socket}
    end
  end

  def handle_in("delete_row", %{"id" => id}, socket) do
    case SheetClient.delete_row(id) do
      {:ok, :deleted} ->
        # Write-through to cache to ensure immediate consistency
        DealStore.delete_deal(id)
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, inspect(reason)}, socket}
    end
  end
end
