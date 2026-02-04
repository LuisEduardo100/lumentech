defmodule LumentechMonitor.Data.SalesProvider do
  @moduledoc """
  Behaviour for Sales Data Providers (e.g., Google Sheets, CRM).
  """

  @type deal :: map()
  @type id :: String.t()
  @type reason :: term()

  @callback fetch_all_deals() :: {:ok, [deal]} | {:error, reason}
  @callback append_deal(row_data :: list()) :: {:ok, term()} | {:error, reason}
  @callback update_status(id, status :: String.t()) :: {:ok, term()} | {:error, reason}
  @callback update_row(id, row_map :: map()) :: {:ok, term()} | {:error, reason}
  @callback delete_deal(id) :: {:ok, term()} | {:error, reason}
  @callback normalize_payload(data :: map()) :: deal
end
