const clearData = () => {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName("Start");
  const values = sheet.getDataRange().getValues();
  let clearCell = [
    "B1",
    "B2",
    "B3",
    "B4",
    "B7",
    "B9",
    "B12",
    "B13",
    "B14",
    "B15",
    "B16",
    "B17",
    "B18",
    "B19",
    "B20",
    "D41",
    "B46",
    "B77",
    "B78",
    "B79",
    "B80"
  ];

  values.forEach((rowValue, row) => {
    rowValue.forEach((cell, column) => {
      stars = cell.toString().includes("*");
      check = cell.toString().includes(true);
      if (check) {
        sheet.getRange(row + 1, column + 1).setValue(false);
      }
    });
  });
  clearCell.forEach(r => {
    Logger.log(r);

    sheet.getRange(r).clearContent();
  });
};
