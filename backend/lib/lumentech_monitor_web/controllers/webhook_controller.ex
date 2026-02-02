defmodule LumentechMonitorWeb.WebhookController do
  use Phoenix.Controller
  import Plug.Conn
  require Logger

  alias LumentechMonitor.Data.DealStore

  # Plug pipeline for authentication
  plug(:verify_token when action in [:handle_sheets_update])

  def handle_sheets_update(conn, %{"event_type" => "row_update", "data" => data}) do
    # Async dispatch
    DealStore.update_deal_async(data)

    conn
    |> send_resp(200, "Received")
  end

  def handle_sheets_update(conn, _params) do
    # Handle unknown events or bad payload
    conn
    |> send_resp(400, "Bad Request: Invalid formatting")
  end

  # Private Plug Function
  defp verify_token(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         expected_token = System.get_env("SHEETS_AUTH_TOKEN"),
         true <- !is_nil(expected_token) && Plug.Crypto.secure_compare(token, expected_token) do
      conn
    else
      _ ->
        Logger.warn("Webhook: Unauthorized access attempt")

        conn
        |> send_resp(401, "Unauthorized")
        |> halt()
    end
  end
end
