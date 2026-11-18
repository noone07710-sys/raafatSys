import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

function setup(advance,installments=[]){
 const root={innerHTML:''};
 const doc={title:'',baseURI:'https://example.test/raafatSys/',
  querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const win={};
 win.RaafatContractPdf=new Function('window','document','URL',
  pdfSource+'\nreturn window.RaafatContractPdf;')(win,doc,URL);
 const app=new Function('localStorage','document','crypto','createClient','window',
  appSource+'\nreturn {s,landlordContractPdfPayload,previewHtml,openLandlordPdfEditor,landlordPdfEditorHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'fixture-id'},()=>{},win);
 app.s.demo=true;app.s.staff={role:'admin'};
 app.s.data.landlords=[{id:'owner',name:'مالك السطح',phone:'07701111111',
  national_id:'123456789012',governorate:'صلاح الدين',residential_address:'تكريت'}];
 app.s.data.properties=[{id:'roof',landlord_id:'owner',title:'سطح المجمع',
  width_m:10,height_m:5,dimensions:'10 × 5 م',quantity:1}];
 app.s.data.leases=[{id:'lease',contract_number:'RA-0097',landlord_id:'owner',property_id:'roof',
  rent_total:1000,advance_amount:advance,currency:'USD',start_date:'2026-11-18',
  end_date:'2027-11-17',grace_days:7,payment_frequency:'annual'}];
 app.s.data.lease_installments=installments.map((x,i)=>({
  id:'installment-'+i,lease_id:'lease',paid_amount:0,...x
 }));
 return {app,win,lease:app.s.data.leases[0]};
}

async function pdfText(payload){
 const trace=[];
 const document={
  baseURI:'https://example.test/raafatSys/',
  fonts:{load:async()=>[]},head:{appendChild(){}},body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const ctx={scale(){},translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
     measureText(value){return {width:String(value).length*5.6}},
     fillText(text){trace.push(String(text))}
    };
    return {width:0,height:0,getContext:()=>ctx,
     toDataURL:()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='};
   }
   return {remove(){}};
  }
 };
 const original={getPageCount:()=>1,getPage:()=>({getSize:()=>({width:595.2,height:841.92})})};
 const writer={setTitle(){},setSubject(){},setCreator(){},
  copyPages:async()=>[{}],addPage:()=>({drawImage(){}}),embedPng:async()=>({image:true}),
  save:async()=>new Uint8Array([37,80,68,70,45,49,46,55])};
 const win={PDFLib:{PDFDocument:{load:async()=>original,create:async()=>writer}}};
 const originalBytes=new Uint8Array(6000);originalBytes.set([37,80,68,70,45],0);
 const fakeFetch=async url=>({ok:true,arrayBuffer:async()=>String(url).startsWith('data:')?
  new Uint8Array([137,80,78,71]).buffer:originalBytes.buffer});
 const generator=new Function('window','document','fetch','Blob','URL','TextDecoder','setTimeout',
  pdfSource+'\nreturn window.RaafatContractPdf;'
 )(win,document,fakeFetch,Blob,URL,TextDecoder,setTimeout);
 const result=await generator.generate(payload);
 assert.equal(result.type,'application/pdf');
 return trace;
}

test('fully paid cash roof lease prints the requested title, national card and cash receipt without any installment section',async()=>{
 const {app,win,lease}=setup(1000);
 const payload=app.landlordContractPdfPayload(lease);
 assert.equal(payload.landlordNationalId,'123456789012');
 assert.equal(payload.advanceAmount,1000);
 assert.deepEqual(payload.installments,[]);
 const first=win.RaafatContractPdf.defaultLandlordClauses(payload)[0].text;
 assert.match(first,/مدفوع نقداً بالكامل/);
 assert.doesNotMatch(first,/جدول الدفعات|أقساط/);
 const preview=app.previewHtml(lease);
 assert.match(preview,/عقد استئجار أسطح بنايات إعلانية/);
 assert.match(preview,/رقم البطاقة الوطنية للمالك/);
 assert.match(preview,/123456789012/);
 assert.match(preview,/مدفوع نقداً/);
 assert.doesNotMatch(preview,/<h3>جدول أقساط الإيجار<\/h3>/);
 assert.doesNotMatch(preview,/<small>المقدم<\/small>/);
 app.openLandlordPdfEditor('lease');
 assert.match(app.landlordPdfEditorHtml(),/name="landlordNationalId"/);
 assert.doesNotMatch(app.landlordPdfEditorHtml(),/الأقساط الواردة في نسخة العقد/);
 assert.doesNotMatch(app.landlordPdfEditorHtml(),/data-print-installment-add/);
 const printed=(await pdfText(payload)).join(' ');
 for(const term of ['عقد استئجار أسطح بنايات إعلانية',
  'رقم البطاقة الوطنية للمالك','123456789012','مدفوع نقداً'])
  assert.ok(printed.includes(term),'Missing printed term: '+term);
 for(const forbidden of ['المبلغ المقدم','المبلغ المتبقي بعد المقدم','جدول أقساط الإيجار',
  'لا توجد أقساط','دورية دفع الإيجار','وفق جدول الدفعات المثبت'])
  assert.ok(!printed.includes(forbidden),'Unexpected phrase in fully paid cash lease: '+forbidden);
});

test('contract with no installment schedule but partially paid rent omits installment mentions without claiming cash settlement',async()=>{
 const {app,win,lease}=setup(200);
 const payload=app.landlordContractPdfPayload(lease);
 const clause=win.RaafatContractPdf.defaultLandlordClauses(payload)[0].text;
 assert.match(clause,/وفق الاتفاق المثبت في العقد/);
 assert.doesNotMatch(clause,/وفق جدول الدفعات/);
 const printed=(await pdfText(payload)).join(' ');
 assert.ok(printed.includes('المبلغ المقدم'));
 assert.ok(!printed.includes('مدفوع نقداً'));
 assert.ok(!printed.includes('جدول أقساط الإيجار'));
 assert.ok(!printed.includes('لا توجد أقساط'));
});

test('roof lease with scheduled payments keeps the real installment table and normal upfront labeling',async()=>{
 const {app,win,lease}=setup(200,[{due_date:'2027-01-18',amount:800}]);
 const payload=app.landlordContractPdfPayload(lease);
 const clause=win.RaafatContractPdf.defaultLandlordClauses(payload)[0].text;
 assert.match(clause,/وفق جدول الدفعات المثبت في العقد/);
 const printed=(await pdfText(payload)).join(' ');
 assert.ok(printed.includes('جدول أقساط الإيجار'));
 assert.ok(printed.includes('2027-01-18'));
 assert.ok(printed.includes('المبلغ المقدم'));
 assert.ok(!printed.includes('مدفوع نقداً'));
});

test('old PDF customizations cannot restore removed real installments on the printed lease',()=>{
 const {app,lease}=setup(1000);
 lease.print_overrides={
  installments:[{dueDate:'2027-01-18',amount:1000}],
  landlordNationalId:'123456789012'
 };
 app.openLandlordPdfEditor('lease');
 assert.deepEqual(app.s.modal.printDraft.installments,[]);
 assert.doesNotMatch(app.landlordPdfEditorHtml(),/الأقساط الواردة في نسخة العقد/);
});