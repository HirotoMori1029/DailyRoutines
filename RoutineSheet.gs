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

  setValueToRoutineList(key, routineName, value) {
    const keyIndex = this.headers.indexOf(key) + 1;
    const routineNames = this.rValues.map(routine => routine[this.headers.indexOf('name')]);
    const routineIndex = routineNames.indexOf(routineName) + 1;
    const editRange = this.sheets.routineList.getRange(routineIndex, keyIndex);
    editRange.setValue(value);
  }
}
