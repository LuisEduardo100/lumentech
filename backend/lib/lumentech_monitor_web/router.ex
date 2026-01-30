defmodule LumentechMonitorWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", LumentechMonitorWeb do
    pipe_through :api
  end
end
