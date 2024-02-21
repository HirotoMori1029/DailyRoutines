//todo 方針
//　headerとvalueを分ける必要がないので、削除して統一する必要がある。たぶんvaluesに統一
//　その際、valuesの数字は、ずれるので使われている箇所の修正が必要である


//文字列の定義
const NOTHING = 'nothing';
const DICELLNAME = 'DestinationInfo';
const DI = 'destinationInfo';

//スケジュールボタンが押されたとき
function onScheduleBtnClicked() {
  const scheduleData = getScheduleDataFromSheet();
  //作成予定日のインフォメーションを取得
  const eventdayInfo = getEventdayInfo(scheduleData.eventday);
  //各カレンダープロパティに値を代入
  const calendarProterties = setCalendarProperties(eventdayInfo, scheduleData);
  showProgrem(scheduleData, calendarProterties);
  const msg = makeMsgFromScheduleData(scheduleData);
  if (ask(msg + "\n以上の条件でスケジュールしますか？")) {
    schedule(calendarProterties);
    if (!isNightHour(cDate)) sendLineMessage(msg);
    saveScheduleInfo(scheduleData);
    activateSheet('ScheduleInfo');
  }
}

function onCancelBtnClicked() {
  const sd = getScheduleDataFromSheet();
  const msg = `${sd.eventday.getMonth() + 1}月${sd.eventday.getDate()}日
    ${getDateStrFromDayDiff(getDayDiffFromCurrentDate(sd.eventday))}の予定をキャンセルしました。`;
  if (ask(`以下のメッセージを送信しますか？ -> ${msg}`)) {
    const gray = CalendarApp.EventColor.GRAY
    const grayEvents = todayEvents.filter(event => event.getColor() === gray);
    grayEvents.forEach(event => event.deleteEvent());
    const grayFamilyEvents = familiyEvents.filter(event => {
      return event.getTitle() === FAM_EVENT_TITLE && event.getColor() === gray
    });
    grayFamilyEvents.forEach(event => event.deleteEvent());
    sendLineMessage(msg);
  }
}

//ScheduleSheetから情報を取得する関数
function getScheduleDataFromSheet() {
  const sheet = ss.getSheetByName(MS);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const scheduleData = {};

  //keyValueになっている部分はそのままscheduleInfoに代入する
  const destinationInfoCell = sheet.createTextFinder(DICELLNAME).findNext();
  const endIndex = destinationInfoCell.getRow();
  for (let k = 0; k <= endIndex; k++) {
    scheduleData[values[k][0]] = values[k][1];
  }
  //eventdayを定義
  scheduleData.eventday.setHours(MORNING_HOUR + 1);

  //DestinationInfoを定義する
  const destinationHeaders = values[destinationInfoCell.getRow() - 1];
  const destinationArray = [];

  let l = endIndex;

  let destinatinName = values[l][1];
  while (destinatinName !== NOTHING) {
    let obj = {};
    for (let m = 1; m < destinationHeaders.length; m++) {
      if (destinationHeaders[m]) {
        obj[destinationHeaders[m]] = values[l][m];
      }
    }
    destinationArray.push(obj);
    l++;
    destinatinName = values[l][1];
  }

  scheduleData[DI] = destinationArray;
  const start = destinationArray[0];
  const leaveTime = new Date(scheduleData.eventday);
  leaveTime.setHours(start.startHour, start.startMin, 0, 0);
  scheduleData.leaveTime = leaveTime;
  scheduleData.toFirstDestination = start.stay;
  const end = destinationArray[destinationArray.length - 1];
  const arriveTime = new Date(scheduleData.eventday);
  arriveTime.setHours(end.startHour, end.startMin + end.stay, 0, 0);
  scheduleData.arriveTime = arriveTime;
  scheduleData.fromLastDestination = end.stay;
  //目的地の名前の配列を取得
  const destinationNames = destinationArray.map(dest => dest.name);
  scheduleData.goSauna = destinationNames.includes(SAUNA);

  if (!scheduleData.goOut) {
    scheduleData.leaveTime = NOTHING;
    scheduleData.arriveTime = NOTHING;
    scheduleData[DI].forEach((destination) => {
      Object.keys(destination).forEach(key =>
        destination[key] = NOTHING
      )
    })
  }
  return scheduleData;
}

//作っているのが明日のスケジュールなのか判定する関数
function isCreatingNewTomorrowSchedule(eventday) {
  const isTomorrow = getDateStrFromDayDiff(getDayDiffFromCurrentDate(eventday)) === "明日";
  return isTomorrow && !myRecord.isScheduled(eventday);
}

//あるイベント中に予定を作成しているか？
function isCreatingOn(eventName) {
  const refEvent = todayEvents[todayEventTitles.indexOf(eventName)];
  if (refEvent) return getTimingOfEvent(refEvent) === 'onTime';
  return false;
}

//イベント作成する対象日の情報をその日のカレンダーから取得する
function getEventdayInfo(eventday) {
  //当日のconditionを得るため、
  const events = myCalendar.getEvents(...getTimeRange(eventday));
  const titles = events.map(event => event.getTitle());
  const conditions = makeCondition(eventday);
  const familyEvents = familyCalendar.getEvents(...getTimeRange(eventday));
  const familyEventTitles = familyEvents.map(event => event.getTitle());
  return { eventday, events, titles, familyEvents, familyEventTitles, conditions };
}

