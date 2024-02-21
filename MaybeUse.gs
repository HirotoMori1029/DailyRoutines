function sendRemainMessage(scheduleData) {
  const lastMsg = makeMsgFromScheduleData(scheduleData);
  if (ask('send message below? ' + lastMsg)) {
    sendLineMessage(lastMsg);
  }
}
