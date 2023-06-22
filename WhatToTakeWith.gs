
const CHECK_BAG_STR = 'check(bag)';
const SB = 'SaunaBag';
const RS = 'RuckSack';

//リュックサックシートのリセットボタンが押されたとき
function onRsEndBtnClicked() {
  const sbSheet = ss.getSheetByName(SB);
  const aSheet = SpreadsheetApp.getActive();
  const rbgo = new RoutineSheet(RBGO);
  resetRsSheetCell();
  if (sbSheet.getRange(1, 1).getValue()) {   //saunaBagを使用するなら
    SpreadsheetApp.setActiveSheet(aSheet.getSheetByName(SB));
  } else {
    rbgo.check(CHECK_BAG_STR);
  }
}

//サウナバッグシートのリセットボタンが押されたとき
function onSbEndBtnClicked() {
  const sbSheet = ss.getSheetByName(SB);
  const aSheet = SpreadsheetApp.getActive();
  const rbgo = new RoutineSheet(RBGO);
  //セルを終了状態にする処理
  sbSheet.getRange(1, 1).uncheck();
  sbSheet.getRange(1, 1, 1, 2).setBackground('gray');
  rbgo.check(CHECK_BAG_STR);
  SpreadsheetApp.setActiveSheet(aSheet.getSheetByName(RS));
}

function onRsOptimizeBtnClicked() {
  writeWhatToTakeWith(todayCondition);
}

function resetRsSheetCell() {
  const rsSheet = ss.getSheetByName(RS);
  //rsSheetセルの初期化処理
  rsSheet.getRange(2, 1, rsSheet.getLastRow() - 1, 2).clearContent().removeCheckboxes();
  rsSheet.getRange(1, 1).uncheck();
  rsSheet.getRange(1, 1, 1, 2).setBackground('gray');
}