//水曜日に温泉に行くことになってる？
function getSaunaAtWed(goSauna, eDay) {
  return goSauna && eDay.getDay === 3;
}

//図書館が閉まっている可能性がある?
function isLibraryClosed(scheduleData) {
  scheduleData.destinationInfo.forEach(destination => {
    if ((destination === 'ImariLibrary') && (eDay.getDay() === 1)) return true;
    if ((destination === 'NishiaritaLibrary') && (eDay.getDay() === 2)) return true;
  })
  return false;
}

//降水確率が30%以上なら、trueを返す
function isNeedUmbrella(scheduleData) {
  return getPrecipByScraping(scheduleData.eventday) >= 30;
}

//日付情報に関する問題をバリデーションする
function showProgrem(scheduleData, calendarPropeties) {
  let msg = '';

  if (getSaunaAtWed(scheduleData.goSauna, scheduleData.eventday)) {
    msg += '目的地のSaunaが非営業日の可能性があります\n';
  }
  if (isLibraryClosed(scheduleData)) {
    msg += '目的地の図書館が非営業日の可能性があります\n';
  }
  if (isNeedUmbrella(scheduleData)) {
    msg += '傘が必要です\n';
  }

  if (msg) Browser.msgBox(msg);
}


function askForMakeEvent(msg) {
  return ask(msg + "\n以上のメッセージを送信しますがよろしいですか？");
}

function saveScheduleInfo(scheduleData) {
  //イベント日を記録
  myRecord.saveValueToScheudleInfo('eventday', scheduleData.eventday, scheduleData.eventday);
  //goKeyValuesを記録
  const scheduleDataJson = JSON.stringify(scheduleData);
  myRecord.saveValueToScheudleInfo('scheduleData', scheduleDataJson, scheduleData.eventday);
  //アップデート日を記録
  myRecord.saveValueToScheudleInfo('updated', cDate, scheduleData.eventday);
}

//カレンダープロパティに値を入れる
function setCalendarProperties(eventdayInfo, scheduleData) {

  //ルーティンオブフェクトを定義
  const rbgo = new RoutineSheet(RBGO);
  const rarh = new RoutineSheet(RARH);

  const { eventday, events, familyEvents, titles, familyEventTitles } = eventdayInfo;
  //カレンダー要素オブジェクトを定義
  const goOutCal = new CalendarProperty(GO, GO_OUT_TIME);
  const famGoOutCal = new CalendarProperty(FAM_EVENT_TITLE, GO_OUT_TIME);
  const rbgoCal = new CalendarProperty(RBGO, 30);
  const rarhCal = new CalendarProperty(RARH, 30);

  const calendarPropeties = [goOutCal, famGoOutCal, rbgoCal, rarhCal];

  goOutCal.doneColor = CalendarApp.EventColor.ORANGE;
  goOutCal.st = new Date(scheduleData.leaveTime);
  goOutCal.ed = new Date(scheduleData.arriveTime);
  goOutCal.desc = scheduleData.transportation;
  goOutCal.setEvent(events, titles);
  goOutCal.setScheduleMode(scheduleData);

  famGoOutCal.calendar = familyCalendar;
  famGoOutCal.defColor = CalendarApp.EventColor.GRAY;
  famGoOutCal.doneColor = CalendarApp.EventColor.YELLOW;
  famGoOutCal.st = goOutCal.st;
  famGoOutCal.ed = goOutCal.ed;
  famGoOutCal.setEvent(familyEvents, familyEventTitles);
  famGoOutCal.setScheduleMode(scheduleData);

  rbgoCal.reminderTime = 5;
  rbgoCal.st = new Date(goOutCal.st.getTime() - 1000 * 60 * rbgoCal.time);
  rbgoCal.ed = new Date(rbgoCal.st.getTime() + 1000 * 60 * rbgoCal.time);
  rbgoCal.desc = rbgo.url;
  rbgoCal.setEvent(events, titles);
  rbgoCal.setScheduleMode(scheduleData);

  scheduleData.destinationInfo.forEach(destination => {
    if (!(destination.name === 'END' || destination.name === 'START')) {
      const calProperty = new CalendarProperty(destination.name, destination.stay);
      calProperty.st = new Date(eventday);
      calProperty.st.setHours(destination.startHour, destination.startMin, 0, 0);
      calProperty.ed = new Date(calProperty.st.getTime() + 1000 * 60 * destination.stay);
      if (destination.isStudy) calProperty.desc = IS_STUDY;
      calProperty.setEvent(events, titles);
      calProperty.setScheduleMode(scheduleData);
      calendarPropeties.push(calProperty);
    }
  })

  rarhCal.reminderTime = 15;
  rarhCal.st = goOutCal.ed
  rarhCal.ed = new Date(goOutCal.ed.getTime() + 1000 * 60 * rarhCal.time);
  rarhCal.desc = rarh.url;
  rarhCal.reminderTime += scheduleData.fromLastDestination;
  rarhCal.setEvent(events, titles);
  rarhCal.setScheduleMode(scheduleData);

  return calendarPropeties;
}

function schedule(calendarPropeties) {
  calendarPropeties.forEach((calendarProperty => {
    if (calendarProperty.scheduleMode === 'make') {
      calendarProperty.make();
    } else if (calendarProperty.scheduleMode === 'modify') {
      calendarProperty.modify();
    } else if (calendarProperty.scheduleMode === 'delete') {
      calendarProperty.deleteSelf();
    }
  }))
}