import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const mockWindow={};
new Function('window','document',pdfSource)(mockWindow,{
 baseURI:'https://example.test/raafatSys/'
});
const pdf=mockWindow.RaafatContractPdf;

test('amounts are shown in figures and full Arabic words with لا غير',()=>{
 assert.equal(pdf.amountInWords(1250000,'IQD'),
  '1,250,000 د.ع (مليون ومئتان وخمسون ألف دينار عراقي لا غير)');
 assert.equal(pdf.amountInWords(670,'USD'),
  '670 $ (ستمئة وسبعون دولار أمريكي لا غير)');
 assert.equal(pdf.amountInWords(2000.25,'USD'),
  '2,000.25 $ (ألفان دولار أمريكي وخمسة وعشرون سنت لا غير)');
 assert.equal(pdf.amountInWords(0,'IQD'),
  '0 د.ع (صفر دينار عراقي لا غير)');
 assert.throws(()=>pdf.amountInWords(-1,'IQD'),/غير صالح/);
});

test('rooftop default clauses include five years, annual advance and mutual amendment',()=>{
 const clauses=pdf.defaultLandlordClauses({
  currency:'IQD',rentTotal:1250000,
  graceDays:14,startDate:'2026-11-15',endDate:'2031-11-14'
 });
 assert.equal(clauses.length,10);
 assert.match(clauses[1].text,/خمس سنوات قابلة للتجديد/);
 assert.match(clauses[1].text,/إيجار كل سنة مقدماً للطرف الأول/);
 assert.match(clauses[9].text,/موافقة الطرف الأول والطرف الثاني/);
 assert.match(clauses[9].text,/نسخ جديدة موقعة من الطرفين/);
});

test('contract PDF formats roof balance and customer total in Arabic words',()=>{
 assert.match(pdfSource,/amountInWords\(payload\.rentTotal,payload\.currency\)/);
 assert.match(pdfSource,/amountInWords\(payload\.remainingAfterAdvance,payload\.currency\)/);
 assert.match(pdfSource,/amountInWords\(payload\.amount,payload\.currency\)/);
});

test('authorized company manager appears with name in both signature draft fields',()=>{
 assert.match(appSource,/firstSignatureLabel:'المدير المفوض — شركة رأفت \(الطرف الأول\)'/);
 assert.match(appSource,/secondSignatureLabel:'المدير المفوض — شركة رأفت \(الطرف الثاني\)'/);
 assert.match(appSource,/firstSignatureName:v\.company_representative/);
 assert.match(appSource,/secondSignatureName:v\.company_representative/);
});
