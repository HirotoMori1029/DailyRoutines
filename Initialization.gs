//文字列の定義
const MORNING_HOUR = 5; // 5o'clock
const GO_OUT_TIME = 5 * 60; // 5hours
const NIGHT_HOUR = 22; // 22o'clock
const MR = 'MorningRoutine';
const RBGO = 'RoutineBeforeGoingOut';
const RAD = 'RoutineAtDestination';
const RARH = 'RoutineAfterReturningHome';
const NR = 'NightRoutine';
const GO = 'goOut';
const SAUNA = 'Sauna';
const LD = 'LastDones';
const SI = 'ScheduleInfo';
const MS = 'MakeSchedule';
const LTTW = 'ListToTakeWith';
const IS_STUDY = 'isStudy';
const cDate = new Date();
const timeRange = getTimeRange(cDate);

//スクリプトプロパティを取得
const sp = PropertiesService.getScriptProperties();
const myName = sp.getProperty('MY_NAME');
const ss = SpreadsheetApp.openById(sp.getProperty('MY_ROUTINES_SHEET_ID'));
//自分のカレンダー
const myCalendar = CalendarApp.getCalendarById(sp.getProperty('MY_GMAIL_ADDRESS'));
const familyCalendar = CalendarApp.getCalendarById(sp.getProperty('MORI_FAMILY_CALENDAR_ID'));

//今日のイベント配列を取得
const todayEvents = myCalendar.getEvents(...timeRange);
const todayEventTitles = todayEvents.map(event => event.getTitle());

//家族カレンダーのイベント配列を取得
const familiyEvents = familyCalendar.getEvents(...timeRange);
const familiyEventTitles = familiyEvents.map(event => event.getTitle());

//レコードシートのデータを取得
const myRecord = getMyRecord();
//今日の予定要素を配列で定義
const todayCondition = makeCondition(cDate);

//Routineにデフォルト値、関数をもたせるためのクラス
class RoutineSheet {
  constructor(name) {
    this.name = name;
    this.sheets = {
      main: ss.getSheetByName(this.name),
      //todo RoutineListの命名規則を得る関数を作成し、それを実行してシートを定義する
      routineList: ss.getSheetByName(getRoutineListSheetNameByRoutineName(this.name))
    };
    this.startRow = 2;
    //RoutineListからデータを取得して格納する
    this.rValues = this.sheets.routineList.getDataRange().getValues();
    this.headers = this.rValues[0];
    this.rListData = this.rValues.slice(1).map(row => {
      return this.headers.reduce((obj, header, index) => {
        obj[header] = row[index];
        return obj;
      }, {})
    })
    this.url = `${ss.getUrl()}#gid=${this.sheets.main.getSheetId()}`;
  }

