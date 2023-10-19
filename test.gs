function testForIsStudySchedule() {
  const scheduleData = getScheduleDataFromSheet();
  const eventdayInfo = getEventdayInfo(scheduleData.eventday);
  const calendarProterties = setCalendarProperties(eventdayInfo, scheduleData);
  const result = isStudySchdule(calendarProterties);
  Logger.log(result);
}

function testForSetToothbrushInterval() {
  const rbgo = new RoutineSheet(RBGO);
  setToothbrushInterval(rbgo);
}

function saveValueToLastDonesTest(saveName = 'lastHighlight') {
  myRecord.saveValueToLastDones(saveName, cDate);
  const lastTime = myRecord.getValueFromLastDones(saveName, 'lastTime');
  Logger.log(`lastTime = ${lastTime}`);
  const ihv = myRecord.getValueFromLastDones(saveName, 'intervalHourAve');
  Logger.log(`intervalHourAve = ${ihv}`);
  setColorToLastDones();
}

