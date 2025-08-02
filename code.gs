const SPREADSHEET_ID = '1FRgLuqWN5S2N89_cyVgihZ8pnaiexHWehO493ZLjjCI';
const SHEET_NAME = 'Sheet1';
const HEADERS = [
  "ClientID","CompanyName","ContactPerson","Phone","Email",
  "InitialContact","CurrentStage","NextAction","Deadline",
  "PresSent","MeetingDate","ClientNeeds","QuoteAmount",
  "Status","LastFollowUp","NextFollowUp","Comments",
  "Salesperson","QuotationCount","TotalQuoteAmount"
];

function setCORS(output) {
  output.setHeader('Access-Control-Allow-Origin', 'https://hamdi6416.github.io');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  setCORS(output);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    const rows = data.slice(1)
      .filter(r => r.some(cell => cell !== "")) // skip empty rows
      .map(row => Object.fromEntries(header.map((h, i) => [h, row[i]])));
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: true, clients: rows }));
  } catch (err) {
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: false, message: err.message }));
  }
  return output;
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  setCORS(output);
  try {
    const clients = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    // Clear data but keep header
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }

    // Prepare data in order of HEADERS
    const rows = clients.map(client => HEADERS.map(h => client[h] || ''));
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    }
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: true, message: 'Data synced successfully.' }));
  } catch (err) {
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: false, message: err.message }));
  }
  return output;
}

function doOptions(e) {
  const output = ContentService.createTextOutput();
  setCORS(output);
  return output;
}