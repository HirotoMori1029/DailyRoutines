function setCurrentDate() {
  const sheet = ss.getSheetByName(LD);
  const names = sheet.getRange(2, 1, sheet.getLastRow()).getValues().flat();
  Logger.log(names);
  const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
  const rowNumber = activeCell.getLastRow();
  const name = names[rowNumber - 2];
  Logger.log(name);
  myRecord.saveValueToLastDones(name);
}

function setColorToTimeOver() {
  const sheet = ss.getSheetByName(LD);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const lastTimeIndex = headers.indexOf('lastTime');
  const targetValueIndex = headers.indexOf('targetValue');

  //それぞれのインターバルを算出
  values.forEach((value, index) => {
    const lastTime = value[lastTimeIndex].getTime();
    const targetValue = value[targetValueIndex] 
    const cInterval = (cDate.getTime() - lastTime) * timeToDay;
    const diff = ((cInterval - targetValue) / targetValue);
    const bkRange = sheet.getRange(index + 2, lastTimeIndex + 1);

    if (diff >= 0.4) {
      bkRange.setBackground('#cdb4db');
    } else {
      bkRange.setBackground(null);
    }
  })
}
