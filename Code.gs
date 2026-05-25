// 📊 포트폴리오 자동 생성 및 최신 동기화 스크립트 (완성본)

const MERITZ_DATA = [
  ["메리츠증권","나비타스 세미컨덕터","NVTS",     "USD",677, 20.3280, '=IFERROR(GOOGLEFINANCE("NVTS"),29.25)'],
  ["메리츠증권","GE베르노바",         "GEV",      "USD",16,  813.8956,'=IFERROR(GOOGLEFINANCE("GEV"),1038.74)'],
  ["메리츠증권","알파벳 A",           "GOOGL",    "USD",41,  239.1231,'=IFERROR(GOOGLEFINANCE("GOOGL"),382.97)'],
  ["메리츠증권","iSh 0-3M T-Bond",   "SGOV",     "USD",143, 100.5327,'=IFERROR(GOOGLEFINANCE("SGOV"),100.63)'],
  ["메리츠증권","팔란티어 테크",      "PLTR",     "USD",43,  116.9074,'=IFERROR(GOOGLEFINANCE("PLTR"),136.88)'],
  ["메리츠증권","네비우스 그룹",      "NBIS",     "USD",21,  205.5523,'=IFERROR(GOOGLEFINANCE("NBIS"),214.77)'],
  ["메리츠증권","버티브 홀딩스",      "VRT",      "USD",8,   295.10,  '=IFERROR(GOOGLEFINANCE("VRT"),327.46)'],
  ["메리츠증권","버크셔 해서웨이 B",  "BRK-B",    "USD",4,   472.9925,'=IFERROR(GOOGLEFINANCE("BRK-B"),486.38)'],
  ["메리츠증권","Direxion GOOGL 2X", "GGLL",     "USD",10,  117.17,  '=IFERROR(GOOGLEFINANCE("GGLL"),134.22)'],
  ["메리츠증권","TEMA Space Innov.", "NASA",     "USD",32,  36.39,   '=IFERROR(GOOGLEFINANCE("NASA"),38.76)'],
  ["메리츠증권","Direxion Gold 2X",  "NUGT",     "USD",2,   174.94,  '=IFERROR(GOOGLEFINANCE("NUGT"),155.00)'],
  ["메리츠증권","아이온큐",           "IONQ",     "USD",1,   48.94,   '=IFERROR(GOOGLEFINANCE("IONQ"),63.64)'],
  ["메리츠증권","IREN",              "IREN",     "USD",1,   56.68,   '=IFERROR(GOOGLEFINANCE("IREN"),56.83)'],
  ["메리츠증권","일라이 릴리",        "LLY",      "USD",2,   1065.00, '=IFERROR(GOOGLEFINANCE("LLY"),1065.00)'],
  ["메리츠증권","💵 현금 (USD)",      "",         "USD",1,   2557,    2557]
];

const ISA_DATA = [
  ["ISA","KoAct 팔란티어밸류체인액티브",     "0093D0","KRW",720, 14198, '=IFERROR(GOOGLEFINANCE("KRX:0093D0"),19590)'],
  ["ISA","TIMEFOLIO 미국나스닥100액티브",    "426030","KRW",345, 42639, '=IFERROR(GOOGLEFINANCE("KRX:426030"),55300)'],
  ["ISA","KODEX 미국서학개미",               "473460","KRW",189, 21478, '=IFERROR(GOOGLEFINANCE("KRX:473460"),27595)'],
  ["ISA","KODEX 미국배당커버드콜액티브",      "441640","KRW",490, 11997, '=IFERROR(GOOGLEFINANCE("KRX:441640"),13425)'],
  ["ISA","TIGER 미국초단기국채",             "0046A0","KRW",761, 9963,  '=IFERROR(GOOGLEFINANCE("KRX:0046A0"),10510)'],
  ["ISA","TIGER 글로벌비만치료제TOP2Plus",   "476690","KRW",235, 10250, '=IFERROR(GOOGLEFINANCE("KRX:476690"),10830)'],
  ["ISA","KODEX 미국AI전력핵심인프라",        "487230","KRW",307, 26408, '=IFERROR(GOOGLEFINANCE("KRX:487230"),26535)'],
  ["ISA","한화",                             "000880","KRW",1,   132000,'=IFERROR(GOOGLEFINANCE("KRX:000880"),140500)'],
  ["ISA","💵 현금 (KRW)",                    "",      "KRW",1,   223229,223229]
];

