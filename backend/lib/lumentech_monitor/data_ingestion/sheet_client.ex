defmodule LumentechMonitor.DataIngestion.SheetClient do
  require Logger

  def fetch do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]

    if is_nil(spreadsheet_id) do
      Logger.info("SPREADSHEET_ID missing. Using Mock Data.")
      {:ok, generate_mock_data()}
    else
      case get_auth_header() do
        {:ok, auth_header} ->
          url = "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A2:K"

          Finch.build(:get, url, [auth_header])
          |> Finch.request(LumentechMonitor.Finch)
          |> handle_fetch_response()

        {:error, reason} ->
          Logger.error("Fetch failed: #{inspect(reason)}")
          {:error, reason}
      end
    end
  end

  def append_row(row_data) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # row_data is a list of values matching the columns A-K
    # [id, emission, client, category, origin, product, value, status, closing, city, state]

    url =
      "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED"

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

  def update_status(id, new_status) do
    spreadsheet_id = Application.get_env(:lumentech_monitor, :data_ingestion)[:spreadsheet_id]
    if is_nil(spreadsheet_id), do: {:error, :spreadsheet_id_missing}

    # 1. Fetch current data to find the row index of the ID
    case fetch_raw_values() do
      {:ok, rows} ->
        # Find index. Rows[0] is header usually, but we check all.
        # Column A is ID (index 0).
        # We fetch from A2:K, so the first row in `rows` corresponds to row 2 in the sheet.
        index = Enum.find_index(rows, fn r -> Enum.at(r, 0) == id end)

        if index do
          # Sheet rows are 1-based.
          # If rows included header, index 0 is Row 1.
          # Adjust based on header presence. Assuming Header is Row 1.
          # API result usually "values" array.
          # If we used Range 'A:K', index 0 is Row 1.
          # So Row Number = index + 1.
          # Since we fetch from A2, the first element of `rows` is sheet row 2.
          # So, sheet_row_number = index_in_list + 2
          sheet_row_number = index + 2

          # Status column is Column H (8th letter).
          # Range: H{RowNumber}
          range = "H#{sheet_row_number}"

          url =
            "https://sheets.googleapis.com/v4/spreadsheets/#{spreadsheet_id}/values/#{range}?valueInputOption=USER_ENTERED"

          body = %{
            "values" => [[new_status]]
          }

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
                {:ok, response} -> {:error, "Update Failed: #{inspect(response.body)}"}
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
              {:ok, %{"values" => values}} -> {:ok, values}
              # Sheet is empty
              {:ok, %{"values" => nil}} -> {:ok, []}
              {:ok, _} -> {:error, :invalid_response_format}
              {:error, _} -> {:error, :json_decode_failed}
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

  defp handle_fetch_response({:ok, %Finch.Response{status: 200, body: body}}) do
    case Jason.decode(body) do
      {:ok, %{"values" => values}} when is_list(values) ->
        rows = Enum.map(values, &map_row/1)
        {:ok, %{last_updated: DateTime.utc_now(), rows: rows}}

      {:ok, %{"values" => nil}} ->
        {:ok, %{last_updated: DateTime.utc_now(), rows: []}}

      error ->
        Logger.error("JSON Decode Error: #{inspect(error)}")
        {:error, :invalid_response}
    end
  end

  defp handle_fetch_response({:ok, %Finch.Response{status: status, body: body}}) do
    Logger.error("Sheet API Error: #{status} - #{inspect(body)}")
    {:error, :api_error}
  end

  defp handle_fetch_response({:error, reason}) do
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
