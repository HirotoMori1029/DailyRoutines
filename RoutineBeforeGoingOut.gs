//StringDefinition

const brush = 'brush(teeth)';


//StartBtnが押されたときの処理
function onRbgoStartBtnClicked() {
  const rbgo = new RoutineSheet(RBGO);
  rbgo.optimizeList = optimizeRbgoList;
  const rbgoCal = new CalendarProperty(RBGO, 30)
  rbgo.onStart(rbgoCal);
}

//endボタンが押されたときの処理
function onRbgoEndBtnClicked() {
  const rbgo = new RoutineSheet(RBGO);
  rbgo.optimizeList = optimizeRbgoList;
  const nr = new RoutineSheet(NR);
  const rbgoCal = new CalendarProperty(rbgo.name, 30);
  rbgoCal.event = todayEvents[todayEventTitles.indexOf(rbgo.name)];
  const goOutCal = new CalendarProperty(GO, GO_OUT_TIME);
  goOutCal.doneColor = CalendarApp.EventColor.ORANGE;
  goOutCal.setEvent(todayEvents, todayEventTitles);
  const famGoOutCal = new CalendarProperty(FAM_EVENT_TITLE, GO_OUT_TIME);
  famGoOutCal.defColor = CalendarApp.EventColor.GRAY
  famGoOutCal.doneColor = CalendarApp.EventColor.YELLOW
  famGoOutCal.setEvent(familiyEvents, familiyEventTitles);

  if (rbgoCal.event) {
    rbgoCal.setTimeEnd();
  }
  rbgo.clearCheckAndColor();
  if (goOutCal.event) {
    goOutCal.setTimeStart();
  }
  if (famGoOutCal.event) {
    famGoOutCal.setTimeStart()
  }
  nr.check("rbgoDone()")
  rbgo.lockColumn(1);
  rbgo.saveLastDones();
  activateSheet(RARH);
  Browser.msgBox('Remember that you will lock your house!, Enter(Ctrl + W)');
}

//Resetボタンが押されたときの処理
function onRbgoResetBtnClicked() {
  const rbgo = new RoutineSheet(RBGO);
  rbgo.clearCheckAndColor();
}

//optimizeボタンが押されたときの処理
function onRbgoOptimizeBtnClicked() {
  const rbgo = new RoutineSheet(RBGO);
  rbgo.optimizeList = optimizeRbgoList;
  rbgo.optimize(todayCondition);
}

function optimizeRbgoList(conditions) {
  const currentMonth = new Date().getMonth() + 1;
  return this.rListData.filter(routine => {
    let condition =
      routine.always ||
      (routine.goSauna && conditions.goSauna) ||
      (routine.whenBicycle && conditions.transportation.includes('bicycle')) ||
      (routine.isStudy && conditions.isStudy) ||
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
