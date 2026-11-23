import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dataCode=readFileSync(new URL('../report-data.js',import.meta.url),'utf8');
const fileCode=readFileSync(new URL('../report-files.js',import.meta.url),'utf8');
const appCode=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const win={};
new Function('window',dataCode)(win);
new Function('window','TextEncoder','Blob',fileCode)(win,TextEncoder,Blob);
const {build}=win.RaafatReportData;
const {xlsx}=win.RaafatReportFiles;
const blank=()=>({
 customers:[],landlords:[],properties:[],ad_sites:[],packages:[],
 campaigns:[],campaign_sites:[],campaign_payments:[],customer_contracts:[],
 leases:[],lease_installments:[],company_expenses:[]
});
function fixtures(){
 const d=blank();
 d.landlords=[
  {id:'owner-1',name:'صاحب عقارين',phone:'07700000001',alternate_phone:'07800000001',
   national_id:'000012345678',governorate:'صلاح الدين',residential_address:'تكريت'},
  {id:'owner-2',name:'مالك بلا عقار',phone:'07700000002',national_id:'000000000021'}
 ];
 d.properties=[
  {id:'roof-1',landlord_id:'owner-1',title:'سطح البناية الأولى',width_m:8,height_m:12,
   area_m2:96,quantity:2},
  {id:'roof-2',landlord_id:'owner-1',title:'العقار الثاني بلا قطع',width_m:5,height_m:6,
   area_m2:30,quantity:1}
 ];
 d.packages=[
  {id:'pack-a',code:'A',name:'باقة A',width_m:2,height_m:3},
  {id:'pack-e',code:'E',name:'باقة E',width_m:null,height_m:null}
 ];
 d.ad_sites=[
  {id:'site-1',code:'A-01',name:'شارع الزهور',address:'مدخل الشارع',
   governorate:'صلاح الدين',package_id:'pack-a',rooftop_property_id:'roof-1'},
  {id:'site-2',code:'E-02',name:'سطح بناية',address:'قرب البلدية',
   governorate:'صلاح الدين',package_id:'pack-e',rooftop_property_id:'roof-1'},
  {id:'site-3',code:'B-03',name:'موقع غير مربوط',address:'ساحة عامة'}
 ];
 d.customers=[
  {id:'cust-1',name:'زبون بعقدين',phone:'07701122334',alternate_phone:'07801122334',
   national_id:'000000012345',status:'active'},
  {id:'cust-2',name:'زبون بلا حملة',phone:'07709999999',status:'inquiry'}
 ];
 d.campaigns=[
  {id:'camp-1',customer_id:'cust-1',title:'حملة الدولار',package_id:'pack-a',
   price:600,currency:'USD',months:3,quantity:3,start_date:'2026-11-01'},
  {id:'camp-2',customer_id:'cust-1',title:'حملة الدينار دون قطع',package_id:'pack-e',
   price:100000,currency:'IQD',months:6,quantity:1,locations:'مواقع إضافية مكتوبة'}
 ];
 d.campaign_sites=[
  {id:'link-1',campaign_id:'camp-1',site_id:'site-1'},
  {id:'link-2',campaign_id:'camp-1',site_id:'site-2'}
 ];
 d.campaign_payments=[
  {id:'pay-1',campaign_id:'camp-1',amount:100,entry_currency:'IQD',
   receipt_number:'0001',paid_at:'2026-11-18'}
 ];
 d.customer_contracts=[
  {id:'cc-1',customer_id:'cust-1',campaign_id:'camp-1',package_id:'pack-a',
   contract_number:'RC-0007',amount:600,currency:'USD',
   campaign_sites_snapshot:[{id:'site-1',code:'A-01'}],campaign_quantity_snapshot:3}
 ];
 d.leases=[
  {id:'lease-1',landlord_id:'owner-1',property_id:'roof-1',
   contract_number:'RA-001',rent_total:500,advance_amount:200,currency:'USD'},
  {id:'lease-2',landlord_id:'owner-1',property_id:'roof-2',
   contract_number:'RA-002',rent_total:100000,advance_amount:0,currency:'IQD'}
 ];
 d.lease_installments=[
  {id:'inst-1',lease_id:'lease-2',amount:100000,paid_amount:50000,due_date:'2026-11-01'}
 ];
 d.company_expenses=[{id:'expense-1',title:'فاتورة',amount:5000,paid_amount:2000,
  receipt_number:'0009',currency:'IQD'}];
 return d;
}
const opts={exchangeRate:1500,currency:'USD',today:'2026-11-23',
 companyName:'شركة رأفت',generatedAt:'2026-11-23T10:00:00Z'};
