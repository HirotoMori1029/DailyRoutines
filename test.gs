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

function testForOnScheduleBtnClicked() {
  const scheduleData = getScheduleDataFromSheet();
  const mr = new RoutineSheet(MR);
  mr.optimizeList = optimizeMrList;
  const rad = new RoutineSheet(RAD);
  //作成予定日のインフォメーションを取得
  const eventdayInfo = getEventdayInfo(scheduleData.eventday);
  //各カレンダープロパティに値を代入
  const calendarProterties = setCalendarProperties(eventdayInfo, scheduleData);
  showProgrem(scheduleData, calendarProterties);
  const msg = makeMsgFromScheduleData(scheduleData);
  if (ask(msg + "\n以上の条件でスケジュールしますか？")) {
    schedule(calendarProterties);
    //if (!isNightHour(cDate)) sendLineMessage(msg);
    //外出中に明日のスケジュールを作成していたら
    if (isCreatingNewTomorrowSchedule(scheduleData.eventday) && isCreatingOutside()) {
      rad.check('makeTomorrowSchedule()');
      activateSheet(RAD);
    }
    //MorningRoutine中にスケジュールを作成していたら
    if (isCreatingOnMr()) {
      const cMrCal = new CalendarProperty(MR, 60);
      cMrCal.setEvent(todayEvents, todayEventTitles);
      mr.optimize(makeCondition(cDate));
      mr.check('checkOrReschedule()');
      activateSheet(MR);
    }
    saveScheduleInfo(scheduleData);
  }
}