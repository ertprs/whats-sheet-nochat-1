function onOpen() {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Install", "start")
    .addItem("Whats Sheets", "showSidebar")
    .addItem("Bulk Send", "BlastAll")
    .addToUi();
}

const start = () => {
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  //    .timeBased().everyMinutes(10).create()
  ScriptApp.newTrigger("Wa")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  ScriptApp.newTrigger("onOpen")
    .forSpreadsheet(ss)
    .onOpen()
    .create();
};
