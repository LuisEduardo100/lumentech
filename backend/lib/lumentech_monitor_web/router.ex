defmodule LumentechMonitorWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/api", LumentechMonitorWeb do
    pipe_through(:api)

    post("/webhooks/sheets", WebhookController, :handle_sheets_update)
    get("/health/deals", HealthController, :deals)
  end
end
