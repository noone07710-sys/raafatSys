import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url);
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');

test('the shipped customer PDF generator keeps the original Photoshop A4 as the page background and embeds Arabic text overlays',async()=>{
 const calls={copied:0,added:0,images:0,canvasTexts:[],draws:[],canvasCount:0,templateFetches:[],out:0};
 const document={
  baseURI:'https://example.test/raafatSys/',
  fonts:{load:async()=>[]},
  head:{appendChild(){}},
  body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const canvasId=++calls.canvasCount;
    const ctx={
     scale(){},translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
     measureText(v){return {width:String(v).length*5.8}},
     fillText(v,x,y){calls.canvasTexts.push(String(v));calls.draws.push({canvasId,text:String(v),x,y,font:this.font,align:this.textAlign});},
     fillStyle:'',strokeStyle:'',font:'',direction:'rtl'
    };
    return {width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='};
   }
   if(tag==='a')return {click(){calls.downloaded=true},remove(){},href:'',download:''};
   return {remove(){}};
  }
 };
 const sourcePage={getSize:()=>({width:595.2,height:841.92})};
 const pdfWriter={
  setTitle(v){calls.title=v},setSubject(v){calls.subject=v},setCreator(){},
  async copyPages(other,indices){
   assert.strictEqual(other,original);
   assert.deepEqual(indices,[0]);
   calls.copied++;
   return [{source:'original'}];
  },
  addPage(page){
   assert.equal(page.source,'original');
   calls.added++;
   return {drawImage(image,{x,y,width,height}){
    assert.equal(x,0);assert.equal(y,0);
    assert.equal(width,595.2);assert.equal(height,841.92);
    assert.deepEqual(image,{transparency:true});
    calls.images++;
   }};
  },
  async embedPng(bytes){assert.ok(bytes.byteLength>0);return {transparency:true}},
  async save(){calls.out++;return new Uint8Array([37,80,68,70,45,49,46,55])}
 };
 const original={getPageCount:()=>1,getPage:()=>sourcePage};
 const pdfLib={PDFDocument:{load:async()=>original,create:async()=>pdfWriter}};
 const win={PDFLib:pdfLib};
 const templateBytes=new Uint8Array(6000);templateBytes.set([37,80,68,70,45],0);
 const fetch=async uri=>{
  calls.templateFetches.push(uri);
  return String(uri).startsWith('data:')?
   {arrayBuffer:async()=>new Uint8Array([137,80,78,71]).buffer}:
   {ok:true,arrayBuffer:async()=>templateBytes.buffer};
 };
 const sandbox=new Function('window','document','fetch','Blob','URL','TextDecoder','setTimeout',
  pdfSource+';\nreturn window.RaafatContractPdf;');
 const pdf=sandbox(win,document,fetch,Blob,URL,TextDecoder,setTimeout);
 assert.equal(pdf.TEMPLATE_URL,'https://example.test/raafatSys/customer-contract-template.pdf');
 const data={
  number:'RC-0007',customerName:'مكتبة حبر',customerPhone:'07712345678',
  customerNationalId:'123456789012',companyRepresentative:'مدير الشركة',
  customerRepresentative:'أحمد',campaignTitle:'حملة افتتاح المكتبة',
  packageName:'الباقة A',quantity:80,area:'—',dimensions:'2 × 1.2 م',
  months:6,startDate:'2026-11-14',endDate:'2027-05-13',amount:4200,currency:'USD',
  specifications:'مضيئة وجوه متعددة',terms:'يتم تنفيذ العمل وفق المواد والمواصفات المتفق عليها',
  notes:'اللوحات يتم تسليمها في الموعد',campaignNotes:'نقل وطباعة',
  sites:Array.from({length:4},(_,i)=>({code:'A'+String(i+1).padStart(3,'0'),
   name:'لوحة إعلانية تجريبية رقم '+(i+1),
   governorate:'صلاح الدين',address:'شارع الزهور تكريت العراق'})),
  additionalLocations:'مواقع إضافية عند الاتفاق'
 };
 const blob=await pdf.generate(data);
 assert.equal(blob.type,'application/pdf');
 assert.equal(calls.added,2,'customer contracts must have a contract page and a separate terms/signatures page');
 assert.equal(calls.copied,2,'both customer pages retain the original Photoshop A4 background');
 assert.equal(calls.images,2,'each original-template page receives its separate transparent writing overlay');
 assert.equal(calls.out,1);
 assert.match(calls.title,/RC-0007/);
 assert.ok(calls.canvasTexts.some(x=>x.includes('مكتبة حبر')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('A004')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('4,200')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('07766663304 - 07866663304')),'company phones are printed');
 assert.ok(calls.canvasTexts.filter(x=>x==='RC-0007').length===4,'the same contract number must be drawn on both sheets (measure and final render)');
 assert.ok(calls.canvasTexts.some(x=>x==='رقم العقد'),'reference label is at top of both pages');
 const numbersOnTerms=calls.draws.filter(d=>d.canvasId===3&&/^\d+\.$/.test(d.text)).map(d=>d.text);
 assert.deepEqual(numbersOnTerms,['1.','2.','3.','4.','5.','6.','7.','8.','9.'],'default terms must have no missing third clause');
 const code=calls.draws.find(d=>d.canvasId===1&&d.text==='A001');
 const boardName=calls.draws.find(d=>d.canvasId===1&&d.text.includes('لوحة إعلانية تجريبية رقم 1'));
 const boardAddress=calls.draws.find(d=>d.canvasId===1&&d.text.includes('شارع الزهور'));
 assert.ok(code&&boardName&&boardAddress,'board code, name and street must be visible');
 assert.ok(boardName.x<code.x-16,'the board title must be left of its code badge, never overlap it');
 assert.ok(boardAddress.y>boardName.y+11,'board address must always be on a later row below the title');
 const customerRep=calls.draws.find(d=>d.canvasId===1&&d.text==='ممثل الزبون');
 const companyRep=calls.draws.find(d=>d.canvasId===1&&d.text==='المدير المفوض');
 assert.ok(customerRep&&companyRep&&companyRep.x>customerRep.x,'company representative must be in right column and customer in left');
 assert.equal(customerRep.y,companyRep.y,'both representatives must be ordinary side-by-side fields');
 assert.ok(calls.canvasTexts.some(x=>x.includes('شروط العقد كالتالي')),'terms have their own sheet title');
 assert.ok(calls.draws.some(x=>x.canvasId===1&&x.text==='مواصفات الإعلان'),
  'ad specifications heading must be printed on the first contract page');
 assert.ok(calls.draws.some(x=>x.canvasId===1&&x.text.includes('مضيئة وجوه متعددة')),
  'ad specifications details must be printed on page one');
 assert.ok(!calls.draws.some(x=>x.canvasId===3&&x.text==='مواصفات الإعلان'),
  'the legal conditions page must not repeat specifications');
 assert.ok(!calls.draws.some(x=>x.canvasId===3&&x.text.includes('مضيئة وجوه متعددة')),
  'no advertisement specifications text is permitted on page two');
 const companyParty=calls.draws.find(d=>d.canvasId===1&&d.text==='الطرف الأول — شركة رأفت');
 const customerParty=calls.draws.find(d=>d.canvasId===1&&d.text==='الطرف الثاني — الزبون');
 const companyPhone=calls.draws.find(d=>d.canvasId===1&&d.text==='هاتف الشركة');
 const customerPhone=calls.draws.find(d=>d.canvasId===1&&d.text==='هاتف الزبون');
 assert.ok(companyParty&&customerParty&&companyParty.x>customerParty.x,'party one title must be right of party two');
 assert.ok(companyPhone&&customerPhone&&companyPhone.x>customerPhone.x,'party one phone must be right of party two');
 const signatureCompany=calls.draws.find(d=>d.canvasId===3&&d.text==='الطرف الأول — المدير المفوض لشركة رأفت');
 const signatureCustomer=calls.draws.find(d=>d.canvasId===3&&d.text==='الطرف الثاني — الزبون');
 assert.ok(signatureCompany&&signatureCustomer&&signatureCompany.x>signatureCustomer.x,
  'terms signature party one must be right of party two');
 assert.equal(signatureCompany.y,signatureCustomer.y,'signature headings must share one row');
 const companyNameSignature=calls.draws.find(d=>d.canvasId===3&&d.text==='الاسم: مدير الشركة');
 const customerNameSignature=calls.draws.find(d=>d.canvasId===3&&d.text==='الاسم: أحمد');
 assert.ok(companyNameSignature&&customerNameSignature&&companyNameSignature.x>customerNameSignature.x,
  'company signature name stays on right, customer name stays on left');
 assert.ok(calls.canvasTexts.some(x=>x.includes('الطرف الأول')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('شروط العقد')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('توقيع')));
 assert.ok(!calls.canvasTexts.some(x=>x.includes('صفحة 3')),'customer contract must not have a third page');
 assert.ok(!calls.canvasTexts.some(x=>x.includes('123456789012')),'identity-card values must never be written anywhere on a PDF page');
 assert.ok(!calls.canvasTexts.some(x=>x.includes('البطاقة')||x.includes('الرقم الوطني')),'identity-card labels must never appear on the PDF');
 assert.ok(calls.templateFetches.some(x=>x==='https://example.test/raafatSys/customer-contract-template.pdf'));
 const pagesBefore=calls.added;
 await assert.rejects(
  ()=>pdf.generate({...data,
   sites:Array.from({length:100},(_,i)=>({code:'E'+i,name:'لوحة إعلان رقم '+i,address:'تكريت شارع الزهور'})),
   terms:'شرط طويل يتكرر حتى يتجاوز مساحة الورقة '.repeat(200)}),
  /لا تكفي صفحة A4 الأولى|الشروط والملاحظات أطول/
 );
 assert.equal(calls.added,pagesBefore,'extremely long legal agreements must not generate extra pages or incomplete files');
});

