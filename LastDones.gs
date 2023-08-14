function setCurrentDate() {
  const sheet = ss.getSheetByName(LD);
  const names = sheet.getRange(2,1, sheet.getLastRow()).getValues().flat();
  Logger.log(names);
  const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
  const rowNumber = activeCell.getLastRow();
  const name = names[rowNumber - 2];
  Logger.log(name);
  myRecord.saveValueToLastDones(name);
}
