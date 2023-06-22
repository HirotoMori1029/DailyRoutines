function setCurrentDate() {
  const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
  activeCell.setValue(cDate);
}
