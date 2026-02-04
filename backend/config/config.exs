import Config

config :tesla, disable_deprecated_builder_warning: true

config :lumentech_monitor, LumentechMonitorWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [view: LumentechMonitorWeb.ErrorView, accepts: ~w(json), layout: false],
  pubsub_server: LumentechMonitor.PubSub,
  live_view: [signing_salt: "SECRET_SALT"],
  http: [port: 4000],
  debug_errors: true,
  code_reloader: true,
  check_origin: false

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :lumentech_monitor, :sheet_client, LumentechMonitor.DataIngestion.SheetClient
config :lumentech_monitor, :data_provider, LumentechMonitor.Data.GoogleSheetsProvider
config :lumentech_monitor, :sales_adapter, LumentechMonitor.Data.Adapters.GoogleSheets
