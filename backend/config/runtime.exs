import Config

if File.exists?(".env") do
  Dotenvy.source!(".env")
  |> Enum.each(fn {k, v} -> System.put_env(k, v) end)
end

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be persisted.

if System.get_env("PHX_SERVER") do
  config :lumentech_monitor, LumentechMonitorWeb.Endpoint, server: true
end

if config_env() == :prod do
  config :lumentech_monitor, LumentechMonitorWeb.Endpoint,
    http: [
      port: String.to_integer(System.get_env("PORT") || "4000"),
      transport_options: [socket_opts: [:inet6]]
    ]
end

# Google Sheets Configuration
# Handle potential quoting issues in environment variables
clean_creds = fn
  nil -> nil
  val -> val |> String.trim() |> String.trim("'") |> String.trim("\"")
end

json_var = clean_creds.(System.get_env("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
path_var = clean_creds.(System.get_env("GOOGLE_APPLICATION_CREDENTIALS"))

creds_source = json_var || path_var

json_content =
  cond do
    is_nil(creds_source) || creds_source == "" ->
      nil

    String.starts_with?(creds_source, "{") ->
      # Ensure newlines in private key are correctly interpreted
      creds_source
      |> String.replace("\\n", "\n")

    File.exists?(creds_source) ->
      File.read!(creds_source)

    true ->
      IO.warn("Google Credentials file not found at: #{creds_source}")
      nil
  end

if json_content do
  config :goth, json: json_content
else
  IO.puts("WARN: No valid Google Credentials found.")
end

config :lumentech_monitor, :data_ingestion, spreadsheet_id: System.get_env("SPREADSHEET_ID")
