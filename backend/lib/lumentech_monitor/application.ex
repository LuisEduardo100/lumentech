defmodule LumentechMonitor.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children =
      goth_child() ++
        [
          # Start the PubSub system
          {Phoenix.PubSub, name: LumentechMonitor.PubSub},
          # Start the Endpoint (http/https)
          LumentechMonitorWeb.Endpoint,
          # Start Finch for HTTP requests
          {Finch, name: LumentechMonitor.Finch},

          # Data Ingestion (Cache-Aside)
          LumentechMonitor.Data.DealStore

          # Deprecated: LumentechMonitor.DataIngestion.SheetWatcher (Removed/Commented)
          # LumentechMonitor.DataIngestion.SheetWatcher
        ]

    opts = [strategy: :one_for_one, name: LumentechMonitor.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp goth_child do
    # Start our custom GoogleAuth GenServer that handles clock drift
    [{LumentechMonitor.GoogleAuth, []}]
  end

  @impl true
  def config_change(changed, _new, removed) do
    LumentechMonitorWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
