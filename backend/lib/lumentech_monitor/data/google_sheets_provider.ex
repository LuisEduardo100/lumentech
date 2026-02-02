defmodule LumentechMonitor.Data.GoogleSheetsProvider do
  @behaviour LumentechMonitor.DataProvider
  require Logger

  alias LumentechMonitor.DataIngestion.SheetClient

  @impl true
  def fetch_all_deals() do
    # Delegate to existing client
    case SheetClient.fetch(nil) do
      {:ok, %{rows: rows, last_updated: _}, _time} ->
        # Ensure initial data also uses composite IDs for consistency
        updated_rows = Enum.map(rows, &ensure_composite_id/1)
        {:ok, updated_rows}

      {:ok, :unchanged, _} ->
        {:ok, []}

      other ->
        other
    end
  end

  @impl true
  def normalize_payload(raw_data) do
    # 1. Normalize Keys (Trim + Upcase)
    normalized_input =
      raw_data
      |> Map.new(fn {k, v} -> {String.upcase(String.trim(k)), v} end)

    # 2. Extract Values using normalized keys
    id_pedido = get_val(normalized_input, "PEDIDO")
    produto = get_val(normalized_input, "PRODUTO")

    # 3. Create Composite ID
    composite_id = create_composite_id(id_pedido, produto)

    %{
      "id" => composite_id,
      # Keep original for reference
      "pedido_original" => id_pedido,
      "data_emissao" =>
        get_val(normalized_input, "DATA DE EMISSAO") || get_val(normalized_input, "DATA EMISSAO"),
      "cliente" => get_val(normalized_input, "CLIENTE"),
      "categoria" => get_val(normalized_input, "CATEGORIA"),
      "origem" => get_val(normalized_input, "ORIGEM"),
      "produto" => produto,
      "valor" => parse_amount(get_val(normalized_input, "VALOR")),
      "status" => get_val(normalized_input, "STATUS"),
      "data_fechamento" =>
        get_val(normalized_input, "DATA DE FECHAMENTO") ||
          get_val(normalized_input, "DATA FECHAMENTO"),
      "cidade" => get_val(normalized_input, "CIDADE"),
      "estado" => get_val(normalized_input, "UF"),
      "profissional" => "N/A"
    }
  end

  # Helpers
  defp get_val(map, key), do: Map.get(map, key)

  defp create_composite_id(pedido, produto) do
    safe_pedido = to_string(pedido || "") |> String.trim()
    safe_produto = to_string(produto || "") |> String.trim()

    if safe_produto == "" do
      safe_pedido
    else
      "#{safe_pedido}-#{safe_produto}"
    end
  end

  defp ensure_composite_id(row) do
    # Used for initial load rows which are already maps but might lack composite ID
    # SheetClient maps column A to "id"
    pedido = row["id"]
    produto = row["produto"]

    new_id = create_composite_id(pedido, produto)

    Map.put(row, "id", new_id)
    |> Map.put("pedido_original", pedido)
  end

  defp parse_amount(value) when is_float(value), do: value
  defp parse_amount(value) when is_integer(value), do: value / 1.0

  defp parse_amount(value) when is_binary(value) do
    # Try parsing "1.500,00" -> 1500.00
    normalized =
      if String.contains?(value, ",") do
        value
        |> String.replace(".", "")
        |> String.replace(",", ".")
      else
        value
      end

    case Float.parse(normalized) do
      {num, _} -> num
      _ -> 0.0
    end
  end

  defp parse_amount(_), do: 0.0
end
