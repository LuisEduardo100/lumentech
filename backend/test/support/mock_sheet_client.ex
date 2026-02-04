defmodule LumentechMonitor.Test.MockSheetClient do
  def append_row(_row), do: {:ok, :appended}
  def update_status(_id, _status), do: {:ok, :updated}
  def update_row(_id, _row), do: {:ok, :updated}
  def delete_row(_id), do: {:ok, :deleted}
end
