defmodule LumentechMonitor.Data.Adapters.GoogleSheets do
  @behaviour LumentechMonitor.Data.SalesProvider
  require Logger
  alias LumentechMonitor.GoogleAuth

  # --- Behaviour Callbacks ---

  @impl true
  def fetch_all_deals do
    # Reuse existing fetch logic, forcing check or just fetching
    case fetch_internal(nil) do
      {:ok, result, _timestamp} -> {:ok, result[:rows]}
      # Should handle differently? Fetch all usually wants data.
      {:ok, :unchanged, _timestamp} -> {:ok, []}
      # If fetch_all is called, we probably want the data regardless of cache
      # So let's force fetch without timestamp check
      {:error, reason} -> {:error, reason}
    end
  end

  # Delegate for specific use cases if needed, but for "fetch_all_deals"
  # we usually want the current state.
  # Let's redefine to force fetch for simplicity in this Adapter
  defp fetch_internal(modified_time) do
    fetch(modified_time)
  end

  @impl true
  def append_deal(row_data) do
    # Same logic as SheetClient.append_row
    append_row_internal(row_data)
  end

  @impl true
  def update_status(id, status) do
    update_status_internal(id, status)
  end

  @impl true
  def update_row(id, row_map) do
    update_row_internal(id, row_map)
  end

  @impl true
  def delete_deal(id) do
    delete_row_internal(id)
  end

  @impl true
  def normalize_payload(data) do
    # Assuming data comes from Webhook payload or similar?
    # Or is this for normalizing a single row?
    # The existing GoogleSheetsProvider had this.
    # We can perform the mapping here.

    # If data is a list (raw row)
    if is_list(data) do
      map_row(data)
    else
      # If it's a map (already normalized or webhook payload)
      # We need to standardize.
      # For now, let's assume it maps the raw row list to the Deal struct/map
      data
    end
  end

  # --- Internal Logic (Migrated from SheetClient) ---

  def fetch(last_known_modified_time \\ nil) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]

    if is_nil(spreadsheet_id) do
      Logger.info("SPREADSHEET_ID is missing. Using Mock Data.")
      {:ok, %{rows: generate_mock_data(), last_updated: DateTime.utc_now()}, nil}
    else
      # 1. Check metadata (Optimization)
      case get_auth_header() do
        {:ok, auth_header} ->
          case check_modified(spreadsheet_id, auth_header, last_known_modified_time) do
            {:unchanged, current_time} ->
              Logger.debug("Sheet unchanged (Time: #{current_time}). Skipping fetch.")
              {:ok, :unchanged, current_time}

            {:changed, current_time} ->
              Logger.info("Sheet changed/Stale. Fetching Values...")
              fetch_values(spreadsheet_id, auth_header, current_time)

            {:error, reason} ->
              Logger.warning(
                "Metadata check failed (#{inspect(reason)}). Fallback to full fetch."
              )

              fetch_values(spreadsheet_id, auth_header, nil)
          end

        error ->
          error
      end
    end
  end

  defp check_modified(spreadsheet_id, auth_header, last_known) do
    url = "https://www.googleapis.com/drive/v3/files/#{spreadsheet_id}?fields=modifiedTime"

    Finch.build(:get, url, [auth_header])
    |> Finch.request(LumentechMonitor.Finch)
    |> case do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"modifiedTime" => current_time}} ->
            if last_known == current_time do
              {:unchanged, current_time}
            else
              {:changed, current_time}
            end

          _ ->
            {:error, :json_decode_error}
        end

      {:ok, resp} ->
        {:error, "Drive API Error: #{resp.status}"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp fetch_values(spreadsheet_id, auth_header, current_time) do
    # Logger.info("Fetching from Spreadsheet ID: #{String.slice(spreadsheet_id, 0, 5)}...")
    url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A2:L"

    Finch.build(:get, url, [auth_header])
    |> Finch.request(LumentechMonitor.Finch)
    |> handle_fetch_response(current_time)
  end

  defp append_row_internal(row_data) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # Generate Sequential ID (Max + 1)
    case fetch_raw_values() do
      {:ok, rows} ->
        max_id =
          rows
          |> Enum.map(fn r -> Enum.at(r, 0) end)
          |> Enum.map(&parse_id_int/1)
          |> Enum.max(fn -> 0 end)

        new_id = max_id + 1

        # Inject ID at Index 0
        final_row = List.replace_at(row_data, 0, to_string(new_id))

        url =
          "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"

        body = %{
          "values" => [final_row]
        }

        case get_auth_header() do
          {:ok, auth_header} ->
            Finch.build(
              :post,
              url,
              [auth_header, {"Content-Type", "application/json"}],
              Jason.encode!(body)
            )
            |> Finch.request(LumentechMonitor.Finch)
            |> case do
              {:ok, %Finch.Response{status: 200}} -> {:ok, :appended}
              {:ok, response} -> {:error, "Sheet API Error: #{inspect(response.body)}"}
              {:error, reason} -> {:error, reason}
            end

          error ->
            error
        end

      error ->
        error
    end
  end

  defp parse_id_int(val) do
    case Integer.parse(to_string(val)) do
      {num, _} -> num
      _ -> 0
    end
  end

  # --- CRITICAL FIX: Split ID Logic ---
  defp update_row_internal(id, new_row_map) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    case fetch_raw_values() do
      {:ok, rows} ->
        index = find_row_index(rows, id)

        if index do
          sheet_row_number = index + 2
          # Determines UUID: Use existing (if valid UUID) or generate new (Migration)
          # Determines ID (Sequential or Legacy UUID)
          uuid =
            cond do
              # Keep existing Unique ID if valid
              new_row_map["unique_id"] && String.trim(new_row_map["unique_id"]) != "" ->
                new_row_map["unique_id"]

              # Keep mapped ID if valid and not placeholder
              new_row_map["id"] && String.trim(new_row_map["id"]) != "" &&
                  new_row_map["id"] != "PENDING" ->
                new_row_map["id"]

              # Otherwise migrate (Generate Next Sequential)
              true ->
                max_id =
                  rows
                  |> Enum.map(fn r -> Enum.at(r, 0) end)
                  |> Enum.map(&parse_id_int/1)
                  |> Enum.max(fn -> 0 end)

                to_string(max_id + 1)
            end

          row_values = [
            # Col A (0)
            uuid,
            new_row_map["pedido_original"] || parse_composite_id(new_row_map["id"]) |> elem(0),
            new_row_map["data_emissao"],
            new_row_map["cliente"],
            new_row_map["categoria"],
            new_row_map["origem"],
            new_row_map["produto"],
            new_row_map["valor"],
            new_row_map["status"],
            new_row_map["data_fechamento"],
            new_row_map["cidade"],
            new_row_map["estado"]
          ]

          url =
            "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A#{sheet_row_number}:L#{sheet_row_number}?valueInputOption=USER_ENTERED"

          body = %{"values" => [row_values]}

          case get_auth_header() do
            {:ok, auth_header} ->
              Finch.build(
                :put,
                url,
                [auth_header, {"Content-Type", "application/json"}],
                Jason.encode!(body)
              )
              |> Finch.request(LumentechMonitor.Finch)
              |> case do
                {:ok, %Finch.Response{status: 200}} -> {:ok, :updated}
                {:ok, resp} -> {:error, "Update Failed: #{inspect(resp.body)}"}
                {:error, reason} -> {:error, reason}
              end

            error ->
              error
          end
        else
          {:error, :not_found}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp update_status_internal(id, status) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    case fetch_raw_values() do
      {:ok, rows} ->
        index = find_row_index(rows, id)

        if index do
          sheet_row_number = index + 2
          # Update Status is Column I (Index 8) now!
          range = "I#{sheet_row_number}:I#{sheet_row_number}"

          url =
            "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/#{range}?valueInputOption=USER_ENTERED"

          body = %{"values" => [[status]]}

          case get_auth_header() do
            {:ok, auth_header} ->
              Finch.build(
                :put,
                url,
                [auth_header, {"Content-Type", "application/json"}],
                Jason.encode!(body)
              )
              |> Finch.request(LumentechMonitor.Finch)
              |> case do
                {:ok, %Finch.Response{status: 200}} -> {:ok, :updated}
                {:ok, resp} -> {:error, "Update Status Failed: #{inspect(resp.body)}"}
                {:error, reason} -> {:error, reason}
              end

            error ->
              error
          end
        else
          {:error, :not_found}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp delete_row_internal(id) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    case fetch_raw_values() do
      {:ok, rows} ->
        index = find_row_index(rows, id)

        if index do
          # Sheet Row Index (0-based) for deleteDimension.
          # Header is row 0. Data from A2 is row 1+
          # Rows fetched from A2. Index 0 of `rows` refers to A2, which is physical row index 1.

          # Wait, check indexing again.
          # API: "startIndex is inclusive, endIndex is exclusive" (0-based)
          # Row 1 (Header) is index 0.
          # Row 2 (Data 1) is index 1.
          # If I find data at index 0 of `rows` (which is A2), it corresponds to Sheet Row 2 -> Index 1.

          sheet_start_index = index + 1
          sheet_end_index = sheet_start_index + 1

          url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}:batchUpdate"

          body = %{
            "requests" => [
              %{
                "deleteDimension" => %{
                  "range" => %{
                    # Assuming first sheet
                    "sheetId" => 0,
                    "dimension" => "ROWS",
                    "startIndex" => sheet_start_index,
                    "endIndex" => sheet_end_index
                  }
                }
              }
            ]
          }

          case get_auth_header() do
            {:ok, auth_header} ->
              Finch.build(
                :post,
                url,
                [auth_header, {"Content-Type", "application/json"}],
                Jason.encode!(body)
              )
              |> Finch.request(LumentechMonitor.Finch)
              |> case do
                {:ok, %Finch.Response{status: 200}} -> {:ok, :deleted}
                {:ok, resp} -> {:error, "Delete Failed: #{inspect(resp.body)}"}
                {:error, reason} -> {:error, reason}
              end

            error ->
              error
          end
        else
          {:error, :not_found}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  # --- Helper: Find Row Index with Composite ID Logic ---
  defp find_row_index(rows, id) do
    # 1. Try finding by Unique ID (Col A / Index 0)
    idx_by_unique =
      Enum.find_index(rows, fn r ->
        row_uid = to_string(Enum.at(r, 0) || "") |> String.trim()
        row_uid == id and row_uid != ""
      end)

    if idx_by_unique do
      idx_by_unique
    else
      # 2. Fallback to Composite Match (Col B & G -> Indices 1 & 6)
      {target_pedido, target_produto} = parse_composite_id(id)

      Enum.find_index(rows, fn r ->
        row_pedido = to_string(Enum.at(r, 1) || "") |> String.trim()
        row_produto = to_string(Enum.at(r, 6) || "") |> String.trim()

        if target_produto do
          String.downcase(row_pedido) == String.downcase(target_pedido) &&
            String.downcase(row_produto) == String.downcase(target_produto)
        else
          String.downcase(row_pedido) == String.downcase(target_pedido)
        end
      end)
    end
  end

  defp parse_composite_id(id) do
    str_id = to_string(id)

    if String.contains?(str_id, "-") do
      # Attempt to split "PEDIDO-PRODUTO"
      # But careful if PEDIDO has dashes? Assuming standard format.
      # Usually split at first or last dash?
      # Let's try splitting at the FIRST dash found, or maybe last?
      # "12345-LedBulb".
      # Be careful about potential dashes in Product names?
      # User constructs it as `${safePedido}-${safeProduto}`.
      # So if Pedido has dash, it might be ambiguous.
      # Assuming Pedido is usually numeric or simple code.

      parts = String.split(str_id, "-", parts: 2)
      {Enum.at(parts, 0) |> String.trim(), Enum.at(parts, 1) |> String.trim()}
    else
      {String.trim(str_id), nil}
    end
  end

  defp fetch_raw_values do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A2:L"

    case get_auth_header() do
      {:ok, auth_header} ->
        Finch.build(:get, url, [auth_header])
        |> Finch.request(LumentechMonitor.Finch)
        |> case do
          {:ok, %Finch.Response{status: 200, body: body}} ->
            case Jason.decode(body) do
              {:ok, %{"values" => values}} when is_list(values) -> {:ok, values}
              {:ok, %{"values" => nil}} -> {:ok, []}
              {:ok, _} -> {:error, :invalid_response_format}
              {:error, _} -> {:error, :json_decode_failed}
            end

          {:ok, resp} ->
            {:error, "Raw Fetch Failed: #{resp.status}"}

          {:error, reason} ->
            {:error, reason}
        end

      error ->
        error
    end
  end

  defp get_auth_header do
    case GoogleAuth.get_token() do
      {:ok, token} -> {:ok, {"Authorization", "Bearer #{token.token}"}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp handle_fetch_response({:ok, %Finch.Response{status: 200, body: body}}, current_time) do
    case Jason.decode(body) do
      {:ok, %{"values" => values}} when is_list(values) ->
        rows = Enum.map(values, &map_row/1)
        {:ok, %{last_updated: DateTime.utc_now(), rows: rows}, current_time}

      {:ok, %{"values" => nil}} ->
        {:ok, %{last_updated: DateTime.utc_now(), rows: []}, current_time}

      error ->
        Logger.error("JSON Decode Error: #{inspect(error)}")
        {:error, :invalid_response}
    end
  end

  defp handle_fetch_response({:ok, resp}, _), do: {:error, "Sheet API Error: #{resp.status}"}
  defp handle_fetch_response({:error, reason}, _), do: {:error, reason}

  defp map_row(row) do
    # Index 0: Unique ID
    unique_id = Enum.at(row, 0)

    # ID Determination:
    # If Unique ID exists (and not empty), use it.
    # Fallback to Composite (Pedido-Produto) using INDICES 1 and 6 (shifted)
    id =
      if not is_nil(unique_id) and String.trim(to_string(unique_id)) != "" do
        String.trim(to_string(unique_id))
      else
        create_composite_id(Enum.at(row, 1), Enum.at(row, 6))
      end

    %{
      "id" => id,
      "unique_id" => unique_id,
      "pedido_original" => Enum.at(row, 1),
      "data_emissao" => Enum.at(row, 2),
      "cliente" => Enum.at(row, 3),
      "categoria" => Enum.at(row, 4),
      "origem" => Enum.at(row, 5),
      "produto" => Enum.at(row, 6),
      "valor" => parse_float(Enum.at(row, 7)),
      "status" => Enum.at(row, 8),
      "data_fechamento" => Enum.at(row, 9),
      "cidade" => Enum.at(row, 10),
      "estado" => Enum.at(row, 11),
      "profissional" => "N/A"
    }
  end

  defp parse_float(val) do
    str = to_string(val)

    normalized =
      if String.contains?(str, ","),
        do: String.replace(str, ".", "") |> String.replace(",", "."),
        else: str

    case Float.parse(normalized) do
      {num, _} -> num
      _ -> 0.0
    end
  end

  # Simplified for Adapter since we focus on Real impl
  defp generate_mock_data, do: []

  defp create_composite_id(pedido, produto) do
    safe_pedido = to_string(pedido || "") |> String.trim()
    safe_produto = to_string(produto || "") |> String.trim()

    if safe_pedido != "" && safe_produto != "" do
      "#{safe_pedido}-#{safe_produto}"
    else
      safe_pedido
    end
  end

  defp generate_uuid do
    :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
  end
end