const MERITZ_SUM_ROW = 1 + MERITZ_DATA.length * 2 + 1;
const ISA_SUM_ROW    = 1 + ISA_DATA.length    * 2 + 1;

// ─────────────────────────────────────────────
// 합계 공식 재설정 (행 삭제/삽입 후 범위 깨짐 방지)
// ─────────────────────────────────────────────
function fixSumFormula(sheet) {
  if (!sheet) return;
  const rows = sheet.getLastRow();
  if (rows < 2) return;
  const colA = sheet.getRange(1, 1, rows, 1).getValues();
  let sumRow = -1;
  for (let i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
  }
  if (sumRow > 2) {
    const last = sumRow - 1;
    sheet.getRange(sumRow, 4).setFormula(
      `=SUMPRODUCT((MOD(ROW(D2:D${last}),2)=0)*D2:D${last})`
    );
    sheet.getRange(sumRow, 5).setFormula(
      `=SUMPRODUCT((MOD(ROW(E2:E${last}),2)=0)*E2:E${last})`
    );
  }
}

function createPortfolioSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tempName = "TEMP_RESET_" + Date.now();
  const tempSheet = ss.insertSheet(tempName);

  // _appdata 백업
  let appdataValue = null, appdataB = null;
  const adSheetOld = ss.getSheetByName('_appdata');
  if (adSheetOld) {
    appdataValue = adSheetOld.getRange('A1').getValue();
    appdataB     = adSheetOld.getRange('B1').getValue();
  }

  ss.getSheets().forEach(s => {
    if (s.getName() !== tempName) ss.deleteSheet(s);
  });

  const sumSheet    = ss.insertSheet('종합');
  const meritzSheet = ss.insertSheet('메리츠증권');
  const isaSheet    = ss.insertSheet('ISA');
  const adSheet     = ss.insertSheet('_appdata');
  try { adSheet.hideSheet(); } catch(e) {}

  ss.deleteSheet(tempSheet);

  // _appdata 복원
  if (appdataValue) {
    adSheet.getRange('A1').setValue(appdataValue);
    adSheet.getRange('B1').setValue(appdataB || new Date().toISOString());
  }

  createSummarySheet(sumSheet);
  createDetailSheet(meritzSheet, MERITZ_DATA, 'USD', MERITZ_SUM_ROW);
  createDetailSheet(isaSheet,    ISA_DATA,    'KRW', ISA_SUM_ROW);
  SpreadsheetApp.getUi().alert('✅ 최신 데이터로 초기화 완료!');
}

function createSummarySheet(sheet) {
  sheet.clearContents();
  const title = sheet.getRange('A1:D1');
  title.merge();
  title.setValue('📊 포트폴리오 종합 대시보드');
  title.setBackground('#1E40AF').setFontColor('white').setFontSize(15).setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange('A3').setValue('환율 (USD/KRW)').setFontWeight('bold');
  sheet.getRange('B3').setValue(1515).setBackground('#FEF3C7').setNumberFormat('#,##0');

  const hdr = sheet.getRange('A5:D5');
  hdr.setValues([['계좌','평가금액(KRW)','손익(KRW)','수익률(%)']]);
  hdr.setBackground('#1E40AF').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange('A6').setValue('메리츠증권 (USD)');
  sheet.getRange('B6').setFormula(`=메리츠증권!D${MERITZ_SUM_ROW}*B3`);
  sheet.getRange('C6').setFormula(`=메리츠증권!E${MERITZ_SUM_ROW}*B3`);
  sheet.getRange('D6').setFormula('=IFERROR(C6/B6*100,0)');

  sheet.getRange('A7').setValue('ISA (KRW)');
  sheet.getRange('B7').setFormula(`=ISA!D${ISA_SUM_ROW}`);
  sheet.getRange('C7').setFormula(`=ISA!E${ISA_SUM_ROW}`);
  sheet.getRange('D7').setFormula('=IFERROR(C7/B7*100,0)');

  sheet.getRange('A8').setValue('【 총합 】').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=B6+B7');
  sheet.getRange('C8').setFormula('=C6+C7');
  sheet.getRange('D8').setFormula('=IFERROR(C8/B8*100,0)');

  sheet.getRange('A8:D8').setBackground('#FEF3C7').setFontWeight('bold');
  sheet.getRange('B6:B8').setNumberFormat('₩#,##0');
  sheet.getRange('C6:C8').setNumberFormat('₩#,##0');
  sheet.getRange('D6:D8').setNumberFormat('0.00');
  sheet.setColumnWidth(1,150); sheet.setColumnWidth(2,150);
  sheet.setColumnWidth(3,150); sheet.setColumnWidth(4,120);
}

