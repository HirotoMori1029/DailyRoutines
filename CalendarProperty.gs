class CalendarProperty {
  constructor(title, time) {
    this.title = title;
    this.time = time;
    this.defColor = CalendarApp.EventColor.GRAY;
    this.doneColor = CalendarApp.EventColor.BLUE;
    this.st = null;
    this.ed = null;
    this.desc = '';
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
      this.event.setTime(this.event.getStartTime(), this.ed);
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
