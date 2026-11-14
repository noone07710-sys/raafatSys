import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const generatorSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

function model(){
 const root={innerHTML:''};
 const doc={title:'',querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const app=new Function('localStorage','document','crypto','createClient','window',
  appSource+'\nreturn {s,landlordContractPdfPayload,generateLandlordContractPdf,modalHtml,previewHtml,openForm,render};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'id1'},()=>{},{});
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
 return {app,s,root};
}

test('landlord contract payload maps only saved lease and roof values, excluding identity card number',()=>{
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
 assert.equal(Object.hasOwn(payload,'landlordNationalId'),false);
 assert.doesNotMatch(JSON.stringify(payload),/111111111111/);
 const dialog=app.previewHtml(original);
 assert.match(dialog,/data-landlord-pdf="lease"/);
 assert.match(dialog,/data-pdf-mode="download"/);
 assert.match(dialog,/data-pdf-mode="preview"/);
 assert.doesNotMatch(dialog,/data-action="print"/);
 app.openForm('leases',original);
 assert.match(app.modalHtml(),/تحميل عقد PDF بقالب رأفت/);
});

test('landlord PDF draws its own lease terms on the same original Photoshop A4, exactly one page',async()=>{
 const {app}=model();
 const payload=app.landlordContractPdfPayload(app.s.data.leases[0]);
 const trace={text:[],pages:0,backgrounds:0,overlays:0};
 const doc={
  baseURI:'https://example.test/raafatSys/',
  fonts:{load:async()=>[]},
  head:{appendChild(){}},
  body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const ctx={
     scale(){},translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},
     measureText(value){return {width:String(value).length*5.6}},
     fillText(value){trace.text.push(String(value))}
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
 assert.equal(trace.pages,1);
 assert.equal(trace.backgrounds,1);
 assert.equal(trace.overlays,1);
 assert.match(trace.title,/RA-0007/);
 assert.match(trace.subject,/عقد إيجار سطح/);
 for(const expected of ['عقد استئجار سطح إعلاني','مالك السطح','سطح عمارة الرافدين',
  '1,200','200','1,000','2026-11-19','2027-05-19','توقيع المالك'])
  assert.ok(trace.text.some(x=>x.includes(expected)),expected);
 assert.ok(!trace.text.some(x=>x.includes('111111111111')||x.includes('البطاقة الموحدة')));
});