function createDetailSheet(sheet, data, currency, sumRow) {
  sheet.clearContents();
  const hdr = sheet.getRange(1, 1, 1, 5);
  hdr.setValues([['종목명 / 태그','수량 / 평단가','현재가 / 수익률%','평가금액 / 비중%','손익']]);
  hdr.setBackground('#1E40AF').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(1, 28);

  for (let i = 0; i < data.length; i++) {
    const name = data[i][1], qty = data[i][4], avg = data[i][5], curF = data[i][6];
    const r1 = 2 + i * 2, r2 = 3 + i * 2;

    sheet.getRange(r1, 1).setValue(name).setFontWeight('bold');
    sheet.getRange(r1, 2).setValue(qty);
    if (typeof curF === 'string' && curF.startsWith('=')) sheet.getRange(r1, 3).setFormula(curF);
    else sheet.getRange(r1, 3).setValue(curF);
    sheet.getRange(r1, 4).setFormula(`=B${r1}*C${r1}`);
    sheet.getRange(r1, 5).setFormula(`=D${r1}-B${r1}*B${r2}`);

    sheet.getRange(r2, 1).setValue('').setFontColor('#6B7280').setFontStyle('italic');
    sheet.getRange(r2, 2).setValue(avg);
    sheet.getRange(r2, 3).setFormula(`=IF(B${r2}=0,0,(C${r1}/B${r2}-1))`);
    sheet.getRange(r2, 4).setFormula(`=IF(D${sumRow}=0,0,D${r1}/D${sumRow})`);
    sheet.getRange(r2, 5).setValue('');

    sheet.getRange(r1, 1, 1, 5).setBackground('#FFFFFF');
    sheet.getRange(r2, 1, 1, 5).setBackground('#F1F5F9');

    const isWon = (currency === 'KRW');
    sheet.getRange(r1, 3).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r1, 4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r1, 5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r2, 2).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r2, 3).setNumberFormat('0.00%');
    sheet.getRange(r2, 4).setNumberFormat('0.00%');
    sheet.setRowHeight(r1, 22); sheet.setRowHeight(r2, 19);
  }

  const last = sumRow - 1;
  sheet.getRange(sumRow, 1).setValue('【 집계 】').setFontWeight('bold');
  sheet.getRange(sumRow, 4).setFormula(`=SUMPRODUCT((MOD(ROW(D2:D${last}),2)=0)*D2:D${last})`);
  sheet.getRange(sumRow, 5).setFormula(`=SUMPRODUCT((MOD(ROW(E2:E${last}),2)=0)*E2:E${last})`);

  const isWon = (currency === 'KRW');
  sheet.getRange(sumRow, 4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
  sheet.getRange(sumRow, 5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
  sheet.getRange(sumRow, 1, 1, 5).setBackground('#FEF3C7').setFontWeight('bold');
  sheet.setColumnWidth(1,130); sheet.setColumnWidth(2,80);
  sheet.setColumnWidth(3,80);  sheet.setColumnWidth(4,85); sheet.setColumnWidth(5,80);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 포트폴리오')
    .addItem('자동 설정하기 (초기화)', 'createPortfolioSheet')
    .addToUi();
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let rate = 1510;
  const sumSheet = ss.getSheetByName('종합');
  if (sumSheet) rate = Number(sumSheet.getRange('B3').getValue()) || 1510;

  function getPricesFromSheet(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const data     = sheet.getRange(1, 1, lastRow, 5).getValues();
    const formulas = sheet.getRange(1, 1, lastRow, 5).getFormulas();
    const result   = [];

    for (let i = 1; i < data.length; i += 2) {
      const name = String(data[i][0]).replace(/\s+/g, ' ').trim();
      if (!name || name.includes('【 집계 】') || name.includes('종목명')) continue;

      const curPrice = parseFloat(data[i][2]);
      const formula  = formulas[i][2];
      let extractedTicker = '';
      if (formula && formula.toUpperCase().includes('GOOGLEFINANCE')) {
        const match = formula.match(/GOOGLEFINANCE\(\s*"([^"]+)"/i);
        if (match && match[1]) extractedTicker = match[1].replace('KRX:', '');
      }

      if (name && !isNaN(curPrice)) {
        const qty = parseFloat(data[i][1]) || 0;
        const avg = (i + 1 < data.length) ? (parseFloat(data[i + 1][1]) || 0) : 0;
        result.push({ name, cur: curPrice, ticker: extractedTicker, qty, avg });
      }
    }
    return result;
  }

  const meritz = getPricesFromSheet('메리츠증권');
  const isa    = getPricesFromSheet('ISA');

  let appData = null, savedAt = null;
  try {
    const adSheet = ss.getSheetByName('_appdata');
    if (adSheet) {
      const v = adSheet.getRange('A1').getValue();
      if (v) appData = JSON.parse(v);
      savedAt = adSheet.getRange('B1').getValue();
    }
  } catch(err) {}

  return ContentService
    .createTextOutput(JSON.stringify({ rate, meritz, isa, appData, savedAt }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'no data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    let sheet = ss.getSheetByName('_appdata');
    if (!sheet) {
      sheet = ss.insertSheet('_appdata');
      try { sheet.hideSheet(); } catch(e) {}
    }
    sheet.getRange('A1').setValue(JSON.stringify(data));
    sheet.getRange('B1').setValue(new Date().toISOString());

    if (data._action === 'export') updateVisibleSheets(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, savedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateVisibleSheets(ss, data) {
  if (!data || !data.stocks) return;

  function syncToSheet(sheetName, accountName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const stocks = data.stocks.filter(s => s.acct === accountName);
    let lastRow  = sheet.getLastRow();
    if (lastRow < 2) return;

    const appStockNames = stocks.map(s => s.name.replace(/\s+/g, ' ').trim());

    // 1. 삭제 로직
    let sumRow = -1;
    const totalRows = sheet.getLastRow();
    const allA      = sheet.getRange(1, 1, totalRows, 1).getValues();
    for (let i = 0; i < allA.length; i++) {
      if (String(allA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
    }

    if (sumRow > 2) {
      const fontWeights = sheet.getRange(1, 1, totalRows, 1).getFontWeights();
      const nameRows = [];
      for (let r = 1; r < sumRow - 1; r++) {
        if (fontWeights[r][0] === 'bold') {
          const val = String(allA[r][0]).trim();
          if (val && !val.includes('💵 현금')) nameRows.push(r + 1);
        }
      }
      for (let ni = nameRows.length - 1; ni >= 0; ni--) {
        const row       = nameRows[ni];
        const cellValue = String(sheet.getRange(row, 1).getValue()).replace(/\s+/g, ' ').trim();
        if (!appStockNames.includes(cellValue)) sheet.deleteRows(row, 2);
      }
    }

    // 2. 기존 종목 업데이트
    lastRow = sheet.getLastRow();
    const values        = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const existingNames = [];

    for (let i = 0; i < values.length; i += 2) {
      const rowName = String(values[i][0]).trim();
      if (rowName && !rowName.includes('💵 현금'))
        existingNames.push(rowName.replace(/\s+/g, ' ').trim());

      if (rowName.includes('💵 현금')) {
        let cashAmt = 0;
        if (accountName === '메리츠증권' && data.cash && data.cash['메리츠증권'])
          cashAmt = data.cash['메리츠증권']['USD'];
        else if (accountName === 'ISA' && data.cash && data.cash['ISA'])
          cashAmt = data.cash['ISA']['KRW'];
        sheet.getRange(i + 2, 3).setValue(cashAmt);
        sheet.getRange(i + 3, 2).setValue(cashAmt);
        continue;
      }

      const stock = stocks.find(s =>
        s.name.replace(/\s+/g, ' ').trim() === rowName.replace(/\s+/g, ' ').trim()
      );
      if (stock) {
        if (values[i][1] !== stock.qty) sheet.getRange(i + 2, 2).setValue(stock.qty);
        if (values[i + 1] && values[i + 1][0] !== (stock.tag || ''))
          sheet.getRange(i + 3, 1).setValue(stock.tag || '');
        if (values[i + 1] && values[i + 1][1] !== stock.avg)
          sheet.getRange(i + 3, 2).setValue(stock.avg);
        if (stock.ticker) {
          const prefix = (accountName === 'ISA') ? 'KRX:' : '';
          sheet.getRange(i + 2, 3).setFormula(
            `=IFERROR(GOOGLEFINANCE("${prefix}${stock.ticker}"),${stock.cur || 0})`
          );
        }
      }
    }

    // 3. 신규 종목 추가
    const newStocks = stocks.filter(s =>
      !existingNames.includes(s.name.replace(/\s+/g, ' ').trim())
    );
    if (newStocks.length > 0) {
      sumRow = -1;
      const currentA = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
      for (let i = 0; i < currentA.length; i++) {
        if (String(currentA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
      }

      if (sumRow > 2) {
        newStocks.forEach(stock => {
          sheet.insertRowsBefore(sumRow, 2);
          sheet.getRange(sumRow, 1, 2, 5).clearContent().clearFormat();

          sheet.getRange(sumRow,     1, 1, 5).setBackground('#FFFFFF');
          sheet.getRange(sumRow + 1, 1, 1, 5).setBackground('#F1F5F9');

          sheet.getRange(sumRow, 1).setValue(stock.name).setFontWeight('bold');
          sheet.getRange(sumRow, 2).setValue(stock.qty);

          if (stock.ticker) {
            const prefix = (accountName === 'ISA') ? 'KRX:' : '';
            sheet.getRange(sumRow, 3).setFormula(
              `=IFERROR(GOOGLEFINANCE("${prefix}${stock.ticker}"),${stock.cur || 0})`
            );
          } else {
            sheet.getRange(sumRow, 3).setValue(stock.cur || 0);
          }

          sheet.getRange(sumRow, 4).setFormula(`=B${sumRow}*C${sumRow}`);
          sheet.getRange(sumRow, 5).setFormula(`=D${sumRow}-(B${sumRow}*B${sumRow + 1})`);

          sheet.getRange(sumRow + 1, 1).setValue(stock.tag || '').setFontColor('#6B7280').setFontStyle('italic');
          sheet.getRange(sumRow + 1, 2).setValue(stock.avg);
          sheet.getRange(sumRow + 1, 3).setFormula(
            `=IF(B${sumRow + 1}=0,0,(C${sumRow}/B${sumRow + 1}-1))`
          );
          sheet.getRange(sumRow + 1, 4).setValue('');
          sheet.getRange(sumRow + 1, 5).setValue('');

          const isWon = (accountName === 'ISA');
          sheet.getRange(sumRow,     3).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow,     4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow,     5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow + 1, 2).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow + 1, 3).setNumberFormat('0.00%');
          sheet.getRange(sumRow + 1, 4).setNumberFormat('0.00%');
          sheet.setRowHeight(sumRow,     22);
          sheet.setRowHeight(sumRow + 1, 19);

          sumRow += 2;
        });
      }
    }
  }

  syncToSheet('메리츠증권', '메리츠증권');
  syncToSheet('ISA', 'ISA');

  // ✅ 행 삽입/삭제로 깨진 합계 공식 재설정
  fixSumFormula(ss.getSheetByName('메리츠증권'));
  fixSumFormula(ss.getSheetByName('ISA'));
}
