defmodule LumentechMonitorWeb.HealthController do
  use LumentechMonitorWeb, :controller
  alias LumentechMonitor.Data.DealStore

  def deals(conn, _params) do
    state = DealStore.get_all_deals()

    # Simple JSON debug response
    json(conn, %{
      row_count: length(state.rows),
      last_updated: state.last_updated,
      sample_row: List.first(state.rows)
    })
  end
end
