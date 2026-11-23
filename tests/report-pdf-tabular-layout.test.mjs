import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../report-files.js',import.meta.url),'utf8');
function renderer(){
 const draws=[],canvases=[];
 let pages=0;
 const document={
  fonts:{load:async()=>[]},
  head:{appendChild(){}},
  body:{appendChild(){}},
  createElement(tag){
   if(tag==='canvas'){
    const id=canvases.length;
    const canvas={
     width:0,height:0,
     getContext(){
      return {
       scale(){},fillRect(){},strokeRect(){},
       measureText(value){return {width:String(value).length*6}},
       fillText(value,x,y){draws.push({canvas:id,value:String(value),x,y})}
      };
     },
     toDataURL:()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
    };
    canvases.push(canvas);
    return canvas;
   }
   return {remove(){}};
  }
 };
 const pdfLib={PDFDocument:{create:async()=>({
  setTitle(){},setAuthor(){},setCreator(){},
  embedPng:async()=>({}),
  addPage(size){
   assert.deepEqual(size,[1191,842],'report should be landscape A3 for readable tables');
   pages++;
   return {drawImage(){}};
  },
  save:async()=>new Uint8Array([37,80,68,70,45,49,46,55])
 })}};
 const window={PDFLib:pdfLib},fetch=async()=>({arrayBuffer:async()=>new Uint8Array([137,80,78,71]).buffer});
 new Function('window','document','fetch','TextEncoder','Blob','URL','setTimeout',
  source+'\nreturn window.RaafatReportFiles;'
 )(window,document,fetch,TextEncoder,Blob,URL,()=>{});
 const report=(title,columns,rows)=>({
  title,companyName:'رأفت',generatedAt:'2026-11-23T11:00:00Z',
  sheets:[{name:'جدول التجربة',columns,rows}]
 });
 return {render:window.RaafatReportFiles.pdf,report,draws,canvases,pages:()=>pages};
}

test('PDF renders multiple records as compact table rows on ONE shared page, with RTL column headers',async()=>{
 const env=renderer(),columns=[
  {key:'customerName',label:'الزبون'},{key:'phone',label:'الهاتف'},
  {key:'siteCode',label:'رمز القطعة'},{key:'size',label:'القياس'},
  {key:'amount',label:'المبلغ',kind:'number'},
  {key:'currency',label:'العملة'}
 ];
 const rows=Array.from({length:15},(_,i)=>({
  customerName:'زبون '+(i+1),phone:'07700000000',siteCode:'A-'+(i+1),
  size:'2 × 3 متر',amount:i*10,currency:'USD'
 }));
 const file=await env.render(env.report('كشف الزبائن',columns,rows));
 assert.equal(file.type,'application/pdf');
 assert.equal(env.pages(),1,'15 normal records should share one table page, not 15 record cards');
 assert.ok(env.draws.some(x=>x.value==='الزبون'));
 assert.ok(env.draws.some(x=>x.value==='الهاتف'));
 assert.ok(env.draws.some(x=>x.value==='زبون 1'));
 assert.ok(env.draws.some(x=>x.value==='زبون 15'));
 assert.ok(env.draws.some(x=>x.value==='A-15'));
 assert.ok(env.draws.some(x=>x.value==='07700000000'));
 assert.ok(env.draws.some(x=>x.value==='عدد السجلات: 15'));
});

test('PDF splits overly wide tables into column panels with repeated customer identifier and NO lost values',async()=>{
 const env=renderer(),columns=[{key:'ownerName',label:'اسم المالك'},
  ...Array.from({length:19},(_,i)=>({key:'field'+i,label:'حقل المعلومات '+i}))];
 const rows=Array.from({length:3},(_,i)=>({
  ownerName:'مالك '+(i+1),
  ...Object.fromEntries(Array.from({length:19},(_,j)=>['field'+j,'قيمة'+i+'-'+j]))
 }));
 await env.render(env.report('كشف المالكين',columns,rows));
 assert.ok(env.pages()>1,'20-column PDF must use multiple table panels with readable column widths');
 const panelText=env.draws.filter(x=>/جدول \d+ من \d+/.test(x.value));
 assert.equal(panelText.length,env.pages(),'each panel shows the table part count');
 for(let i=0;i<19;i++){
  assert.ok(env.draws.some(x=>x.value==='قيمة2-'+i),'missing field '+i);
 }
 for(let canvas=1;canvas<env.canvases.length;canvas++){
  assert.ok(env.draws.some(x=>x.canvas===canvas&&x.value==='اسم المالك'),
   'owner identification column must repeat on every panel');
 }
});

test('PDF repeats table headings on next page and continues long notes without truncation',async()=>{
 const env=renderer();
 const words=Array.from({length:650},(_,i)=>'كلمة'+i).join(' ')+' ختام-مضمون-التقرير';
 await env.render(env.report('كشف مفصل',[
  {key:'customerName',label:'اسم الزبون'},
  {key:'notes',label:'ملاحظات طويلة'}
 ],[{customerName:'الزبون الطويل',notes:words}]));
 assert.ok(env.pages()>1,'large text should continue on more than one table page');
 assert.ok(env.draws.some(x=>x.value.includes('ختام-مضمون-التقرير')),
  'the final text of a long report cell must never be dropped');
 for(let canvas=1;canvas<env.canvases.length;canvas++){
  assert.ok(env.draws.some(x=>x.canvas===canvas&&x.value==='ملاحظات طويلة'),
   'header labels should be present on every continued page');
 }
});
