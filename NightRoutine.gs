//Startボタンが押されたときの処理
function onNrStartBtnClicked() {
  const nr = new RoutineSheet(NR);
  nr.optimizeList = optimizeNrList;
  const nrCal = new CalendarProperty(NR, 60 * 3);
  nrCal.setEvent(todayEvents, todayEventTitles);
  nr.onStart(nrCal);
}

//Endボタンが押されたときの処理
function onNrEndBtnClicked() {
  const nr = new RoutineSheet(NR);
  const nrCal = new CalendarProperty(NR, 60 * 3);
  nrCal.setEvent(todayEvents, todayEventTitles);
  //イベントがあるならば修正する
  if (nrCal.event) nrCal.setTimeEnd();
  nr.saveLastDones();
  nr.clearCheckAndColor();
  nr.lockColumn(1);
  activateSheet(LD);
  Browser.msgBox('Good job!, make sure sayGoogleToGoodNight!!')
}

function onNrResetBtnClicked() {
  const nr = new RoutineSheet(NR);
  nr.clearCheckAndColor();
}

function onNrOptimizeBtnClicked() {
  const nr = new RoutineSheet(NR);
  nr.optimizeList = optimizeNrList;
  nr.optimize(todayCondition);
}

//nr版、自身のリストを最適化したものを得る関数を代入
function optimizeNrList(conditions) {
  const currentMonth = new Date().getMonth() + 1;
  return this.rListData.filter(routine => {

    let condition =
      routine.always ||
      (routine.goOut && conditions.goOut) ||
      (routine.meetSomeone && conditions.meetSomeone) ||
      (routine.notGoSauna && !conditions.goSauna) ||
      (routine.interval && isTimeOver(getLDSaveNameByName(routine.name))) ||
      (routine.isStudy && conditions.isStudy);

    //期間monthを満たせているか
    if (routine.startMonth <= routine.endMonth) {
      condition =
        condition && (routine.startMonth <= currentMonth && currentMonth <= routine.endMonth);
    } else {
      condition =
        condition && !(currentMonth > routine.endMonth && routine.startMonth > currentMonth);
    }
    return condition;
  })
}