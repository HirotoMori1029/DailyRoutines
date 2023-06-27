function testForIsStudySchedule() {
  const scheduleData = getScheduleDataFromSheet();
  const eventdayInfo = getEventdayInfo(scheduleData.eventday);
  const calendarProterties = setCalendarProperties(eventdayInfo, scheduleData);
  const result = isStudySchdule(calendarProterties);
  Logger.log(result);
}