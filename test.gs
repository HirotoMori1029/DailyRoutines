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

function saveValueToLastDonesTest() {
  myRecord.saveValueToLastDones('lastTest', cDate);
  const lastTime = myRecord.getValueFromLastDones('lastTest', 'lastTime');
  Logger.log(`lastTime = ${lastTime}`);
  const ihv = myRecord.getValueFromLastDones('lastTest', 'intervalHourAve');
  Logger.log(`intervalHourAve = ${ihv}`);
}
