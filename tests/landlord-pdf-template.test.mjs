import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const generatorSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

function model(){
 const root={innerHTML:''};
 const doc={title:'',baseURI:'https://example.test/raafatSys/',querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const win={};
 const app=new Function('localStorage','document','crypto','createClient','window',
  appSource+'\nreturn {s,landlordContractPdfPayload,generateLandlordContractPdf,modalHtml,previewHtml,openForm,render,openLandlordPdfEditor,landlordPdfEditorHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'id1'},()=>{},win);
 const s=app.s;s.demo=true;s.staff={role:'admin'};
 s.data.landlords=[
  {id:'owner',name:'مالك السطح',phone:'07701234567',national_id:'111111111111',
   governorate:'صلاح الدين',residential_address:'تكريت شارع الزهور'}
 ];
 s.data.properties=[
  {id:'roof',landlord_id:'owner',title:'سطح عمارة الرافدين',
   width_m:4,height_m:6,area_m2:24,quantity:2}
 ];
 s.data.leases=[
  {id:'lease',landlord_id:'owner',property_id:'roof',contract_number:'RA-7',
   rent_total:1200,advance_amount:200,currency:'USD',
   start_date:'2026-11-14',end_date:'2027-11-13',payment_frequency:'semiannual',
   grace_days:5,company_representative:'ممثل رأفت',
   landlord_representative:'ممثل المالك',notes:'ينفذ استئجار السطح وفق الاتفاق المسجل'}
 ];
 s.data.lease_installments=[
  {id:'inst1',lease_id:'lease',due_date:'2026-11-19',amount:500,paid_amount:200},
  {id:'inst2',lease_id:'lease',due_date:'2027-05-19',amount:500,paid_amount:0}
 ];
 return {app,s,root,win,doc};
}

test('landlord contract payload maps saved lease, roof and the landlord national ID only',()=>{
 const {app,s}=model();
 const original=s.data.leases[0];
 const payload=app.landlordContractPdfPayload(original);
 assert.equal(payload.kind,'landlord');
 assert.equal(payload.number,'RA-0007');
 assert.equal(payload.landlordName,'مالك السطح');
 assert.equal(payload.landlordPhone,'07701234567');
 assert.equal(payload.propertyName,'سطح عمارة الرافدين');
 assert.equal(payload.dimensions,'4 × 6 م');
 assert.equal(payload.area,'24');
 assert.equal(payload.quantity,2);
 assert.equal(payload.paymentFrequency,'نصف سنوي');
 assert.equal(payload.rentTotal,1200);
 assert.equal(payload.advanceAmount,200);
 assert.equal(payload.remainingAfterAdvance,1000);
 assert.deepEqual(payload.installments,[
  {dueDate:'2026-11-19',amount:500},{dueDate:'2027-05-19',amount:500}
 ]);
 assert.equal(payload.notes,'ينفذ استئجار السطح وفق الاتفاق المسجل');
 assert.equal(Object.hasOwn(payload,'national_id'),false);
 assert.equal(payload.landlordNationalId,'111111111111');
 assert.match(JSON.stringify(payload),/111111111111/);
 const dialog=app.previewHtml(original);
 assert.match(dialog,/data-landlord-pdf="lease"/);
 assert.match(dialog,/data-edit="leases:lease"/);
 assert.match(dialog,/data-pdf-mode="preview"/);
 assert.doesNotMatch(dialog,/data-action="print"/);
 app.openForm('leases',original);
 assert.match(app.modalHtml(),/مراجعة وطباعة العقد/);
});

test('landlord PDF draws lease on first Photoshop A4 and ten numbered lease terms with signatures on second A4',async()=>{
 const {app}=model();
 const payload=app.landlordContractPdfPayload(app.s.data.leases[0]);
 const trace={text:[],draws:[],pages:0,backgrounds:0,overlays:0,canvasCount:0};
 const doc={
  baseURI:'https://example.test/raafatSys/',
  fonts:{load:async()=>[]},
  head:{appendChild(){}},
  body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const canvasId=++trace.canvasCount;
    const ctx={
     scale(){},translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
     measureText(value){return {width:String(value).length*5.6}},
     fillText(value,x,y){trace.text.push(String(value));trace.draws.push({canvasId,text:String(value),x,y});}
    };
    return {width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='};
   }
   return {remove(){}};
  }
 };
 const original={
  getPageCount:()=>1,
  getPage:()=>({getSize:()=>({width:595.2,height:841.92})})
 };
 const writer={
  setTitle(value){trace.title=value},
  setSubject(value){trace.subject=value},
  setCreator(){},
  async copyPages(pdf,numbers){assert.equal(pdf,original);assert.deepEqual(numbers,[0]);trace.backgrounds++;return [{}]},
  addPage(){trace.pages++;return {drawImage(image,box){
   assert.ok(image);assert.equal(box.width,595.2);assert.equal(box.height,841.92);trace.overlays++;
  }}},
  async embedPng(){return {image:true}},
  async save(){return new Uint8Array([37,80,68,70,45,49,46,55])}
 };
 const PDFLib={PDFDocument:{load:async()=>original,create:async()=>writer}};
 const template=new Uint8Array(6000);template.set([37,80,68,70,45],0);
 const fetch=async url=>({
  ok:true,arrayBuffer:async()=>String(url).startsWith('data:')?
   new Uint8Array([137,80,78,71]).buffer:template.buffer
 });
 const generate=new Function('window','document','fetch','Blob','URL','TextDecoder','setTimeout',
  generatorSource+'\nreturn window.RaafatContractPdf;'
 )({PDFLib},doc,fetch,Blob,URL,TextDecoder,setTimeout);
 const pdf=await generate.generate(payload);
 assert.equal(pdf.type,'application/pdf');
 assert.equal(trace.pages,2);
 assert.equal(trace.backgrounds,2);
 assert.equal(trace.overlays,2);
 assert.match(trace.title,/RA-0007/);
 assert.match(trace.subject,/عقد استئجار أسطح بنايات إعلانية/);
 for(const expected of ['عقد استئجار أسطح بنايات إعلانية','مالك السطح','سطح عمارة الرافدين',
  '1,200','200','1,000','2026-11-19','2027-05-19','شروط العقد كالتالي',
  'الطرف الأول — المؤجر (مالك السطح)','المدير المفوض — شركة رأفت (الطرف الثاني)'])
  assert.ok(trace.text.some(x=>x.includes(expected)),expected);
 assert.ok(trace.text.some(x=>x.includes('111111111111')));
 assert.ok(trace.text.some(x=>x.includes('رقم البطاقة الوطنية للمالك')));
 assert.equal(trace.text.filter(x=>x==='RA-0007').length,4,'matching reference across both rendered and measurement sheets');
 const numbers=trace.draws.filter(d=>d.canvasId===3&&/^\d+\.$/.test(d.text)).map(d=>d.text);
 assert.deepEqual(numbers,['1.','2.','3.','4.','5.','6.','7.','8.','9.','10.']);
 const owner=trace.draws.find(d=>d.canvasId===1&&d.text==='الطرف الأول — المؤجر (المالك)');
 const tenant=trace.draws.find(d=>d.canvasId===1&&d.text==='الطرف الثاني — المستأجر');
 assert.ok(owner&&tenant&&owner.x>tenant.x,'the owner must be right and Raafat left on page one');
 const ownerSig=trace.draws.find(d=>d.canvasId===3&&d.text==='الطرف الأول — المؤجر (مالك السطح)');
 const tenantSig=trace.draws.find(d=>d.canvasId===3&&d.text==='المدير المفوض — شركة رأفت (الطرف الثاني)');
 assert.ok(ownerSig&&tenantSig&&ownerSig.x>tenantSig.x,'owner signature right and Raafat signature left');
 assert.ok(trace.text.some(x=>x.includes('1,200')),'rent clause uses the actual lease amount');
 assert.ok(trace.text.some(x=>x.includes('5 يوماً')),'grace clause must use actual saved days rather than fixed two weeks');
 assert.ok(trace.text.some(x=>x.includes('2026/11/14')&&x.includes('2027/11/13')),'the period in the clauses must use saved dates');
 assert.ok(!trace.draws.some(d=>d.canvasId===1&&d.text==='شروط العقد كالتالي'),'first page contains no terms');
});


test('lease editor mirrors customer two-page review with editable ten conditions, signatures, owner and tenant, rent and installment details',()=>{
 const {app,s,win,doc}=model();
 win.RaafatContractPdf=new Function('window','document','URL',
  generatorSource+'\nreturn window.RaafatContractPdf;'
 )(win,doc,URL);
 const stored=JSON.stringify(s.data.leases[0]),storedInstallments=JSON.stringify(s.data.lease_installments);
 app.openLandlordPdfEditor('lease');
 assert.equal(s.modal.kind,'landlordPdfEditor');
 const draft=s.modal.printDraft;
 assert.equal(draft.number,'RA-0007');
 assert.equal(draft.firstSignatureName,'ممثل المالك');
 assert.equal(draft.secondSignatureName,'ممثل رأفت');
 assert.equal(draft.companyPhones,'07766663304 - 07866663304');
 assert.deepEqual(draft.clauses.map(x=>x.number),['1','2','3','4','5','6','7','8','9','10']);
 assert.match(draft.clauses[0].text,/1,200 \$/);
 assert.match(draft.clauses[2].text,/5 يوماً/);
 assert.match(draft.clauses[2].text,/2026\/11\/14/);
 const html=app.landlordPdfEditorHtml();
 for(const item of ['landlordPdfEditorForm','data-print-clause-add','data-print-clause-remove',
  'data-pdf-editor-preview','data-pdf-editor-download','data-print-installment-add',
  'data-print-installment-remove','name="firstSignatureName"','name="secondSignatureName"',
  'name="rentTotal"','name="graceDays"','name="propertyName"','name="landlordName"','name="landlordNationalId"']){
  assert.ok(html.includes(item),'Missing edit affordance '+item);
 }
 assert.ok(html.indexOf('الطرف الأول — يمين: المؤجر')<html.indexOf('الطرف الثاني — يسار: المستأجر'),
  'first party owner must render in RTL first/right card');
 draft.rentTotal=1500000;
 draft.clauses.push({number:'11',text:'شرط إضافي لأغراض الطباعة'});
 assert.equal(JSON.stringify(s.data.leases[0]),stored,'PDF editor cannot mutate stored lease');
 assert.equal(JSON.stringify(s.data.lease_installments),storedInstallments,'PDF editor cannot mutate stored installments');
 const generated=win.RaafatContractPdf.defaultLandlordClauses(draft);
 assert.match(generated[0].text,/1,500,000/);
 assert.match(generated[2].text,/5 يوماً/);
});
