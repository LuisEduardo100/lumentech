defmodule LumentechMonitor.Test.MockProvider do
  def fetch_all_deals() do
    {:ok, []}
  end

  def normalize_payload(payload) do
    # Delegate to real logic since it is pure calculation
    LumentechMonitor.Data.GoogleSheetsProvider.normalize_payload(payload)
  end
end
