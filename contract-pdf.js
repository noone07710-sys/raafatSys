/* Raafat Sys — official customer contract PDF.
 * The uploaded Photoshop-designed PDF is copied unchanged as every page's
 * background. Only transparent, correctly shaped Arabic writing is overlaid
 * inside the white area. No customer identity-card numbers are exported.
 */
(function (scope) {
 'use strict';

 const TEMPLATE_URL=new URL('./customer-contract-template.pdf',document.baseURI).href;
 const SOURCES=[
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
 ];
 const COLOR={
  navy:'#272b43',ink:'#273449',muted:'#687487',orange:'#f49c4b',
  subtle:'#f4f5f8',subtleAlt:'#fafafb',line:'#dce0e8',white:'#ffffff'
 };
 const FONT='Cairo, Tahoma, Arial, sans-serif';
 const AREA={left:42,right:552,top:132,bottom:763};
 const SCALE=3;
 let loader=null;

 function label(value,fallback='—'){
  const s=String(value??'').trim();return s||fallback;
 }
 function number(value){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)||0)}
 function amount(value,currency){return number(value)+' '+(currency==='IQD'?'د.ع':'$')}
 function filename(value){return String(value||'RC-0000').replace(/[^a-zA-Z0-9_-]+/g,'-')}
 function loadScript(src){
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=src;script.async=true;script.crossOrigin='anonymous';
   script.onload=()=>scope.PDFLib?resolve(scope.PDFLib):reject(Error('مكتبة PDF غير متاحة'));
   script.onerror=()=>{script.remove();reject(Error('تعذّر تحميل '+src))};
   document.head.appendChild(script);
  });
 }
 async function pdfLibrary(){
  if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
  if(!loader)loader=(async()=>{
   for(const src of SOURCES){try{return await loadScript(src)}catch(e){/* alternative CDN */}}
   throw Error('تعذّر تحميل مكتبة PDF. تحقق من اتصال الإنترنت.');
  })().catch(e=>{loader=null;throw e});
  return loader;
 }
 async function templateBytes(){
  const res=await fetch(TEMPLATE_URL,{cache:'no-store'});
  if(!res.ok)throw Error('تعذّر قراءة قالب رأفت الأصلي (HTTP '+res.status+')');
  const bytes=await res.arrayBuffer();
  if(bytes.byteLength<5000||
     new TextDecoder('ascii').decode(bytes.slice(0,5))!=='%PDF-')
   throw Error('ملف القالب ليس PDF صالحاً');
  return bytes;
 }
 async function readyFont(){
  if(!document.fonts)return;
  try{await Promise.race([
   document.fonts.load('700 12px Cairo'),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Font timeout')),5500))
  ])}catch(e){/* Arial/Tahoma Arabic fallback */}
 }
 function pageCanvas(size){
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(size.width*SCALE);
  canvas.height=Math.round(size.height*SCALE);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw Error('تعذّر إنشاء مساحة الكتابة العربية');
  ctx.scale(SCALE,SCALE);ctx.direction='rtl';ctx.textBaseline='alphabetic';ctx.textAlign='right';
  return {canvas,ctx};
 }
 function setFont(ctx,size=10.8,weight=600){
  ctx.font=weight+' '+size+'px '+FONT;
  ctx.direction='rtl';
 }
 function measureLines(ctx,input,maxWidth,size=10.8,weight=600){
  setFont(ctx,size,weight);
  const out=[];
  for(const line of String(input??'').replace(/\r/g,'').split('\n')){
   const words=line.trim().split(/\s+/).filter(Boolean);
   if(!words.length){out.push('');continue}
   let current='';
   for(const word of words){
    const proposed=current?current+' '+word:word;
    if(ctx.measureText(proposed).width<=maxWidth){current=proposed;continue}
    if(current){out.push(current);current=''}
    if(ctx.measureText(word).width<=maxWidth){current=word;continue}
    let part='';
    for(const char of word){
     if(part&&ctx.measureText(part+char).width>maxWidth){
      out.push(part);part='';
     }
     part+=char;
    }
    current=part;
   }
   if(current)out.push(current);
  }
  return out.length?out:[''];
 }
 function createPainter(size,makePage,payload){
  let page=null;
  const w=AREA.right-AREA.left;
  const safeBottom=Math.min(AREA.bottom,size.height-70);
  const print=(ctx,value,x,y,pt=11,weight=600,color=COLOR.ink,align='right')=>{
   setFont(ctx,pt,weight);ctx.textAlign=align;ctx.fillStyle=color;
   ctx.fillText(String(value??''),x,y);
   ctx.textAlign='right';
  };
  const rect=(ctx,x,y,width,height,fill)=>{
   ctx.fillStyle=fill;ctx.fillRect(x,y,width,height);
  };
  const rule=(ctx,y,color=COLOR.line)=>{
   ctx.strokeStyle=color;ctx.lineWidth=.75;
   ctx.beginPath();ctx.moveTo(AREA.left,y);ctx.lineTo(AREA.right,y);ctx.stroke();
  };
  function drawPageNumber(sheet){
   print(sheet.ctx,'صفحة '+sheet.pageNumber,AREA.left+7,safeBottom+11,8.3,500,COLOR.muted,'left');
  }
  function begin(){
   if(page)return; // A contract always uses a single A4 sheet.
   page=makePage();
   page.y=AREA.top;
   const {ctx}=page;
   const onFirst=page.pageNumber===1;
   print(ctx,payload.kind==='landlord'?'عقد استئجار سطح إعلاني':onFirst?'عقد حجز مساحات إعلانية':'تابع عقد حجز المساحات الإعلانية',
    AREA.right,page.y+15,onFirst?17:15,800,COLOR.navy);
   print(ctx,label(payload.number),AREA.left+10,page.y+15,11,800,COLOR.navy,'left');
   print(ctx,'رقم العقد',AREA.left+10,page.y-1,9,600,COLOR.muted,'left');
   rule(ctx,page.y+25);
   page.y+=43;
  }
  function keep(height){
   // The document is laid out completely in logical units first, then the
   // text overlay is uniformly fitted inside the template's white area.
   // NEVER open a second page: a too-dense contract is rejected instead.
   if(!page)begin();
  }
  function section(title){
   keep(41);
   const {ctx}=page;
   page.y+=4;
   rect(ctx,AREA.right-4,page.y-1,4,21,COLOR.orange);
   print(ctx,title,AREA.right-16,page.y+15,12.3,800,COLOR.navy);
   page.y+=26;
  }
  // Cards are clean and compact, with labels above values and a gutter
  // separating RTL columns. Long entries are flowed rather than truncated.
  function fields(entries){
   const items=entries.filter(Boolean);
   const gap=9,cellWidth=(w-gap)/2;
   const prepared=items.map(({name,value})=>({
    name,lines:measureLines(page.ctx,label(value),cellWidth-24,10.6,700)
   }));
   // Exceptionally long values get their own flow block, never clipped.
   if(prepared.some(row=>row.lines.length>5)){
    for(const item of prepared)block(item.name,item.lines.join(' '));
    return;
   }
   const maxRows=Math.max(...prepared.map(x=>x.lines.length),1);
   const height=Math.max(40,22+maxRows*13);
   keep(height+5);
   const {ctx}=page,top=page.y;
   for(let i=0;i<prepared.length;i++){
    const item=prepared[i];
    const x=i===0?AREA.right-cellWidth:AREA.left;
    rect(ctx,x,top,cellWidth,height,COLOR.subtle);
    rect(ctx,x+cellWidth-3,top+10,2,12,COLOR.orange);
    print(ctx,item.name,x+cellWidth-14,top+12,8.8,600,COLOR.muted);
    let y=top+27;
    item.lines.forEach(line=>{print(ctx,line,x+cellWidth-14,y,10.6,700,COLOR.ink);y+=13});
   }
   page.y+=height+5;
  }
  function field(name,value){
   // A single entry spans the full page width and keeps long names readable.
   const lines=measureLines(page.ctx,label(value),w-28,10.7,700);
   if(lines.length>6){block(name,value);return}
   const height=Math.max(38,22+lines.length*13);
   keep(height+5);
   rect(page.ctx,AREA.left,page.y,w,height,COLOR.subtle);
   rect(page.ctx,AREA.right-3,page.y+10,2,12,COLOR.orange);
   print(page.ctx,name,AREA.right-14,page.y+12,8.8,600,COLOR.muted);
   let baseline=page.y+27;
   for(const line of lines){print(page.ctx,line,AREA.right-14,baseline,10.7,700);baseline+=13}
   page.y+=height+5;
  }
  function block(title,value){
   if(!String(value??'').trim())return;
   keep(43);
   const {ctx}=page;
   print(ctx,title,AREA.right-5,page.y+13,10,800,COLOR.navy);
   page.y+=20;
   const raw=String(value).replace(/\r/g,'');
   const lines=measureLines(ctx,raw,w-20,10.4,500);
   for(const line of lines){
    keep(17);
    print(page.ctx,line,AREA.right-10,page.y+9,10.4,500,COLOR.ink);
    page.y+=14;
   }
   page.y+=4;
  }
  function site(site,index){
   const code=label(site.code,'—'),name=label(site.name,'موقع إعلاني');
   const address=[site.governorate,site.address].map(v=>String(v||'').trim()).filter(Boolean).join('، ');
   const titleLines=measureLines(page.ctx,name,w-117,10.7,700);
   const addressLines=address?measureLines(page.ctx,address,w-117,9.6,500):[];
   // Break pathological addresses into a flow block rather than overflow the page.
   if(titleLines.length+addressLines.length>8){
    block('القطعة '+code,name+(address?' — '+address:''));return;
   }
   const height=Math.max(31,12+titleLines.length*13+addressLines.length*11);
   keep(height+4);
   const {ctx}=page,x=AREA.left,y=page.y;
   rect(ctx,x,y,w,height,index%2===0?COLOR.subtle:COLOR.subtleAlt);
   rect(ctx,AREA.right-75,y+6,60,19,COLOR.navy);
   print(ctx,code,AREA.right-45,y+20,10,800,COLOR.white,'center');
   let pos=y+13;
   for(const line of titleLines){print(ctx,line,AREA.right-91,pos,10.7,700,COLOR.ink);pos+=13}
   for(const line of addressLines){print(ctx,line,AREA.right-91,pos,9.6,500,COLOR.muted);pos+=11}
   page.y+=height+4;
  }
  function signature(){
   keep(74);
   page.y+=8;rule(page.ctx,page.y);page.y+=13;
   const half=(w-10)/2;
   const sides=[
    {x:AREA.right-8,text:'توقيع ممثل الشركة'},
    {x:AREA.left+half,text:payload.kind==='landlord'?'توقيع المالك / ممثله':'توقيع الزبون / ممثله'}
   ];
   for(const side of sides){
    print(page.ctx,side.text,side.x,page.y+4,11,700,COLOR.navy);
    print(page.ctx,'____________________',side.x,page.y+34,10,600,COLOR.muted);
   }
   page.y+=52;
  }
  function end(){
   if(!page)begin();
   // A4 is a single signed page; no page numbering is necessary.
  }
  return {begin,section,fields,field,block,site,signature,end,get current(){return page}};
 }

 async function generate(payload){
  if(!payload?.number)throw Error('احفظ العقد أولاً حتى تولّد PDF');
  const [PDFLib,bytes]=await Promise.all([pdfLibrary(),templateBytes(),readyFont()]);
  const original=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
  if(original.getPageCount()!==1)throw Error('قالب العقد الأصلي لازم يكون صفحة واحدة');
  const size=original.getPage(0).getSize();
  if(Math.abs(size.width-595.2)>7||Math.abs(size.height-841.92)>7)
   throw Error('أبعاد القالب اختلفت عن A4 الأصلي');
  const out=await PDFLib.PDFDocument.create();
  out.setTitle('عقد رأفت '+payload.number);
  out.setSubject(payload.kind==='landlord'?'عقد إيجار سطح — '+label(payload.landlordName):'عقد إعلان — '+label(payload.customerName));
  out.setCreator('Raafat Sys');
  // Measure the entire agreement first. Never create a second A4 page.
  // A small reduction of vertical gaps keeps common contracts comfortably legible.
  function renderContent(painter){
   painter.begin();
   if(payload.kind==='landlord'){
    painter.section('أطراف عقد استئجار السطح');
    painter.fields([
     {name:'الطرف الأول — المستأجر',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'},
     {name:'الطرف الثاني — المالك',value:payload.landlordName}
    ]);
    painter.fields([
     {name:'هاتف المالك',value:payload.landlordPhone},
     {name:'عنوان المالك',value:payload.landlordAddress}
    ]);
    painter.fields([
     {name:'ممثل الشركة',value:payload.companyRepresentative},
     {name:'ممثل المالك',value:payload.landlordRepresentative}
    ]);
    painter.section('السطح والعقار المستأجر');
    painter.field('اسم السطح / البناية',payload.propertyName);
    painter.fields([
     {name:'الطول × العرض',value:payload.dimensions},
     {name:'المساحة الإجمالية',value:label(payload.area)+' م²'}
    ]);
    painter.fields([
     {name:'عدد المساحات',value:payload.quantity},
     {name:'المحافظة',value:payload.governorate}
    ]);
    painter.section('مدة العقد والمبالغ');
    painter.fields([
     {name:'تاريخ بداية الإيجار',value:payload.startDate},
     {name:'تاريخ نهاية الإيجار',value:payload.endDate}
    ]);
    painter.fields([
     {name:'دورية دفع الإيجار',value:payload.paymentFrequency},
     {name:'فترة السماح',value:label(payload.graceDays)+' يوم'}
    ]);
    painter.fields([
     {name:'الإيجار الإجمالي',value:amount(payload.rentTotal,payload.currency)},
     {name:'المبلغ المقدم',value:amount(payload.advanceAmount,payload.currency)}
    ]);
    painter.field('المبلغ المتبقي بعد المقدم',amount(payload.remainingAfterAdvance,payload.currency));
    painter.section('جدول أقساط الإيجار');
    if(Array.isArray(payload.installments)&&payload.installments.length){
     for(let i=0;i<payload.installments.length;i+=2){
      painter.fields(payload.installments.slice(i,i+2).map((item,j)=>({
       name:'القسط '+String(i+j+1).padStart(4,'0')+' — '+label(item.dueDate),
       value:amount(item.amount,payload.currency)
      })));
     }
    }else painter.block('الأقساط','لا توجد أقساط مجدولة لهذا العقد.');
    if(payload.notes){
     painter.section('الملاحظات والشروط المسجلة');
     painter.block('ملاحظات عقد الإيجار',payload.notes);
    }
    painter.signature();
    painter.end();
    return;
   }
   painter.section('أطراف العقد وبيانات التواصل');
   painter.fields([
    {name:'الطرف الأول',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'},
    {name:'الطرف الثاني — الزبون',value:payload.customerName}
   ]);
   painter.fields([
    {name:'هاتف الزبون',value:payload.customerPhone},
    {name:'ممثل الزبون',value:payload.customerRepresentative}
   ]);
   if(payload.companyRepresentative&&payload.companyRepresentative!=='—')
    painter.field('ممثل الشركة',payload.companyRepresentative);

   painter.section('بيانات الحملة الإعلانية');
   painter.fields([
    {name:'اسم الحملة',value:payload.campaignTitle},
    {name:'الباقة الإعلانية',value:payload.packageName}
   ]);
   painter.fields([
    {name:'عدد القطع',value:payload.quantity},
    {name:'مدة الحجز',value:label(payload.months)+' أشهر'}
   ]);
   painter.fields([
    {name:'تاريخ البداية',value:payload.startDate},
    {name:'تاريخ النهاية',value:payload.endDate}
   ]);
   painter.fields([
    {name:'قياسات الإعلان',value:payload.dimensions},
    {name:'المساحة م²',value:payload.area}
   ]);
   painter.field('القيمة الإجمالية المتفق عليها',amount(payload.amount,payload.currency));

   painter.section('القطع والمواقع الإعلانية');
   if(Array.isArray(payload.sites)&&payload.sites.length){
    for(let i=0;i<payload.sites.length;i+=2){
     const items=payload.sites.slice(i,i+2).map(site=>({
      name:label(site.code,'—')+' — '+label(site.name,'موقع إعلاني'),
      value:[site.governorate,site.address].filter(Boolean).join('، ')||'—'
     }));
     painter.fields(items);
    }
   }else painter.block('المواقع','لا توجد قطع محددة بالرموز ضمن سجل العقد.');
   if(payload.additionalLocations)painter.block('مواقع إضافية',payload.additionalLocations);

   painter.section('المواصفات والشروط والملاحظات');
   if(payload.specifications)painter.block('مواصفات الإعلان',payload.specifications);
   if(payload.campaignNotes)painter.block('ملاحظات الحملة',payload.campaignNotes);
   painter.block('الشروط المتفق عليها',payload.terms||'لم تُسجّل شروط إضافية ضمن العقد.');
   if(payload.notes)painter.block('ملاحظات العقد',payload.notes);
   painter.signature();
   painter.end();
  }

  const measurement=pageCanvas(size);
  const measurePainter=createPainter(size,()=>({...measurement,pageNumber:1}),payload);
  renderContent(measurePainter);
  const naturalHeight=Math.max(1,measurePainter.current.y-AREA.top);
  const availableHeight=Math.min(AREA.bottom,size.height-70)-AREA.top;
  const fit=Math.min(1,availableHeight/naturalHeight);
  // Readability is more important than squeezing a legal agreement into
  // unreadable microscopic text. In that case, ask to shorten the agreement.
  if(fit<0.64)throw Error('تفاصيل العقد كثيرة ولا تكفي صفحة A4 واحدة بخط واضح. اختصر الملاحظات أو الشروط أو عدد تفاصيل المواقع ثم أعد التحميل.');
  const overlay=pageCanvas(size);
  const middle=(AREA.left+AREA.right)/2;
  overlay.ctx.translate(middle*(1-fit),AREA.top*(1-fit));
  overlay.ctx.scale(fit,fit);
  const painter=createPainter(size,()=>({...overlay,pageNumber:1}),payload);
  renderContent(painter);
  const pngUri=overlay.canvas.toDataURL('image/png');
  const pngData=await fetch(pngUri).then(res=>res.arrayBuffer());
  const image=await out.embedPng(pngData);
  const [background]=await out.copyPages(original,[0]);
  out.addPage(background).drawImage(image,{x:0,y:0,width:size.width,height:size.height});
  return new Blob([await out.save({useObjectStreams:false})],{type:'application/pdf'});
 }
 function saveBlob(blob,file){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
 }
 async function download(payload){
  const blob=await generate(payload);
  saveBlob(blob,'Raafat-Contract-'+filename(payload.number)+'.pdf');
  return blob;
 }
 async function preview(payload,win){
  const blob=await generate(payload);
  const url=URL.createObjectURL(blob);
  if(win&&!win.closed){win.location.replace(url);return blob}
  saveBlob(blob,'Raafat-Contract-'+filename(payload.number)+'.pdf');
  return blob;
 }
 scope.RaafatContractPdf=Object.freeze({generate,download,preview,TEMPLATE_URL});
})(window);