  //リストを受け取ってそれを反映させる
  reflectList(routineList) {
    const lastRow = this.sheets.main.getDataRange().getLastRow();
    const lastCol = this.sheets.main.getDataRange().getLastColumn();
    const deleteRng = this.sheets.main.getRange(this.startRow, 1, lastRow, lastCol);
    deleteRng.removeCheckboxes().clear();
    //見逃し合計回数
    const missedSum = routineList.reduce((acc, routine) => acc += routine.missed, 0);

    routineList.forEach((routine, index) => {
      //チェックボックスを入れる
      this.sheets.main.getRange(index + this.startRow, 1).insertCheckboxes();
      //ルーティン名を入れる
      const nameRange = this.sheets.main.getRange(index + this.startRow, 2).setValue(routine.name);
      //見逃し回数に対応した色を設定
      if (missedSum) {
        const missedRatio = routine.missed / missedSum;
        if (missedRatio >= 0.2) { //0.2以上なら
          nameRange.setFontColor('red');
        } else if (missedRatio > 0 && missedRatio < 0.2) { //0.2未満なら
          const color = `rgb(${Math.round(missedRatio * 255 * 5)}, 0, 0)`;
          nameRange.setFontColor(color);
        }
      }
      //urlがあれば値を設定
      const urlType = /^(ftp|http|https):\/\/[^ "]+$/;
      if ((typeof routine.url === 'string') && urlType.test(routine.url)) {
        nameRange.setFormula(`=HYPERLINK("${routine.url}", "${routine.name}")`);
      }
    })
    this.sheets.main.autoResizeColumn(2);
  }

  //指定の列をロックする関数
  lockColumn(column) {
    const protection = this.sheets.main.getRange(1, column, this.sheets.main.getLastRow()).protect();
    protection.setWarningOnly(true);
  }

  //シートの保護を解除する関数
  unLockSheetProtection() {
    const protections = this.sheets.main.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (let protection of protections) {
      if (protection.canEdit()) {
        protection.remove();
      }
    }
  }

  //一致する値があればその左をcheckする関数
  check(routineName) {
    const lastRow = this.sheets.main.getDataRange().getLastRow();
    for (let i = 1; i <= lastRow; i++) {
      const name = this.sheets.main.getRange(i, 2).getValue();
      if (name === routineName) this.sheets.main.getRange(i, 1).check();
    }
  }

  setColorToFirstRoutine() {
    const sheet = this.sheets.main;
    sheet.getRange(1, 1).check();
    sheet.getRange(1, 1, 1, 2).setBackground('aqua');
  }

  clearCheckAndColor() {
    const sheet = this.sheets.main;
    sheet.getRange(1, 1, sheet.getLastRow()).uncheck();
    sheet.getRange(1, 1, 1, 2).setBackground('silver');
  }

  optimizeList(conditions) {
    const currentMonth = new Date().getMonth() + 1;
    return this.rListData.filter(routine => {
      let condition =
        routine.always ||
        (routine.goSauna && conditions.goSauna) ||
        (routine.whenBicycle && conditions.transportation.includes('bicycle'));

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

  //メインシートのルーティンと最適化されたルーティンを比較してBooleanで返す
  getIsRoutineSame() {
    const mainValues = this.sheets.main.getDataRange().getValues();
    //header部分を削除
    mainValues.shift();
    //それぞれ名前の配列を取得
    const mainRtnNames = mainValues.map(row => row[1]).flat();
    const optedRtnNames = this.optimizeList(todayCondition).map(routine => routine.name);
    //カンマ区切りの文字列に変換して比較
    return mainRtnNames.join() === optedRtnNames.join();
  }

  optimize(condition) {
    this.reflectList(this.optimizeList(condition));
  }

  //ルーティンを行ったか判定する関数
  hasBeenDone(routineName) {
    let data = this.sheets.main.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === routineName) {
        return data[i][0];
      }
    }
    return false;
  }

  //intervalがあるroutineをlastDonesに記録する
  saveLastDones() {
    const intervalRoutines = this.rListData.filter(routine => routine.interval);
    intervalRoutines.forEach(routine => {
      if (this.hasBeenDone(routine.name)) {
        const valueName = `last${routine.name[0].toUpperCase() + routine.name.slice(1)}`
        myRecord.saveValueTo(LD, valueName, cDate);
      }
    })
  }

  onStart(calendarProperty) {
    if (!this.getIsRoutineSame()) { //ルーティンが最適化したものと違うなら
      this.optimize(todayCondition);
    }
    this.unLockSheetProtection();
    this.lockColumn(2);
    this.setColorToFirstRoutine();
    if (calendarProperty.event) { //すでにイベントが存在するなら
      calendarProperty.setTimeStart();
    } else { //イベントがなければ
      calendarProperty.st = cDate;
      calendarProperty.ed = new Date(cDate.getTime() + 1000 * 60 * calendarProperty.time);
      calendarProperty.make().setColor(calendarProperty.doneColor);
    }
  }
}


//イベントのタイミングを現在時刻と比較する関数
function getTimingOfEvent(event) {
  const isBefore = cDate.getTime() < event.getStartTime().getTime();
  const isOnTime =
    (event.getStartTime().getTime() <= cDate.getTime()) &&
    (cDate.getTime() <= event.getEndTime().getTime());
  //タイミングで場合分け
  if (isBefore) {
    return 'before';
  } else if (isOnTime) {
    return 'onTime'
  } else {
    return 'after';
  }
}

//routineの名前から、routineListが記されたシートの名前を作成する関数
function getRoutineListSheetNameByRoutineName(routineName) {
  return `${routineName.match(/[A-Z]/g).join('')}_RoutineList`;
}

const cals = [];

class CalendarProperty {
  constructor(title, time) {
    this.title = title;
    this.time = time;
    this.defColor = CalendarApp.EventColor.GRAY;
    this.doneColor = CalendarApp.EventColor.BLUE;
    this.st = null;
    this.ed = null;
    this.desc = null;
    this.visibility = CalendarApp.Visibility.PRIVATE;
    this.reminderTime = 0;
    this.calendar = CalendarApp.getDefaultCalendar();
    this.event = null;
    this.scheduleMode = null;
    this.justWhenGoOut = true;
  }

  setEvent(events, titles) {
    this.event = events[titles.indexOf(this.title)];
  }

  setScheduleMode(scheduleData) {
    if (this.justWhenGoOut) {
      if (scheduleData.goOut) {
        this.scheduleMode = this.event ? 'modify' : 'make';
      } else {
        this.scheduleMode = this.event ? 'delete' : null;
      }
    } else {
      this.scheduleMode = this.event ? 'modify' : 'make';
    }

    if(!this.title) {
      this.scheduleMode = null;
    }
  }

  make() {
    const gCal = this.calendar.createEvent(this.title, this.st, this.ed)
      .setColor(this.defColor)
      .setDescription(this.desc)
      .setVisibility(this.visibility)
      .removeAllReminders()
    if (this.reminderTime) {
      gCal.addPopupReminder(this.reminderTime);
    }
    return gCal;
  }

  modify() {
    const timing = getTimingOfEvent(this.event);
    if (timing === 'before') {//イベントがまだなら
      this.event.setTime(this.st, this.ed);
    } else if (timing === 'onTime') { //イベントが進行中なら
      this.event.setTime(thisEvent.getStartTime(), this.ed);
    }
  }

  deleteSelf() {
    this.event.deleteEvent();
  }

  setTimeStart() {
    if (this.event.getEndTime().getTime() < cDate.getTime()) {
      this.event.setTime(cDate, new Date(cDate.getTime() + 1000 * 60 * this.time));
    } else {
      this.event.setTime(cDate, this.event.getEndTime());
    }
    this.event.setColor(this.doneColor);
  }

  setTimeEnd() {
    if (this.event.getStartTime().getTime() > cDate.getTime()) {
      const start = new Date(cDate.getTime() - 1000 * 60 * this.time)
      this.event.setTime(start, cDate);
    } else {
      this.event.setTime(this.event.getStartTime(), cDate);
    }
  }
}

//カレンダーから今日の予定要素配列を取得する
function makeCondition(date) {

  const dayTimeRange = getTimeRange(date)
  const dayEvents = myCalendar.getEvents(...dayTimeRange);
  const dayEventTitles = dayEvents.map(event => event.getTitle());
  const dayEventDescriptions = dayEvents.map(event => event.getDescription());

  //initialization
  const conds = {
    goOut: false,
    goSauna: false,
    transportation: "",
    meetSomeone: false,
    isStudy: false
  };

  //getFromCalendarEvent
  conds.goOut = dayEventTitles.includes(GO);
  conds.goSauna = dayEventTitles.includes(SAUNA);
  const eventGoOut = dayEvents[dayEventTitles.indexOf(GO)];
  if (eventGoOut) {
    conds.transportation = eventGoOut.getDescription();
  }
  conds.isStudy = hasStringElement(dayEventDescriptions, IS_STUDY);
  //scheduleInfoからデータを取得
  if (myRecord.isScheduled(date)) {
    const scheduleInfo = myRecord.getScheduleData(dayTimeRange[0]);
    // 誰かと会う予定があるか
    if (scheduleInfo.meetSomeone) conds.meetSomeone = scheduleInfo.meetSomeone;
  }
  return conds;
}

//myRecordオブジェクトを取得する関数
//オブジェクト自体に頻繁に利用するメソッドを持たせている
function getMyRecord() {

  function saveValueTo(sheetName, valueName, value, date = new Date()) {
    const sheet = ss.getSheetByName(sheetName);
    const range = sheet.createTextFinder(valueName).findNext();
    if (range) {
      range.offset(...getOffset(sheetName, date)).setValue(value);
    } else {
      const nameRng = sheet.getRange(sheet.getLastRow() + 1, 1).setValue(valueName);
      nameRng.offset(0, 1).setValue(value);
    }
  }

  function getValueFrom(sheetName, valueName, date = new Date()) {
    const sheet = ss.getSheetByName(sheetName);
    const range = sheet.createTextFinder(valueName).findNext();
    if (range) {
      return range.offset(...getOffset(sheetName, date)).getValue();
    }
    return null;

  }

  function getOffset(sheetName, date) {
    if (sheetName == SI) {
      const dayOfWeek = date.getDay();
      return [
        dayOfWeek === 0 ? 7 : dayOfWeek,
        0
      ];
    } else {
      return [0, 1];
    }
  }

  //その日がスケジュールされているかを返す関数
  function isScheduled(date) {
    const scheInfoSheet = ss.getSheetByName(SI);
    const searchRange = scheInfoSheet.createTextFinder('eventday').findNext();

    if (!searchRange) {
      return false;
    }

    const startRow = searchRange.getRow() + 1;
    const daysRange = scheInfoSheet.getRange(startRow, searchRange.getColumn(), 7, 1);
    const eventdays = daysRange.getValues().flat();

    return eventdays.some(eDay => date.toDateString() === eDay.toDateString())
  }

  function getScheduleData(date) {
    const scheduleDataJson = getValueFrom(SI, 'scheduleData', date);
    if (scheduleDataJson) {
      return JSON.parse(scheduleDataJson, (key, value) => {
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
          return new Date(value);
        }
        return value;
      });
    } else {
      return null;
    }
  }

  const myRecord = {
    saveValueTo,
    getValueFrom,
    isScheduled,
    getScheduleData
  };

  return myRecord
}

// valueNameとintervalを渡すとintervalを超えているか返す関数
function hasDoneOutOfInterval(valueName, interval) {
  const lastDone = myRecord.getValueFrom(LD, valueName);
  if (lastDone) {
    return (new Date().getTime() - lastDone.getTime()) / 1000 / 60 / 60 > interval;
  }
  return false;
}

//一日単位のスケジュールのレンジを得る関数
function getTimeRange(date) {
  const stDate = new Date(date);
  //MORNING_HOUR以前ならなら一日前の日付にする
  if (cDate.getHours() <= MORNING_HOUR) {
    stDate.setTime(stDate.getTime() - 1000 * 60 * 60 * 24);
  }
  return [new Date(stDate.setHours(MORNING_HOUR, 0, 0, 0)), new Date(stDate.getTime() + 1000 * 60 * 60 * 24)];
}

//Browserでmsgを訪ねて結果を返す
function ask(msg) {
  return Browser.msgBox(msg, Browser.Buttons.YES_NO_CANCEL) === 'yes';
}

//シートWhaToTakeWithのリストを作成し、セルに反映させる関数
function writeWhatToTakeWith(conditions) {
  //各シートを取得
  const lttwSheet = ss.getSheetByName(LTTW);
  const rsSheet = ss.getSheetByName(RS);
  const sbSheet = ss.getSheetByName(SB);

  //RuckSackSheetの値をリセットする
  rsSheet.getRange(2, 1, rsSheet.getLastRow(), 2).clearContent().removeCheckboxes();
  rsSheet.getRange(1, 1).uncheck();
  rsSheet.getRange(1, 1, 1, 2).setBackground("gray");
  sbSheet.getRange(1, 1, sbSheet.getLastRow()).uncheck();
  sbSheet.getRange(1, 1, 1, 2).setBackground("gray");

  //lttwリストからオブジェクトの配列を作成する
  const ruckSackList = getRuckSackList(conditions);

  //外出する場合、RuckSackシートにリストを書き込む
  if (conditions.goOut) {
    rsSheet.getRange(1, 1).check();
    rsSheet.getRange(1, 1, 1, 2).setBackground("aqua");
    writeFromRuckSackList(ruckSackList);
  }

  //goSaunaがtrueなら、SaunaBagシートをactivateする
  if (conditions.goSauna) {
    sbSheet.getRange(1, 1).check();
    sbSheet.getRange(1, 1, 1, 2).setBackground("aqua");
  }

  //生成したリュックサック用のリストから転記する
  function writeFromRuckSackList(list) {
    rsSheet.getRange(1, 1).check();
    rsSheet.getRange(1, 1, 1, 2).setBackground("aqua");
    for (let item = 0; item < list.length; item++) {
      const checkBox = rsSheet.getRange(item + 2, 1).insertCheckboxes();
      if (list[item].alwaysKeep) {
        checkBox.check();
      }
      rsSheet.getRange(item + 2, 2).setValue(list[item].name);
    }
  }

  // リストをオブジェクトの配列に変換する関数
  function getRuckSackList(conditions) {
    const values = lttwSheet.getDataRange().getValues();
    const headers = values[0];
    const { goSauna, transportation, isStudy } = conditions;
    let lttwKeyValues = values.map(row => Object.fromEntries(
      headers.map((header, i) => [header, row[i]])
    ));
    lttwKeyValues = goSauna ?
      lttwKeyValues : lttwKeyValues.filter(item => !item.goSauna);
    lttwKeyValues = transportation.includes('bicycle') ?
      lttwKeyValues : lttwKeyValues.filter(item => !item.whenBicycle);
    lttwKeyValues = isStudy ?
      lttwKeyValues : lttwKeyValues.filter(item => !item.isStudy);
    return lttwKeyValues;
  }
}

//Gmailの受信ボックスに未読のメッセージがあるか確認する
function isUnreadGmail() {
  const threads = GmailApp.search('is:unread in:inbox');
  return threads.length > 0;
}

function isNightHour(date = cDate) {
  const hour = date.getHours();
  return hour >= NIGHT_HOUR || hour <= MORNING_HOUR;
}

//LINEにメッセージを送る
function sendLineMessage(msg) {
  //LineNotifyに使う定数
  const LINE_NOTIFY_TOKEN = sp.getProperty('LINE_NOTIFY_TOKEN');
  const LINE_NOTIFY_API = sp.getProperty('LINE_NOTIFY_API');

  const response = UrlFetchApp.fetch(LINE_NOTIFY_API, {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + LINE_NOTIFY_TOKEN
    },
    "payload": {
      "message": msg
    }
  });
}

