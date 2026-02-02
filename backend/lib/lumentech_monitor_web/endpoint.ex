defmodule LumentechMonitorWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :lumentech_monitor

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.

  socket("/socket", LumentechMonitorWeb.UserSocket,
    websocket: [
      check_origin: false
    ],
    longpoll: false
  )

  plug(Plug.Static,
    at: "/",
    from: :lumentech_monitor,
    gzip: false,
    only: ~w(assets fonts images favicon.ico robots.txt)
  )

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug(Phoenix.CodeReloader)
  end

  plug(Plug.RequestId)
  plug(Plug.Telemetry, event_prefix: [:phoenix, :endpoint])

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()
  )

  plug(CORSPlug,
    origin: [
      "https://syslumen.aled1.com",
      "//syslumen.aled1.com",
      "http://localhost:5173",
      "http://localhost:4000"
    ]
  )

  plug(LumentechMonitorWeb.Router)
end
