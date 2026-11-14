import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url);
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');

test('the shipped customer PDF generator keeps the original Photoshop A4 as the page background and embeds Arabic text overlays',async()=>{
 const calls={copied:0,added:0,images:0,canvasTexts:[],templateFetches:[],out:0};
 const document={
  baseURI:'https://example.test/raafatSys/',
  fonts:{load:async()=>[]},
  head:{appendChild(){}},
  body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const ctx={
     scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
     measureText(v){return {width:String(v).length*5.8}},
     fillText(v){calls.canvasTexts.push(String(v));},
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
  sites:Array.from({length:80},(_,i)=>({code:'A'+String(i+1).padStart(3,'0'),
   name:'لوحة إعلانية تجريبية رقم '+(i+1),
   governorate:'صلاح الدين',address:'شارع الزهور تكريت العراق'})),
  additionalLocations:'مواقع إضافية عند الاتفاق'
 };
 const blob=await pdf.generate(data);
 assert.equal(blob.type,'application/pdf');
 assert.ok(calls.added>1,'80 boards must paginate onto multiple copies of the same PDF template');
 assert.equal(calls.added,calls.copied,'every page must originate from the uploaded Photoshop template');
 assert.equal(calls.images,calls.added,'each page gets a transparent writing layer');
 assert.equal(calls.out,1);
 assert.match(calls.title,/RC-0007/);
 assert.ok(calls.canvasTexts.some(x=>x.includes('مكتبة حبر')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('A080')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('4,200')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('الطرف الأول')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('الشروط')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('توقيع')));
 assert.ok(calls.canvasTexts.some(x=>x.includes('صفحة 2')),'pagination should show page numbers');
 assert.ok(!calls.canvasTexts.some(x=>x.includes('123456789012')),'identity-card values must never be written anywhere on a PDF page');
 assert.ok(!calls.canvasTexts.some(x=>x.includes('البطاقة')||x.includes('الرقم الوطني')),'identity-card labels must never appear on the PDF');
 assert.ok(calls.templateFetches.some(x=>x==='https://example.test/raafatSys/customer-contract-template.pdf'));
});

test('live saved-contract data drives PDF fields without replacing original company logo or editing contract snapshots',async()=>{
 const rootElement={innerHTML:''};
 const document={title:'',querySelector:q=>q==='#app'?rootElement:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 let serial=0;
 const app=new Function('localStorage','document','crypto','createClient','window',
  appSource+'\nreturn {s,customerContractPdfPayload,generateCustomerContractPdf,render,customerContractPreview,seededDemoPackages,seededDemoRates};'
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
 assert.match(app.customerContractPreview(contract),/data-pdf-mode="download"/);
 assert.match(app.customerContractPreview(contract),/data-pdf-mode="preview"/);
 assert.doesNotMatch(app.customerContractPreview(contract),/الرقم الوطني|رقم البطاقة الموحدة/,'the HTML contract preview must never display an ID number');
 assert.doesNotMatch(app.customerContractPreview(contract),/data-action="print"/);
});
