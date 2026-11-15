/* Raafat | A5 official payroll payment receipt (half A4).
 * No editable employee signature is synthesized. Both signatures remain blank
 * to be signed by the real receiver and disburser on a printed receipt.
 */
(function(scope){
 'use strict';
 const W=420.94,H=595.28,SCALE=2.5;
 const FONT='Cairo, Tahoma, Arial, sans-serif';
 const PDF_SOURCES=[
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
 ];
 let libLoading=null;
 function tidy(value){return String(value??'').trim()||'—'}
 function num(value){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)||0)}
 function filename(value){return tidy(value).normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g,'-')
   .replace(/[^\p{L}\p{N}._ -]/gu,'-').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,80)}
 async function library(){
  if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
  if(!libLoading)libLoading=(async()=>{
   for(const src of PDF_SOURCES){
    try{
     await new Promise((resolve,reject)=>{
      const tag=document.createElement('script');tag.src=src;tag.async=true;tag.crossOrigin='anonymous';
      tag.onload=resolve;tag.onerror=()=>{tag.remove();reject(Error('تعذر تحميل PDF'))};
      document.head.appendChild(tag);
     });
     if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
    }catch(_){}
   }
   throw Error('تعذر تحميل مكتبة PDF. يرجى التأكد من اتصال الإنترنت.');
  })().catch(e=>{libLoading=null;throw e});
  return libLoading;
 }
 function paint(receipt){
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(W*SCALE);canvas.height=Math.round(H*SCALE);
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('تعذر تجهيز وصل الراتب للطباعة.');
  ctx.scale(SCALE,SCALE);ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='alphabetic';
  const line=(x1,y1,x2,y2,color='#c8d7d9',width=1)=>{
   ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  };
  const rect=(x,y,w,h,fill,r=0)=>{
   ctx.fillStyle=fill;
   if(r&&typeof ctx.roundRect==='function'){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
   else ctx.fillRect(x,y,w,h);
  };
  const write=(value,x,y,size=11,weight=600,color='#273f4b',align='right')=>{
   ctx.font=weight+' '+size+'px '+FONT;ctx.fillStyle=color;ctx.textAlign=align;
   ctx.fillText(tidy(value),x,y);ctx.textAlign='right';
  };
  const field=(title,value,y)=>{
   write(title,W-38,y,10,600,'#6b7e86');
   write(value,W-39,y+24,13.5,700,'#203c4a');
   line(36,y+34,W-36,y+34);
  };
  rect(0,0,W,H,'#fff');
  rect(0,0,W,11,'#155b5f');
  rect(30,27,W-60,95,'#f1f7f7',13);
  write(tidy(receipt.companyName||'شركة رأفت للدعاية والإعلان والتجارة العامة'),W/2,55,13,800,'#18545a','center');
  write('وصل استلام راتب',W/2,85,20,800,'#1e4854','center');
  write('PAYROLL RECEIPT  •  A5',W/2,105,8,500,'#607e87','center');
  const number=tidy(receipt.receiptNumber);
  write('رقم الوصل: '+number,W-35,151,11,700,'#204b59');
  write('التاريخ: '+tidy(receipt.paidAt),35,151,10,600,'#405765','left');
  line(35,164,W-35,164);
  field('اسم الموظف المستلم',receipt.employeeName,191);
  field('المسمّى الوظيفي / القسم',[receipt.jobTitle,receipt.department].filter(Boolean).join(' — '),253);
  field('راتب شهر',receipt.salaryMonth,315);
  rect(31,357,W-62,72,'#eaf4f2',11);
  write('المبلغ المستلم',W-47,381,11,600,'#37646c');
  write(num(receipt.amount)+' '+(receipt.currency==='IQD'?'دينار عراقي':'دولار أمريكي'),
   W-47,414,18,800,'#175961');
  field('تم صرف المبلغ بواسطة',receipt.paidBy,457);
  write('أقرّ أنا الموقّع أدناه باستلام مبلغ الراتب الموضّح أعلاه.',W/2,516,9,600,'#59717b','center');
  line(W/2+12,558,W-37,558,'#90aeb0',1);
  line(37,558,W/2-12,558,'#90aeb0',1);
  write('توقيع الموظف المستلم',W-36,575,9,700,'#344e59');
  write('توقيع مسؤول الصرف',W/2-14,575,9,700,'#344e59');
  return canvas;
 }
 async function generate(payload){
  if(!payload?.receiptNumber||!payload?.employeeName||!(Number(payload.amount)>0))
   throw Error('بيانات وصل صرف الراتب غير مكتملة.');
  try{await document.fonts?.load('700 14px Cairo')}catch(_){}
  const pdfLib=await library();
  const pdf=await pdfLib.PDFDocument.create();
  pdf.setTitle('وصل راتب '+tidy(payload.receiptNumber)+' — '+tidy(payload.employeeName));
  pdf.setCreator('شركة رأفت');
  const page=pdf.addPage([W,H]);
  const canvas=paint(payload);
  const png=await pdf.embedPng(await fetch(canvas.toDataURL('image/png')).then(r=>r.arrayBuffer()));
  page.drawImage(png,{x:0,y:0,width:W,height:H});
  return new Blob([await pdf.save({useObjectStreams:false})],{type:'application/pdf'});
 }
 async function download(payload){
  const blob=await generate(payload);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='وصل-راتب-'+filename(payload.employeeName)+'-'+filename(payload.receiptNumber)+'.pdf';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
  return blob;
 }
 scope.RaafatPayrollReceipt=Object.freeze({generate,download,paint,size:[W,H]});
})(window);