test('live saved-contract data drives PDF fields without replacing original company logo or editing contract snapshots',async()=>{
 const rootElement={innerHTML:''};
 const document={title:'',querySelector:q=>q==='#app'?rootElement:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 let serial=0;
 const app=new Function('localStorage','document','crypto','createClient','window',
  appSource+'\nreturn {s,customerContractPdfPayload,generateCustomerContractPdf,render,customerContractPreview,openCustomerPdfEditor,customerPdfEditorHtml,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=>String(++serial)},()=>{},{});
 const {s}=app;s.demo=true;s.staff={role:'admin'};
 s.data.packages=app.seededDemoPackages();s.data.package_rates=app.seededDemoRates();
 s.data.customers=[{id:'customer',name:'اسم جديد للزبون',phone:'07701234567',national_id:'123456789012'}];
 const pkg=s.data.packages.find(x=>x.code==='E');
 s.data.campaigns=[{id:'campaign',customer_id:'customer',title:'حملة تغيّرت لاحقاً',
  package_id:pkg.id,months:12,quantity:10,price:10000,currency:'USD'}];
 s.data.customer_contracts=[{
  id:'contract',contract_number:'RC-7',customer_id:'customer',campaign_id:'campaign',
  customer_name_snapshot:'اسم الزبون عند التعاقد',
  campaign_title_snapshot:'عنوان الحملة عند التعاقد',
  campaign_quantity_snapshot:2,
  campaign_sites_snapshot:[
   {id:'site-a',code:'E01',name:'سطح أول',address:'شارع الزهور',governorate:'صلاح الدين'},
   {id:'site-b',code:'E02',name:'سطح ثاني',address:'شارع الأربعين',governorate:'صلاح الدين'}
  ],
  campaign_locations_snapshot:'موقع إضافي داخل تكريت',
  campaign_notes_snapshot:'ملاحظة الحملة الأصلية',
  package_name_snapshot:'الباقة E',
  package_dimensions_snapshot:'5 × 4 م',
  package_specifications_snapshot:'لوحة مضيئة',
  rented_area_m2:20,duration_months:3,
  start_date:'2026-11-14',end_date:'2027-02-13',
  amount:1000,currency:'USD',company_representative:'محمد',
  customer_representative:'علي',terms:'شرط خاص محفوظ',notes:'ملاحظة خاصة'
 }];
 const contract=s.data.customer_contracts[0];
 const payload=app.customerContractPdfPayload(contract);
 assert.equal(payload.number,'RC-0007');
 assert.equal(payload.customerName,'اسم الزبون عند التعاقد');
 assert.equal(Object.hasOwn(payload,'customerNationalId'),false,'national ID is excluded from the PDF payload entirely');
 assert.equal(payload.campaignTitle,'عنوان الحملة عند التعاقد');
 assert.equal(payload.packageName,'الباقة E');
 assert.equal(payload.area,'20');
 assert.equal(payload.quantity,2);
 assert.equal(payload.months,3);
 assert.equal(payload.amount,1000);
 assert.equal(payload.sites.length,2);
 assert.equal(payload.sites[0].code,'E01');
 assert.equal(payload.sites[1].code,'E02');
 assert.equal(payload.terms,'شرط خاص محفوظ');
 assert.equal(payload.additionalLocations,'موقع إضافي داخل تكريت');
 assert.ok(!Object.hasOwn(payload,'companyLogo'),'settings branding must never replace original PDF artwork');
 assert.match(app.customerContractPreview(contract),/data-edit="customer_contracts:/);
 assert.match(app.customerContractPreview(contract),/data-pdf-mode="preview"/);
 assert.doesNotMatch(app.customerContractPreview(contract),/الرقم الوطني|رقم البطاقة الموحدة/,'the HTML contract preview must never display an ID number');
 assert.doesNotMatch(app.customerContractPreview(contract),/data-action="print"/);
});


test('print editor allows editing customer contract, each site, numbered terms and both signature dates without mutating saved records',()=>{
 const rootElement={innerHTML:''};
 const document={title:'',querySelector:q=>q==='#app'?rootElement:null,
  querySelectorAll:()=>[],createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const src=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const app=new Function('localStorage','document','crypto','createClient','window',
  src+'\nreturn {s,openCustomerPdfEditor,customerPdfEditorHtml,customerContractPreview};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'x'},()=>{},{});
 app.s.demo=true;app.s.staff={role:'admin'};
 app.s.data.customers=[{id:'client',name:'زبون العقد',phone:'07700000000'}];
 app.s.data.customer_contracts=[{
  id:'cc',contract_number:'RC-0015',customer_id:'client',start_date:'2026-11-15',
  end_date:'2026-12-15',amount:3000,currency:'IQD',
  customer_representative:'ممثل العميل',company_representative:'ممثل رأفت',
  campaign_sites_snapshot:[{code:'A-1',name:'لوحة الإعلان',address:'تكريت'}],
  customer_name_snapshot:'الزبون المحفوظ',campaign_title_snapshot:'الحملة المحفوظة'
 }];
 const saved=JSON.stringify(app.s.data.customer_contracts[0]);
 app.openCustomerPdfEditor('cc');
 const draft=app.s.modal.printDraft;
 assert.equal(draft.companyPhones,'07766663304 - 07866663304');
 assert.equal(draft.firstSignatureLabel,'المدير المفوض — شركة رأفت (الطرف الأول)');
 assert.equal(draft.secondSignatureLabel,'الطرف الثاني — الزبون');
 assert.deepEqual(draft.clauses.map(x=>x.number),['1','2','3','4','5','6','7','8','9']);
 const html=app.customerPdfEditorHtml();
 assert.match(html,/data-print-site-field="address"/);
 const specField=html.indexOf('name="specifications"');
 const termsHeading=html.indexOf('الشروط والملاحظات — الصفحة الثانية');
 assert.ok(specField>=0&&termsHeading>=0&&specField<termsHeading,
  'ad specifications must be editable in the first-sheet section, not alongside legal conditions');
 assert.match(html,/data-print-site-add/);
 assert.match(html,/data-print-clause-add/);
 assert.match(html,/data-print-clause-remove/);
 assert.match(html,/aria-label="نص الشرط 3"/);
 assert.match(app.customerContractPreview(app.s.data.customer_contracts[0]),/contract-number-top/);
 assert.match(html,/data-pdf-editor-preview/);
 assert.match(html,/data-pdf-editor-download/);
 assert.match(html,/name="firstSignatureDate"/);
 assert.match(html,/name="secondSignatureDate"/);
 assert.match(html,/الطرف الأول — جهة اليمين \(الشركة\)/);
 assert.match(html,/الطرف الثاني — جهة اليسار \(الزبون\)/);
 assert.equal(draft.firstSignatureName,'ممثل رأفت');
 assert.equal(draft.secondSignatureName,'ممثل العميل');
 assert.match(html,/25\$/);
 draft.customerName='محرر قبل الطباعة';
 draft.sites[0].address='عنوان محرر قبل الطباعة';
 draft.clauses[0].text='شرط محرر للطباعة';
 assert.equal(JSON.stringify(app.s.data.customer_contracts[0]),saved,'edits do not touch the saved contract snapshot');
});
