//StartBtnが押されたときの処理
function onRarhStartBtnClicked() {
  //ルーティンオブフェクトを定義
  const rarh = new RoutineSheet(RARH);
  rarh.optimizeList = optimizeRarhList;
  const rarhCal = new CalendarProperty(RARH, 30);
  rarhCal.setEvent(todayEvents, todayEventTitles);
  rarh.onStart(rarhCal);
  const goOutCal = new CalendarProperty(GO, GO_OUT_TIME);
  goOutCal.setEvent(todayEvents, todayEventTitles);
  goOutCal.doneColor = CalendarApp.EventColor.ORANGE;
  const famGoOutCal = new CalendarProperty(FAM_EVENT_TITLE, GO_OUT_TIME);
  famGoOutCal.setEvent(familiyEvents, familiyEventTitles);
  if (todayEventTitles.includes('Sauna')) {
    const saunaCal = new CalendarProperty('Sauna', 60);
    saunaCal.setEvent(todayEvents, todayEventTitles);
    if (ask('set Sauna calendar end to current time?')) {
      saunaCal.setTimeEnd();
    }
    myRecord.saveValueToLastDones('take(bath)', cDate);
  }
  if (goOutCal.event) {
    goOutCal.setTimeEnd(cDate);
    goOutCal.event.setColor(goOutCal.doneColor);
    const transportation = goOutCal.event.getDescription();
    saveTransportationValue(transportation);

  } else {
    const transportation = Browser.inputBox('car, bicycle, walk, train?');
    const goOutTime = Browser.inputBox('input the time you went out (min)');
    const startTime = new Date(cDate.getTime() - 1000 * 60 * goOutTime);
    goOutCal.event = CalendarApp.createEvent(GO, startTime, cDate)
      .setDescription(transportation)
      .setColor(goOutCal.doneColor)
      .removeAllReminders();
    saveTransportationValue(transportation);
  }

  if (famGoOutCal.event) {
    famGoOutCal.setTimeEnd(cDate);
    famGoOutCal.event.setColor(familyCalendarColor);
  }

  const scheduleData = myRecord.getScheduleData(timeRange[0]);
  const destinationNames = scheduleData.destinationInfo.map(destination => destination.name);
  destinationNames.forEach(name => {
    const calendarEvent = todayEvents[todayEventTitles.indexOf(name)];
    if (calendarEvent) {
      calendarEvent.setColor(CalendarApp.EventColor.PALE_GREEN);
    }
  });
  if (!rarh.getIsRoutineSame()) {
    rarh.optimize(todayCondition);
  }
  rarh.lockColumn(2);
}


function onRarhEndBtnClicked() {
  const rarh = new RoutineSheet(RARH);
  rarh.optimizeList = optimizeRarhList;
  const rarhCal = new CalendarProperty(RARH, 30);
  rarhCal.setEvent(todayEvents, todayEventTitles);
  rarhCal.setTimeEnd();
  rarh.saveLastDones();
  rarh.lockColumn(1)
  rarh.clearCheckAndColor();
  activateSheet(LD);
}

function onRarhResetBtnClicked() {
  const rarh = new RoutineSheet(RARH);
  rarh.clearCheckAndColor();
}

function onRarhOptimizeBtnClicked() {
  const rarh = new RoutineSheet(RARH);
  rarh.optimize = optimizeRarhList;
  rarh.optimize(todayCondition);
}

function saveTransportationValue(transportation) {
  if (transportation.includes('walk')) {
    myRecord.saveValueToLastDones('lastExercise', cDate);
  }

  if (transportation.includes('bicycle')) {
    myRecord.saveValueToLastDones('lastBicycle', cDate);
    myRecord.saveValueToLastDones('lastExercise', cDate);
  }
  
  if (transportation.includes('car')) {
    myRecord.saveValueToLastDones('lastCar', cDate);
  }
}

function optimizeRarhList(conditions) {
  const currentMonth = new Date().getMonth() + 1;
  return this.rListData.filter(routine => {
    let condition =
      routine.always ||
      (routine.goSauna && conditions.goSauna) ||
      (routine.whenBicycle && conditions.transportation.includes('bicycle')) ||
      (routine.interval && isTimeOver(getLDSaveNameByName(routine.name), INTERVAL_LIMIT_2));

    //期間monthを満たせているか
    if (routine.startMonth <= routine.endMonth) {
      condition =
        condition * (routine.startMonth <= currentMonth && currentMonth <= routine.endMonth);
    } else {
      condition =
        condition * !(currentMonth >= routine.endMonth && routine.startMonth >= currentMonth);
    }
    return condition;
  })
}
