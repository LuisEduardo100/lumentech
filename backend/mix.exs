defmodule LumentechMonitor.MixProject do
  use Mix.Project

  def project do
    [
      app: :lumentech_monitor,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      listeners: [Phoenix.CodeReloader]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :runtime_tools],
      mod: {LumentechMonitor.Application, []}
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_pubsub, "~> 2.1"},
      {:plug_cowboy, "~> 2.6"},
      {:jason, "~> 1.4"},
      {:cors_plug, "~> 3.0"},
      {:goth, "~> 1.4"},
      {:google_api_sheets, "~> 0.34"},
      {:dotenvy, "~> 0.8"},
      {:finch, "~> 0.19"}
    ]
  end
end
