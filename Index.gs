//文字列の定義
const MORNING_HOUR = 5; // 5o'clock
const GO_OUT_TIME = 5 * 60; // 5hours
const NIGHT_HOUR = 22; // 22o'clock
const RBGO = 'RoutineBeforeGoingOut';
const RAD = 'RoutineAtDestination';
const RARH = 'RoutineAfterReturningHome';
const GO = 'goOut';
const SAUNA = 'Sauna';
const LD = 'LastDones';
const SI = 'ScheduleInfo';
const MS = 'MakeSchedule';
const LTTW = 'ListToTakeWith';
const IS_STUDY = 'isStudy';
const cDate = new Date();
const INTERVAL_LIMIT_1 = 0.3;
const INTERVAL_LIMIT_2 = -0.2;
const DEFAULT_TARGET_VALUE = 7;
const timeToDay = 1 / (1000 * 60 * 60 * 24)
const timeRange = getTimeRange(cDate);

//スクリプトプロパティを取得
const sp = PropertiesService.getScriptProperties();
const myName = sp.getProperty('MY_NAME');
const FAM_EVENT_TITLE = `${myName}外出`;
const ss = SpreadsheetApp.openById(sp.getProperty('MY_ROUTINES_SHEET_ID'));
//自分のカレンダー
const myCalendar = CalendarApp.getCalendarById(sp.getProperty('MY_GMAIL_ADDRESS'));
const familyCalendar = CalendarApp.getCalendarById(sp.getProperty('MORI_FAMILY_CALENDAR_ID'));
const familyCalendarColor = CalendarApp.EventColor.YELLOW;

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

  function getRangeByValueName(sheetName, valueName) {
    const sheet = ss.getSheetByName(sheetName);
    return sheet.createTextFinder(valueName).findNext();
  }

  function saveValueToScheudleInfo(valueName, value, date = new Date()) {
    const range = getRangeByValueName(SI, valueName);
    if (range) {
      let dayOfWeek = date.getDay();
      dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      range.offset(dayOfWeek, 0).setValue(value);
    } else {
      Browser.msgBox("couldn't save because of invalid value name");
    }
  }


  function saveValueToLastDones(valueName, value = cDate) {
    const range = getRangeByValueName(LD, valueName);
    const ldSheet = ss.getSheetByName(LD);
    const allvalues = ldSheet.getDataRange().getValues();
    const headers = allvalues.shift();

    if (range) {

      const pLastTime = range.offset(0, headers.indexOf('lastTime')).getValue();
      const pIntervalAve = range.offset(0, headers.indexOf('intervalAve')).getValue();
      const pIntegral = range.offset(0, headers.indexOf('integral')).getValue();
      const pLastInterval = range.offset(0, headers.indexOf('lastInterval')).getValue();
      range.offset(0, headers.indexOf('lastTime')).setValue(value);
      range.offset(0, headers.indexOf('integral')).setValue(pIntegral + 1);
      const lastInterval = value.getTime() - pLastTime.getTime();
      const intervalAve = pLastInterval === 0 ? lastInterval : (lastInterval + pIntervalAve) / 2;
      range.offset(0, headers.indexOf('lastInterval')).setValue(lastInterval);
      range.offset(0, headers.indexOf('intervalAve')).setValue(intervalAve);
      range.offset(0, headers.indexOf('intervalDayAve')).setValue(intervalAve / (1000 * 60 * 60 * 24));

    } else {  //valueNameが存在しない場合、新しくレンジを生成する

      const formatCopySourceRange = ldSheet.getRange(ldSheet.getLastRow(), 1, 1, headers.length);
      const sourceNumberFormats = formatCopySourceRange.getNumberFormats();
      const sourceFontWeights = formatCopySourceRange.getFontWeights(); //太字などのフォーマットウェイトを取得
      const sourceHorizontalAlignments = formatCopySourceRange.getHorizontalAlignments(); // 水平方向の配置を取得
      const targetRange = formatCopySourceRange.offset(1, 0);
      targetRange
        .setNumberFormats(sourceNumberFormats)
        .setFontWeights(sourceFontWeights)
        .setHorizontalAlignments(sourceHorizontalAlignments)

      const nameRng = targetRange.getCell(1, headers.indexOf('name') + 1);
      nameRng.setValue(valueName);
      nameRng.offset(0, headers.indexOf('lastTime')).setValue(value);
      nameRng.offset(0, headers.indexOf('targetValue')).setValue(DEFAULT_TARGET_VALUE);
      nameRng.offset(0, headers.indexOf('intervalDayAve')).setValue(0);
      nameRng.offset(0, headers.indexOf('integral')).setValue(0);
      nameRng.offset(0, headers.indexOf('intervalAve')).setValue(0);
      nameRng.offset(0, headers.indexOf('lastInterval')).setValue(0);
    }
  }

  function getValueFromScheduleInfo(valueName, date = new Date()) {
    const range = getRangeByValueName(SI, valueName);
    if (range) {
      const dayOfWeek = date.getDay();
      const rowNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
      return range.offset(rowNumber, 0).getValue();
    }
    return;
  }

  function getValueFromLastDones(valueName, propertyName) {
    const range = getRangeByValueName(LD, valueName);
    if (range) {
      const headers = ss.getSheetByName(LD).getDataRange().getValues().shift();
      if (headers.includes(propertyName)) {
        return range.offset(0, headers.indexOf(propertyName)).getValue();
      }
    }
    return;
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

  function getScheduleData(date = new Date()) {
    const scheduleDataJson = getValueFromScheduleInfo('scheduleData', date);
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
    saveValueToLastDones,
    saveValueToScheudleInfo,
    getValueFromLastDones,
    getValueFromScheduleInfo,
    isScheduled,
    getScheduleData
  };

  return myRecord
}

// valueNameを渡すと現在時刻で換算してtargetValueを超えているか返す関数
function isTimeOver(valueName, limit) {
  const lastDone = myRecord.getValueFromLastDones(valueName, 'lastTime');
  const targetValue = myRecord.getValueFromLastDones(valueName, 'targetValue');
  if (lastDone) {
    const cInterval = (cDate.getTime() - lastDone.getTime()) * timeToDay;
    const diff = (cInterval - targetValue) / targetValue;
    return diff >= limit;
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
  const dayStr = getDateStrFromDayDiff(getDayDiffFromCurrentDate(eventday));
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
function getDayDiffFromCurrentDate(date) {
  const copyDate = new Date(date);
  copyDate.setHours(0, 0, 0, 0);
  const copyCDate = new Date(cDate);
  copyCDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((copyDate.getTime() - copyCDate.getTime()) / (1000 * 60 * 60 * 24));
  return dayDiff;
}

function getDateStrFromDayDiff(dayDiff) {
  switch (dayDiff) {
    case 0:
      return '今日';
    case 1:
      return '明日';
    default:
      return `${dayDiff}日後`;
  }
}

function activateSheet(sheetName) {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const to = active.getSheetByName(sheetName);
  active.setActiveSheet(to);
}

function getLDSaveNameByName(name = 'nameless!!') {
  return `last${name[0].toUpperCase() + name.slice(1)}`;
}


function grobalTest() {
  const tr = new RoutineSheet('TestRoutine');
  tr.setValueToRoutineList('always', 'aaa', 'changed here');
  Logger.log('成功');
}
