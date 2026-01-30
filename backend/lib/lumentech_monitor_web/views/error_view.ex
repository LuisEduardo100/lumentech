defmodule LumentechMonitorWeb.ErrorView do
  def render("404.json", _), do: %{errors: %{detail: "Not Found"}}
  def render("500.json", _), do: %{errors: %{detail: "Internal Server Error"}}
  def template_not_found(template, _assigns) do
    %{errors: %{detail: "Template #{template} not found"}}
  end
end
