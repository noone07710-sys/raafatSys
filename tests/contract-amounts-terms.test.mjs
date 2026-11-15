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
  '1,250,000 د.ع — مليون ومئتان وخمسون ألف دينار عراقي لا غير');
 assert.equal(pdf.amountInWords(670,'USD'),
  '670 $ — ستمئة وسبعون دولار أمريكي لا غير');
 assert.equal(pdf.amountInWords(2000.25,'USD'),
  '2,000.25 $ — ألفان دولار أمريكي وخمسة وعشرون سنت لا غير');
 assert.equal(pdf.amountInWords(0,'IQD'),
  '0 د.ع — صفر دينار عراقي لا غير');
 assert.throws(()=>pdf.amountInWords(-1,'IQD'),/غير صالح/);
});

test('rooftop default clauses include five years, annual advance and mutual amendment',()=>{
 const clauses=pdf.defaultLandlordClauses({
  currency:'IQD',rentTotal:1250000,
  graceDays:14,startDate:'2026-11-15',endDate:'2031-11-14'
 });
 assert.equal(clauses.length,10);
 assert.equal(clauses[1].text,'مدة العقد خمس سنوات قابلة للتجديد، ويدفع الطرف الثاني إيجار كل سنة مقدماً للطرف الأول.');
 assert.match(clauses[1].text,/إيجار كل سنة مقدماً للطرف الأول/);
 assert.equal(clauses[9].text,'أي تغيير على بنود العقد يجب أن يكون بموافقة الطرف الأول والطرف الثاني، ويُحرَّر العقد بنسخ جديدة موقعة من الطرفين.');
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

test('previously saved lease and customer contracts use authorized-manager title on reprint',()=>{
 const code=appSource.replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const doc={baseURI:'https://example.test/raafatSys/'};
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  code+'\nreturn {s,landlordContractPdfPayload,customerContractPdfPayload};'
 )({getItem:()=>null,setItem:()=>{}},doc,
  {randomUUID:()=> 'sample-id'},()=>{}, {},class {},class {},()=>{});
 app.s.demo=true;
 app.s.data.landlords=[{id:'l1',name:'مالك محفوظ',phone:'07700000000',governorate:'صلاح الدين',residential_address:'تكريت'}];
 app.s.data.properties=[{id:'p1',landlord_id:'l1',title:'سطح محفوظ',width_m:4,height_m:3,quantity:1}];
 const lease={id:'r1',contract_number:11,landlord_id:'l1',property_id:'p1',
  company_representative:'اسم المدير المحفوظ',rent_total:1000000,advance_amount:200000,
  start_date:'2025-01-01',end_date:'2030-01-01',grace_days:7,
  payment_frequency:'annual',currency:'IQD'};
 app.s.data.leases=[lease];app.s.data.lease_installments=[];
 const roof=app.landlordContractPdfPayload(lease);
 assert.match(roof.secondSignatureLabel,/المدير المفوض/);
 assert.equal(roof.secondSignatureName,'اسم المدير المحفوظ');
 assert.equal(roof.rentTotal,1000000);
 assert.equal(roof.remainingAfterAdvance,800000);
 assert.equal(lease.company_representative,'اسم المدير المحفوظ');
 app.s.data.customers=[{id:'c1',name:'زبون محفوظ',phone:'07800000000'}];
 const customer={id:'cc1',contract_number:25,customer_id:'c1',company_representative:'مدير آخر محفوظ',
  amount:670,currency:'USD',start_date:'2025-02-01',end_date:'2025-05-01',
  duration_months:3,campaign_title_snapshot:'حملة قديمة',package_name_snapshot:'الباقة A'};
 app.s.data.customer_contracts=[customer];
 const sales=app.customerContractPdfPayload(customer);
 assert.match(sales.firstSignatureLabel,/المدير المفوض/);
 assert.equal(sales.firstSignatureName,'مدير آخر محفوظ');
 assert.equal(sales.amount,670);
 assert.equal(customer.company_representative,'مدير آخر محفوظ');
 assert.doesNotMatch(appSource,/ممثل شركة رأفت|ممثل الشركة/);
 assert.doesNotMatch(pdfSource,/ممثل شركة رأفت|ممثل الشركة/);
});
