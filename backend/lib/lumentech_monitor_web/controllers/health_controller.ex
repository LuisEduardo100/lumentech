defmodule LumentechMonitorWeb.HealthController do
  use Phoenix.Controller, namespace: LumentechMonitorWeb
  alias LumentechMonitor.Data.DealStore

  def deals(conn, _params) do
    require Logger
    Logger.info("HealthController: Received request. PID: #{inspect(self())}")
    state = DealStore.get_all_deals()
    Logger.info("HealthController: Got state with #{length(state.rows)} rows from DealStore")

    # Simple JSON debug response
    json(conn, %{
      row_count: length(state.rows),
      last_updated: state.last_updated,
      sample_row: List.first(state.rows)
    })
  end
end