function unzipStored(bytes){
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(data.buffer,data.byteOffset,data.byteLength);
 const decoder=new TextDecoder(),files=new Map();
 let i=0;while(i+4<=data.length&&v.getUint32(i,true)===0x04034b50){
  const nameLength=v.getUint16(i+26,true),extra=v.getUint16(i+28,true),len=v.getUint32(i+18,true);
  const file=decoder.decode(data.subarray(i+30,i+30+nameLength));
  const start=i+30+nameLength+extra;
  files.set(file,decoder.decode(data.subarray(start,start+len)));
  i=start+len;
 }
 return files;
}

test('owner report joins only real roof-site relationships and includes zero-site properties and zero-property owners',()=>{
 const r=build('landlords',fixtures(),opts);
 assert.equal(r.counts.owners,2);
 assert.equal(r.counts.properties,2);
 assert.equal(r.counts.sites,2,'unlinked billboard is not assigned to a fictitious owner');
 const flat=r.sheets.find(x=>x.name==='الكشف الشامل').rows;
 assert.equal(flat.length,4,'two sites, empty roof, empty owner all represented');
 const first=flat.find(x=>x.siteCode==='A-01');
 assert.equal(first.ownerName,'صاحب عقارين');
 assert.equal(first.phone,'07700000001');
 assert.equal(first.nationalId,'000012345678');
 assert.equal(first.dimensions,'8 × 12 متر');
 assert.equal(first.quantity,2);
 const sites=r.sheets.find(x=>x.name==='القطع الإعلانية').rows;
 assert.equal(sites.find(x=>x.siteCode==='A-01').adWidth,2);
 assert.equal(sites.find(x=>x.siteCode==='E-02').adWidth,8,'roof dimensions used when E has no fixed package dimensions');
 assert.equal(sites.find(x=>x.siteCode==='E-02').adArea,96);
 assert.ok(flat.some(x=>x.propertyName==='العقار الثاني بلا قطع'&&!x.siteCode));
 assert.ok(flat.some(x=>x.ownerName==='مالك بلا عقار'&&!x.propertyName));
});

test('customer report preserves original phone/ID, separate promised versus assigned boards, receipts and saved contract snapshots',()=>{
 const r=build('customers',fixtures(),opts);
 assert.equal(r.counts.customers,2);
 const camp=r.sheets.find(x=>x.name==='الحملات').rows[0];
 assert.equal(camp.expectedCount,3);
 assert.equal(camp.linkedCount,2);
 assert.equal(camp.siteCodes,'A-01، E-02');
 assert.equal(camp.paid,100);
 assert.equal(camp.due,500);
 assert.equal(camp.currency,'USD');
 const empty=r.sheets.find(x=>x.name==='الحملات').rows[1];
 assert.equal(empty.linkedCount,0);
 assert.equal(empty.locations,'مواقع إضافية مكتوبة');
 const cust=r.sheets.find(x=>x.name==='الزبائن').rows;
 assert.equal(cust[0].phone,'07701122334');
 assert.equal(cust[0].nationalId,'000000012345');
 assert.ok(r.sheets.find(x=>x.name==='الكشف الشامل').rows.some(x=>x.customerName==='زبون بلا حملة'));
 const contract=r.sheets.find(x=>x.name==='عقود الزبائن').rows[0];
 assert.equal(contract.siteCodes,'A-01','contract snapshots remain independent from changed site assignments');
 const pay=r.sheets.find(x=>x.name==='دفعات الزبائن').rows[0];
 assert.equal(pay.currency,'USD','payment amount is stored in its parent campaign currency, never entry currency');
 assert.equal(pay.amountInView,100);
});