//scheduleDataからメッセージを作る関数
function makeMsgFromScheduleData(scheduleData) {
  const {
    eventday,
    goOut,
    leaveTime,
    arriveTime,
    transportation,
    takeLunchOut,
    takeDinnerOut,
    goSauna,
    message
  } = scheduleData;

  const eventDate = Utilities.formatDate(eventday, 'JST', 'MM/dd E');
  const dayStr = getDayStrFromDate(eventday);
  const transportationJa = LanguageApp.translate(transportation, 'en', 'ja');

  let madeMsg = `<返信不要>\n${eventDate} ${dayStr}の予定：${myName}\n`;

  if (goOut) {
    const leaveHour = leaveTime.getHours();
    const leaveMinute = leaveTime.getMinutes();
    const arriveHour = arriveTime.getHours();
    const arriveMinute = arriveTime.getMinutes();

    madeMsg += `外出予定: ${leaveHour}時${leaveMinute}分\n`
      + `帰宅予定: ${arriveHour}時${arriveMinute}分\n`
      + `移動手段: ${transportationJa}\n\n`;
  } else {
    madeMsg += "外出予定はありません\n";
  }

  if (takeLunchOut) {
    madeMsg += "お昼ご飯は必要ありません\n";
  }

  if (takeDinnerOut) {
    madeMsg += "晩ご飯は必要ありません\n";
  }

  if (goSauna) {
    madeMsg += "温泉に行きます\n";
  } else {
    madeMsg += "家でお風呂に入ります\n";
  }

  if (message) {
    madeMsg += makeExtraMessage();
  }

  return madeMsg;
}

function makeExtraMessage() {
  const msg = Browser.inputBox('Input the extra message');
  if (msg === 'cancel') {
    return '';
  }
  return msg;
}


function hasStringElement(array, searchString) {
  for (let i = 0; i < array.length; i++) {
    if (array[i].includes(searchString)) {
      return true;
    }
  }
  return false;
}

//特定の日付と現在の日付の差分から、いつにあたるのかを表す文字列を返す関数            
function getDayStrFromDate(date) {
  const copyDate = new Date(date);
  copyDate.setHours(0, 0, 0, 0);
  const copyCDate = new Date(cDate);
  copyCDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((copyDate.getTime() - copyCDate.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) {
    return '今日';
  } else if (dayDiff === 1) {
    return '明日';
  } else if (dayDiff === 2) {
    return '明後日';
  } else {
    return `${dayDiff}日後`;
  }
}


function grobalTest() {
  Logger.log('成功');
}
