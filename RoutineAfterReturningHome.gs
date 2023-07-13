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
    if (ask('set Sauna calendar end to current time?')) 
    saunaCal.setTimeEnd();
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
  const nr = new RoutineSheet(NR);
  rarhCal.setTimeEnd();
  nr.check('rarhDone()');
  rarh.saveLastDones();
  rarh.lockColumn(1)
  rarh.clearCheckAndColor();
  activateSheet(NR);
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
  if (transportation.includes('bicycle')) {
    myRecord.saveValueTo(LD, 'lastBicycle', cDate);
    myRecord.saveValueTo(LD, 'lastExercise', cDate);
  }
  if (transportation.includes('car')) {
    myRecord.saveValueTo(LD, 'lastCar', cDate);
  }
}

function optimizeRarhList(conditions) {
  const currentMonth = new Date().getMonth() + 1;
  return this.rListData.filter(routine => {
    let condition =
      routine.always ||
      (routine.goSauna && conditions.goSauna) ||
      (routine.whenBicycle && conditions.transportation.includes('bicycle'));
    (routine.interval && hasDoneOutOfInterval(
      `last${routine.name[0].toUpperCase() + routine.name.slice(1)}`,
      routine.interval)
    );

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
