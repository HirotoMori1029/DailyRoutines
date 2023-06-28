//スタートボタンが押されたときの処理
function onRadStartBtnClicked() {
  const rad = new RoutineSheet(RAD);
  const studyPlaceCal = getStudyPlaceCal();
  //イベントが存在しないなら
  if (!studyPlaceCal.event) {
    if (ask(`学習イベントが作成されていません。現在時刻で作成しますか？`, Browser.Buttons.YES_NO_CANCEL)) {
      makeStudyEventAtCurrentTime();
    }
  }
  rad.onStart(studyPlaceCal);
}

//Endボタンがクリックされたとき
function onRadEndBtnClicked() {
  const rad = new RoutineSheet(RAD);
  const nr = new RoutineSheet(NR);
  const studyPlaceCal = getStudyPlaceCal();
  studyPlaceCal.setTimeEnd();
  rad.clearCheckAndColor();
  nr.check('radDone()');
  rad.lockColumn(1);
  Browser.msgBox('sayGoogleToCommutingHome');
}

//リセットボタンが押されたときの処理
function onRadResetBtnClicked() {
  const rad = new RoutineSheet(RAD);
  rad.clearCheckAndColor();
}

//オプティマイズボタンが押されたときの処理
function onRadOptimizeBtnClicked() {
  const rad = new RoutineSheet(RAD);
  rad.optimize(todayCondition);
}

function getStudyPlaceCal() {
  const studyEvent = todayEvents.find((event => event.getDescription().includes(IS_STUDY)));
  let pTitle = null;
  if (studyEvent) pTitle = studyEvent.getTitle();
  const studyPlaceCal = new CalendarProperty(pTitle, 60 * 4);
  studyPlaceCal.doneColor = CalendarApp.EventColor.PALE_GREEN;
  studyPlaceCal.setEvent(todayEvents, todayEventTitles);
  return studyPlaceCal;
}

//現在時刻で場所イベントを作成する関数
function makeStudyEventAtCurrentTime() {
  const studyPlaceCal = getStudyPlaceCal();
  studyPlaceCal.title = Browser.inputBox("Input the title (=location) of the calendarEvent creating");
  studyPlaceCal.st = cDate
  studyPlaceCal.ed = new Date(cDate.getTime() + 1000 * 60 * studyPlaceCal.time);
  studyPlaceCal.event = studyPlaceCal.make();
}
