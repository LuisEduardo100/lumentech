defmodule LumentechMonitor.DataProvider do
  @callback fetch_all_deals() :: {:ok, [map()], any()} | {:error, any()}
  @callback normalize_payload(map()) :: map()
end
