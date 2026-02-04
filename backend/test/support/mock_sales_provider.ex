defmodule LumentechMonitor.Test.MockSalesProvider do
  @behaviour LumentechMonitor.Data.SalesProvider

  def fetch_all_deals do
    {:ok, []}
  end

  def append_deal(_row) do
    {:ok, :appended}
  end

  def update_status(_id, _status) do
    {:ok, :updated}
  end

  def update_row(_id, _row) do
    {:ok, :updated}
  end

  def delete_deal(_id) do
    {:ok, :deleted}
  end

  def normalize_payload(data) do
    # Simple pass-through or mapping for tests
    if is_list(data) do
      id = Enum.at(data, 11) || "#{Enum.at(data, 0)}-#{Enum.at(data, 5)}"

      %{
        "id" => id,
        "pedido_original" => Enum.at(data, 0),
        "cliente" => Enum.at(data, 2),
        "produto" => Enum.at(data, 5),
        "valor" => Enum.at(data, 6) |> to_string() |> Float.parse() |> elem(0),
        "status" => Enum.at(data, 7),
        "data_emissao" => Enum.at(data, 1),
        "estado" => Enum.at(data, 10),
        "origem" => Enum.at(data, 4),
        "categoria" => Enum.at(data, 3)
      }
    else
      data
    end
  end
end
