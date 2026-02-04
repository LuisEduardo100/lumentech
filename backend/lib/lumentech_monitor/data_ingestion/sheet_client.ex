defmodule LumentechMonitor.DataIngestion.SheetClient do
  require Logger

  def fetch(last_known_modified_time \\ nil) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]

    if is_nil(spreadsheet_id) do
      Logger.info("SPREADSHEET_ID is missing in config. Using Mock Data.")
      {:ok, generate_mock_data(), nil}
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
              Logger.warn("Metadata check failed (#{inspect(reason)}). Fallback to full fetch.")
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

      # If 403/404, might be scope issue or invalid ID
      {:ok, resp} ->
        {:error, "Drive API Error: #{resp.status}"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp fetch_values(spreadsheet_id, auth_header, current_time) do
    Logger.info("Fetching from Spreadsheet ID: #{String.slice(spreadsheet_id, 0, 5)}...")
    url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A2:K"

    Finch.build(:get, url, [auth_header])
    |> Finch.request(LumentechMonitor.Finch)
    |> handle_fetch_response(current_time)
  end

  def append_row(row_data) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # row_data is a list of values matching the columns A-K
    # [id, emission, client, category, origin, product, value, status, closing, city, state]

    url =
      "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"

    body = %{
      "values" => [row_data]
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
  end

  def update_row(id, new_row_map) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    case fetch_raw_values() do
      {:ok, rows} ->
        index =
          Enum.find_index(rows, fn r ->
            row_id = Enum.at(r, 0) |> to_string() |> String.trim()
            target_id = to_string(id) |> String.trim()
            row_id == target_id
          end)

        if index do
          # Row index is 1-based (and usually header is 1).
          # Raw values start from A2 (index 0). So Sheet Row = index + 2.
          sheet_row_number = index + 2
          range = "A#{sheet_row_number}:K#{sheet_row_number}"

          # Construct row list from map
          row_values = [
            new_row_map["id"],
            new_row_map["data_emissao"],
            new_row_map["cliente"],
            new_row_map["categoria"],
            new_row_map["origem"],
            new_row_map["produto"],
            # Should be string or number? Sheets handles both.
            new_row_map["valor"],
            new_row_map["status"],
            new_row_map["data_fechamento"],
            new_row_map["cidade"],
            new_row_map["estado"]
          ]

          url =
            "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/#{range}?valueInputOption=USER_ENTERED"

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

  def update_status(id, status) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    case fetch_raw_values() do
      {:ok, rows} ->
        index =
          Enum.find_index(rows, fn r ->
            row_id = Enum.at(r, 0) |> to_string() |> String.trim()
            target_id = to_string(id) |> String.trim()
            row_id == target_id
          end)

        if index do
          # Row index is 1-based (and usually header is 1).
          # Raw values start from A2 (index 0). So Sheet Row = index + 2.
          sheet_row_number = index + 2
          # Status is Column H (8th letter).
          range = "H#{sheet_row_number}:H#{sheet_row_number}"

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

  def delete_row(id) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # To delete a row physically, we need batchUpdate request with deleteDimension.
    # We need the SHEET ID (gid), not just spreadsheet_id.
    # Assuming first sheet (gid=0) unless specified?
    # Usually easier to just clear content, but user might want physical deletion.
    # User said "excluir aquele item".
    # Let's try physical deletion using deleteDimension.

    case fetch_raw_values() do
      {:ok, rows} ->
        # Parse Composite ID (Pedido-Produto) or Pedido
        {target_pedido, target_produto} =
          if String.contains?(id, "-") do
            parts = String.split(to_string(id), "-", parts: 2)
            {Enum.at(parts, 0) |> String.trim(), Enum.at(parts, 1) |> String.trim()}
          else
            {to_string(id) |> String.trim(), nil}
          end

        index =
          Enum.find_index(rows, fn r ->
            # Row mapping: 0=Pedido, 5=Produto
            row_pedido = to_string(Enum.at(r, 0) || "") |> String.trim()
            row_produto = to_string(Enum.at(r, 5) || "") |> String.trim()

            if target_produto do
              # Match both
              String.downcase(row_pedido) == String.downcase(target_pedido) &&
                String.downcase(row_produto) == String.downcase(target_produto)
            else
              # Fallback: Match only Pedido if no composite provided (risky for duplicates but maintains compat)
              String.downcase(row_pedido) == String.downcase(target_pedido)
            end
          end)

        if index do
          # Sheet Row Index (0-based) for deleteDimension.
          # Header is row 0. Data from A2 is row 1+
          # Rows fetched from A2. Index 0 of `rows` refers to A2, which is physical row index 1 in 0-based API.
          # Wait, data starts at A2.
          # Row 0 = Header
          # Row 1 = Data 1
          # If index found is 0 (first data item), it corresponds to physical index 1.

          sheet_row_index = index + 1
          start_index = sheet_row_index
          end_index = start_index + 1

          url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}:batchUpdate"

          body = %{
            "requests" => [
              %{
                "deleteDimension" => %{
                  "range" => %{
                    # Assuming first sheet! Risk if customized.
                    "sheetId" => 0,
                    "dimension" => "ROWS",
                    "startIndex" => start_index,
                    "endIndex" => end_index
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

  # Helper to get raw values for finding index
  defp fetch_raw_values do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # Fetching from A2 to exclude header
    url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A2:K"

    case get_auth_header() do
      {:ok, auth_header} ->
        Finch.build(:get, url, [auth_header])
        |> Finch.request(LumentechMonitor.Finch)
        |> case do
          {:ok, %Finch.Response{status: 200, body: body}} ->
            case Jason.decode(body) do
              {:ok, %{"values" => values}} ->
                Logger.info("SheetClient: Fetched #{length(values)} raw rows from Sheet.")
                {:ok, values}

              # Sheet is empty
              {:ok, %{"values" => nil}} ->
                Logger.info("SheetClient: Sheet returned 'values' => nil (Empty Sheet)")
                {:ok, []}

              {:ok, _} ->
                {:error, :invalid_response_format}

              {:error, _} ->
                {:error, :json_decode_failed}
            end

          {:ok, response} ->
            Logger.error(
              "Failed to fetch raw values: #{inspect(response.status)} - #{inspect(response.body)}"
            )

            {:error, :fetch_failed}

          {:error, reason} ->
            Logger.error("Finch request error for raw values: #{inspect(reason)}")
            {:error, reason}
        end

      error ->
        error
    end
  end

  defp get_auth_header do
    case LumentechMonitor.GoogleAuth.get_token() do
      {:ok, token} ->
        {:ok, {"Authorization", "Bearer #{token.token}"}}

      {:error, reason} ->
        Logger.error("Google Auth Error: #{inspect(reason)}")
        {:error, :auth_error}
    end
  end

  defp handle_fetch_response({:ok, %Finch.Response{status: 200, body: body}}, current_time) do
    case Jason.decode(body) do
      {:ok, %{"values" => values}} when is_list(values) ->
        rows = Enum.map(values, &map_row/1)
        Logger.info("SheetClient: Successfully mapped #{length(rows)} rows.")
        {:ok, %{last_updated: DateTime.utc_now(), rows: rows}, current_time}

      {:ok, %{"values" => nil}} ->
        Logger.info("SheetClient: Sheet returned 'values' => nil (Empty Sheet)")
        {:ok, %{last_updated: DateTime.utc_now(), rows: []}, current_time}

      error ->
        Logger.error("JSON Decode Error: #{inspect(error)}")
        {:error, :invalid_response}
    end
  end

  defp handle_fetch_response({:ok, %Finch.Response{status: status, body: body}}, _time) do
    Logger.error("Sheet API Error: #{status} - #{inspect(body)}")
    {:error, :api_error}
  end

  defp handle_fetch_response({:error, reason}, _time) do
    Logger.error("Finch Request Error: #{inspect(reason)}")
    {:error, reason}
  end

  defp map_row(row) do
    %{
      # A: Pedido
      "id" => Enum.at(row, 0),
      # B: Data de emissão
      "data_emissao" => Enum.at(row, 1),
      # C: Cliente
      "cliente" => Enum.at(row, 2),
      # D: Categoria (Perfil/Orglight)
      "categoria" => Enum.at(row, 3),
      # E: Origem
      "origem" => Enum.at(row, 4),
      # F: Produto
      "produto" => Enum.at(row, 5),
      # G: Valor
      "valor" => parse_float(Enum.at(row, 6)),
      # H: Status
      "status" => Enum.at(row, 7),
      # I: Data de fechamento
      "data_fechamento" => Enum.at(row, 8),
      # J: Cidade
      "cidade" => Enum.at(row, 9),
      # K: UF
      "estado" => Enum.at(row, 10),

      # Field not present in columns A-K, keeping default/empty
      "profissional" => "N/A"
    }
  end

  defp parse_float(val) do
    str = to_string(val)

    # Check for pt-BR format (1.234,56)
    normalized =
      if String.contains?(str, ",") do
        str
        # Remove thousand separators
        |> String.replace(".", "")
        # Replace decimal separator
        |> String.replace(",", ".")
      else
        str
      end

    case Float.parse(normalized) do
      {num, _} -> num
      _ -> 0.0
    end
  end

  # --- Fallback Mock Data ---
  defp generate_mock_data do
    %{
      last_updated: DateTime.utc_now(),
      rows: Enum.map(1..50, fn _ -> generate_row() end)
    }
  end

  defp generate_row do
    status = Enum.random(["Em andamento", "Ganho", "Perdido"])
    emissao = Date.utc_today() |> Date.add(-Enum.random(0..30))
    fechamento = if status == "Ganho", do: Date.add(emissao, Enum.random(1..10)), else: nil

    %{
      "id" => Enum.random(10000..99999),
      "cliente" => Enum.random(["Cliente A", "Cliente B", "Construtora XYZ", "Loja ABC"]),
      "profissional" =>
        Enum.random(["Arq. Roberto Souza", "Eng. Marcos Lima", "Ana Silva", "Pedro", "João"]),
      "status" => status,
      "categoria" => Enum.random(["Pendentes e Lustres", "Iluminação Técnica", "Projetos"]),
      "origem" =>
        Enum.random(["Instagram", "Indicação", "Google", "Website", "Eventos", "Email"]),
      "data_emissao" => Date.to_iso8601(emissao),
      "data_fechamento" => if(fechamento, do: Date.to_iso8601(fechamento), else: nil),
      "valor" => Enum.random(1000..20000) / 1.0,
      "cidade" =>
        Enum.random(["São Paulo", "Rio de Janeiro", "Fortaleza", "Belo Horizonte", "Curitiba"]),
      "estado" => Enum.random(["SP", "RJ", "CE", "MG", "PR", "RS", "SC"])
    }
  end
end
