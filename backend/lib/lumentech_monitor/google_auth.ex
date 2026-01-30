defmodule LumentechMonitor.GoogleAuth do
  use GenServer
  require Logger

  # Correcting for ~20 minute system clock drift (ahead of real time)
  # We subtract 25 minutes (1500 seconds) to be safe and ensure iat is in the past.
  @drift_offset 1500

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_token do
    GenServer.call(__MODULE__, :get_token)
  end

  @impl true
  def init(_) do
    # Initial state
    state = %{token: nil, expires_at: 0}
    {:ok, state, {:continue, :fetch_token}}
  end

  @impl true
  def handle_continue(:fetch_token, state) do
    case fetch_new_token() do
      {:ok, token} ->
        # Iterate to schedule next refresh
        schedule_refresh(token.expires)
        {:noreply, %{state | token: token, expires_at: token.expires}}

      {:error, reason} ->
        Logger.error("Failed to fetch Google Token: #{inspect(reason)}")
        # Retry in 10 seconds on failure
        Process.send_after(self(), :retry_fetch, 10_000)
        {:noreply, state}
    end
  end

  @impl true
  def handle_info(:refresh_token, state) do
    Logger.info("Refreshing Google Token...")
    {:noreply, state, {:continue, :fetch_token}}
  end

  def handle_info(:retry_fetch, state) do
    {:noreply, state, {:continue, :fetch_token}}
  end

  @impl true
  def handle_call(:get_token, _from, %{token: nil} = state) do
    # If no token yet, try to fetch immediately or return error?
    # Better to return error or wait. For now, returning error with retry suggestion.
    {:reply, {:error, :token_not_fetched}, state}
  end

  def handle_call(:get_token, _from, state) do
    {:reply, {:ok, state.token}, state}
  end

  defp fetch_new_token do
    try do
      # Credentials are loaded in config/runtime.exs
      json_content = Application.get_env(:goth, :json)

      if is_nil(json_content) do
        Logger.error("Goth configuration :json is missing.")
        {:error, :missing_config}
      else
        creds = Jason.decode!(json_content)
        Logger.info("Attempting Google Auth with email: #{creds["client_email"]}")

        # Calculate backdated iat
        now = System.os_time(:second)
        iat = now - @drift_offset
        # EXP must be relative to IAT, max 1 hour (3600s).
        # If we use system time for exp, valid duration = (Now + 3600) - (Now - 1500) = 5100s > 3600s -> Invalid.
        exp = iat + 3600

        claims = %{
          "iat" => iat,
          "exp" => exp,
          "aud" => "https://oauth2.googleapis.com/token",
          "scope" => "https://www.googleapis.com/auth/spreadsheets"
        }

        # Use the service account source with our custom claims
        source =
          {:service_account, creds,
           [
             claims: claims,
             scopes: ["https://www.googleapis.com/auth/spreadsheets"]
           ]}

        Goth.Token.fetch(source: source)
      end
    rescue
      e -> {:error, e}
    end
  end

  defp schedule_refresh(expires_at) do
    now = System.os_time(:second)
    diff = expires_at - now
    # Refresh 5 minutes (300s) before expiry
    # Ensure we don't pass negative time
    refresh_in = max(1, diff - 300) * 1000
    Process.send_after(self(), :refresh_token, refresh_in)
  end
end
