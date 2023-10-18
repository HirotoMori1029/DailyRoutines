
//スタートボタンが押されたときの処理
function onMrStartBtnClicked() {
  //ルーティンオブフェクトを定義
  const mr = new RoutineSheet(MR);
  mr.optimizeList = optimizeMrList;
  //カレンダー要素オブジェクトを定義
  const mrCal = new CalendarProperty(mr.name, 60);
  mrCal.event = todayEvents[todayEventTitles.indexOf(mrCal.title)];
  //昨日の未実行のイベントを見つけて削除
  confirmEventDelete();
  //スケジュールされていて、それが夜間ならば
  if (myRecord.isScheduled(cDate)) {
    const updated = myRecord.getValueFromScheduleInfo('updated', cDate);
    const todayScheduleData = myRecord.getScheduleData(cDate)
    if (isNightHour(updated)) sendRemainMessage(todayScheduleData);
  }
  mr.onStart(mrCal);
}

function onMrEndBtnClicked() {
  const mr = new RoutineSheet(MR);
  mr.optimizeList = optimizeMrList;
  const nr = new RoutineSheet(NR);
  //カレンダー要素オブジェクトを定義
  const mrCal = new CalendarProperty(mr.name, 60);
  mrCal.event = todayEvents[todayEventTitles.indexOf(mrCal.title)];
  nr.optimizeList = optimizeNrList;
  //すでにイベントが存在するならばイベントを修正
  if (mrCal.event) {
    mrCal.setTimeEnd();
  }
  mr.saveLastDones();
  mr.clearCheckAndColor();
  nr.optimize(todayCondition);
  nr.check('mrDone()');
  mr.lockColumn(1);
  if (todayCondition.goOut) {
    writeWhatToTakeWith(todayCondition);
    activateSheet(RBGO);
  } else {
    activateSheet(LD);
    setColorToLastDones();
  }
}

function onMrResetBtnClicked() {
  const mr = new RoutineSheet(MR);
  mr.optimizeList = optimizeMrList;
  mr.clearCheckAndColor();
}

function onMrOptimizeBtnClicked() {
  const mr = new RoutineSheet(MR);
  mr.optimizeList = optimizeMrList;
  mr.optimize(todayCondition);
}

//dialog.htmlを表示
function showDialog() {
  const html = HtmlService.createHtmlOutputFromFile('dialog').setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, '処理を実行中です');
}

function confirmEventDelete() {
  const yesterday = new Date(cDate.getTime() - 1000 * 60 * 60 * 24);
  const yTimeRange = getTimeRange(yesterday);
  const undoEvents = myCalendar.getEvents(...yTimeRange)
    .filter(event => event.getColor() === CalendarApp.EventColor.GRAY);
  if (undoEvents.length) {
    let undoTitles = undoEvents.map(event => event.getTitle());
    if (ask(`昨日の未実行のイベントを削除しますか？${undoTitles}`)) {
      undoEvents.forEach(event => event.deleteEvent());
    }
  }
}

function sendRemainMessage(scheduleData) {
  const lastMsg = makeMsgFromScheduleData(scheduleData);
  if (ask('send message below? ' + lastMsg)) {
    sendLineMessage(lastMsg);
  }
}

function makeMsgForHtmlDialog() {
  return Object.keys(todayCondition).reduce((acc, key) => {
    return acc + `${key} -> ${todayCondition[key]}<br>`
  }, '');
}

//mr版、自身のリストを最適化したものを得る関数を代入
function optimizeMrList(conditions) {
  const currentMonth = new Date().getMonth() + 1;
  return this.rListData.filter(routine => {

    let condition =
      routine.always ||
      (routine.goOut && conditions.goOut) ||
      (routine.meetSomeone && conditions.meetSomeone) ||
      (routine.interval && isTimeOver(getLDSaveNameByName(routine.name), INTERVAL_LIMIT_2)) ||
      (routine.name === 'check(Gmail)' && isUnreadGmail()) ||
      (routine.isStudy && conditions.isStudy);

    //期間monthを満たせているか
    if (routine.startMonth <= routine.endMonth) {
      condition =
        condition && (routine.startMonth <= currentMonth && currentMonth <= routine.endMonth);
    } else {
      condition =
        condition && !(currentMonth >= routine.endMonth && routine.startMonth >= currentMonth);
    }
    return condition;
  });
}