test('finance report reconciles mixed currencies, unapportioned lease balances and real paid amounts',()=>{
 const d=fixtures(),r=build('finance',d,opts);
 assert.equal(r.totals.received,100);
 assert.equal(r.totals.outstanding,566.67,'500 USD + 100,000 IQD / 1,500');
 assert.equal(r.totals.rentDue,333.33,'300 USD unscheduled lease + 50,000 IQD remaining');
 assert.equal(r.totals.expenses,3.33);
 assert.equal(r.totals.lateInstallments,1);
 const payment=r.sheets.find(x=>x.name==='دفعات الحملات').rows[0];
 assert.equal(payment.amount,100);
 assert.equal(payment.currency,'USD');
 assert.equal(payment.amountView,100);
 const secondLease=r.sheets.find(x=>x.name==='عقود الإيجار').rows[1];
 assert.equal(secondLease.paid,50000);
 assert.equal(secondLease.due,50000);
 assert.equal(secondLease.dueView,33.33);
 assert.match(appCode,/originalCurrency=.*campaign_payments.*campaigns/,'app report converter must use the campaign parent currency');
});

test('XLSX is a real multi-sheet ZIP workbook with Arabic headers and text-typed phone and national IDs',async()=>{
 const r=build('landlords',fixtures(),opts);
 const file=xlsx(r);
 assert.equal(file.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 const bytes=new Uint8Array(await file.arrayBuffer());
 assert.deepEqual([...bytes.slice(0,4)],[80,75,3,4]);
 const files=unzipStored(bytes);
 assert.ok(files.has('[Content_Types].xml'));
 assert.ok(files.has('xl/workbook.xml'));
 assert.ok(files.has('xl/_rels/workbook.xml.rels'));
 assert.ok(files.has('xl/styles.xml'));
 assert.equal([...files.keys()].filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).length,r.sheets.length);
 assert.match(files.get('xl/workbook.xml'),/الكشف الشامل/);
 assert.match(files.get('xl/worksheets/sheet2.xml'),/07700000001/);
 assert.match(files.get('xl/worksheets/sheet2.xml'),/000012345678/);
 assert.match(files.get('xl/worksheets/sheet2.xml'),/t="inlineStr"/);
 assert.match(files.get('xl/worksheets/sheet3.xml'),/96<\/v>/);
 assert.match(files.get('xl/worksheets/sheet1.xml'),/rightToLeft="1"/);
});

test('Excel personal input resembling a formula stays text, never a cell formula',async()=>{
 const d=fixtures();d.customers[0].name='=HYPERLINK("https://bad.test","click")';
 const file=xlsx(build('customers',d,opts)),xml=unzipStored(new Uint8Array(await file.arrayBuffer())).get('xl/worksheets/sheet2.xml');
 assert.match(xml,/=HYPERLINK\(&quot;https:\/\/bad.test&quot;,&quot;click&quot;\)/);
 assert.doesNotMatch(xml,/<f(?:\s|>)/);
});

test('PDF contains Arabic data, all report sections and multiple pages without dropping entries',async()=>{
 const r=build('customers',fixtures(),opts),trace=[];
 const doc={
  fonts:{load:async()=>[]},head:{appendChild(){}},body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas')return {width:0,height:0,getContext:()=>({
    scale(){},fillRect(){},strokeRect(){},measureText(x){return {width:String(x).length*5}},
    fillText(x){trace.push(String(x))}
   }),toDataURL:()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='};
   return {remove(){}};
  }
 };
 let pages=0;
 const PDFLib={PDFDocument:{create:async()=>({
  setTitle(){},setAuthor(){},setCreator(){},
  embedPng:async()=>({}),
  addPage:()=>{pages++;return {drawImage(){}}},
  save:async()=>new Uint8Array([37,80,68,70,45,49,46,55])
 })}};
 const window={PDFLib};
 const fetch=async()=>({arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer});
 new Function('window','document','fetch','TextEncoder','Blob','URL','setTimeout',
  fileCode+'\nreturn window.RaafatReportFiles;')
 (window,doc,fetch,TextEncoder,Blob,URL,()=>{});
 const file=await window.RaafatReportFiles.pdf(r);
 assert.equal(file.type,'application/pdf');
 assert.ok(pages>=r.sheets.length);
 for(const expected of ['شركة رأفت','زبون بعقدين','07701122334','A-01','500','الحملات','عقود الزبائن']){
  assert.ok(trace.some(x=>x.includes(expected)),expected);
 }
});

test('missing required table rejects export rather than generating a partial report',()=>{
 const missing=fixtures();delete missing.campaign_sites;
 assert.throws(()=>build('customers',missing,opts),/مصدر البيانات ناقص/);
 assert.throws(()=>build('finance',fixtures(),{...opts,exchangeRate:0}),/سعر الصرف/);
});
