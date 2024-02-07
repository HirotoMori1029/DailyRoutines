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

function highlight() {
  myRecord.saveValueToLastDones('lastHighlight');
  setColorToLastDones();
}

function addNewLD() {
  let name =Browser.inputBox('input record name');
  name = getLDSaveNameByName(name);
  myRecord.saveValueToLastDones(name);
  sortDataRange();
  setColorToLastDones();
}

function sortDataRange() {
  const sheet = ss.getSheetByName(LD);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn);
  const sortTargetColumn = sheet.getRange(1,1,1, lastColumn).getValues()[0].indexOf("targetValue") + 1;
  data.sort({column: sortTargetColumn});
}

function setPreviousDate() {
  const sheet = ss.getSheetByName(LD);
  const names = sheet.getRange(2, 1, sheet.getLastRow()).getValues().flat();
  const activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveCell();
  const rowNumber = activeCell.getLastRow();
  const name = names[rowNumber - 2];
  const inputDate = new Date(cDate);
  inputDate.setHours(inputDate.getHours(), 0, 0, 0);
  loggerWithName("inputDate", inputDate);
  const inputDateStr = Browser.inputBox("Please enter the date and time in six digits, like 020714");
  if (!(inputDateStr.length === 6)) {
    Browser.msgBox("input 6 digits !!");
    return;
  }
  const firstTwoDigits = parseInt(inputDateStr.substring(0, 2));
  const thirdAndFourthDigits = parseInt(inputDateStr.substring(2, 4));
  const fifthAndSixthDigits = parseInt(inputDateStr.substring(4, 6));
  inputDate.setMonth(firstTwoDigits - 1);
  inputDate.setDate(thirdAndFourthDigits);
  inputDate.setHours(fifthAndSixthDigits);
  const lastTime = myRecord.getValueFromLastDones(name, 'lastTime');
  if ( lastTime.getTime() >= inputDate.getTime()) {
    Browser.msgBox('input larger date from lastTime of ' + name);
    return;
  }
  myRecord.saveValueToLastDones(name, inputDate);
  setColorToLastDones();
}

 