function setCurrentDate() {
  const sheet = ss.getSheetByName(LD);
  const names = sheet.getRange(2, 1, sheet.getLastRow()).getValues().flat();
  const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
  const rowNumber = activeCell.getLastRow();
  const name = names[rowNumber - 2];
  myRecord.saveValueToLastDones(name);
  setColorToLastDones();
}

function setColorToLastDones() {
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

    if (diff >= INTERVAL_LIMIT_1) {
      bkRange.setBackground('#ef476f');
    } else if (diff >= INTERVAL_LIMIT_2){
      bkRange.setBackground('#ffd166');
    } else {
      bkRange.setBackground('#06d6a0');
    }
  })
}

function highlight(valuename = 'lastHighlight') {
  myRecord.saveValueToLastDones(valuename);
  setColorToLastDones();
}

function addNewLD() {
  let name =Browser.inputBox('input record name');
  name = getLDSaveNameByName(name);
  myRecord.saveValueToLastDones(name);
  setColorToLastDones();
}
 