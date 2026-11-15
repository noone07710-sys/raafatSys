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
 function amount(value,currency){return number(value)+' '+(currency==='IQD'?'د.ع':'
 function filename(value){
  // Preserve Arabic names while stripping unsafe filename symbols.
  return String(value||'غير-مسمى').normalize('NFC')
   .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g,'-')
   .replace(/[^\p{L}\p{N}._ -]+/gu,'-')
   .replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[ .-]+|[ .-]+$/g,'').slice(0,90)||'غير-مسمى';
 }
 function contractFileName(payload){
  const person=payload.kind==='landlord'?payload.landlordName:payload.customerName;
  const phone=payload.kind==='landlord'?payload.landlordPhone:payload.customerPhone;
  const prefix=payload.kind==='landlord'?'عقد-سطح-':'عقد-زبون-';
  // Include the person's phone (when available) and the official contract reference.
  return prefix+filename(person)+(String(phone||'').trim()&&phone!=='—'?'-'+filename(phone):'')+
   '-'+filename(payload.number)+'.pdf';
 }
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
   if(page)return; // This painter owns one template-backed contract page.
   page=makePage();
   page.y=AREA.top;
   const {ctx}=page;
   const onFirst=page.pageNumber===1;
   print(ctx,payload.kind==='landlord'?'عقد استئجار سطح إعلاني':onFirst?'عقد حجز مساحات إعلانية':'تابع عقد حجز المساحات الإعلانية',
    AREA.right,page.y+15,onFirst?17:15,800,COLOR.navy);
   // The same contract reference is displayed at the top of both customer sheets.
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

  // The code stays on the right; names and addresses occupy distinct text lanes.
  // Their heights are measured before drawing, so no address can paint on a title.
  function compactSites(sites){
   const items=Array.isArray(sites)?sites:[];
   if(!items.length){block('المواقع الإعلانية','لا توجد قطع محددة بالرموز ضمن سجل العقد.');return}
   const gap=7,cellWidth=(w-gap)/2,large=items.length>14,medium=items.length>7;
   const nameSize=large?7.7:medium?8.3:9;
   const addressSize=large?6.9:medium?7.4:7.9;
   const lineGap=large?9.1:medium?9.8:10.4;
   const addrGap=large?8.0:8.8;
   const prepared=items.map((item,i)=>{
    const code=label(item.code,'—');
    const name=label(item.name,'موقع إعلاني');
    const address=[item.governorate,item.address].filter(Boolean).join('، ');
    // Reserve the rightmost 51 points for the code badge on the first title line.
    const titleLines=measureLines(page.ctx,name,cellWidth-67,nameSize,700);
    const addressLines=address?measureLines(page.ctx,address,cellWidth-20,addressSize,500):[];
    const nameBottom=16+(titleLines.length-1)*lineGap;
    const addressBaseline=Math.max(31,nameBottom+12);
    const bottom=addressLines.length?addressBaseline+(addressLines.length-1)*addrGap+8:
      Math.max(27,nameBottom+6);
    return {code,titleLines,addressLines,addressBaseline,height:bottom+4,i};
   });
   for(let i=0;i<prepared.length;i+=2){
    const row=prepared.slice(i,i+2);
    const height=Math.max(34,...row.map(item=>item.height));
    keep(height+3);
    const y=page.y,ctx=page.ctx;
    row.forEach((item,index)=>{
     const x=index===0?AREA.right-cellWidth:AREA.left;
     rect(ctx,x,y,cellWidth,height,item.i%4<2?COLOR.subtle:COLOR.subtleAlt);
     const badgeX=x+cellWidth-49;
     rect(ctx,badgeX,y+5,41,17,COLOR.navy);
     setFont(ctx,7.8,800);
     const codeWidth=ctx.measureText(item.code).width;
     const codeSize=Math.max(5.3,Math.min(7.8,7.8*35/Math.max(35,codeWidth)));
     print(ctx,item.code,badgeX+20.5,y+17,codeSize,800,COLOR.white,'center');
     // Names are right-aligned to a point left of the badge, never under it.
     const nameX=x+cellWidth-59;
     item.titleLines.forEach((line,j)=>print(ctx,line,nameX,y+16+j*lineGap,nameSize,700,COLOR.ink));
     // Address always starts strictly below the final title line and badge.
     const addressX=x+cellWidth-10;
     item.addressLines.forEach((line,j)=>print(ctx,line,addressX,y+item.addressBaseline+j*addrGap,addressSize,500,COLOR.muted));
    });
    page.y+=height+3;
   }
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
  return {begin,section,fields,field,block,site,compactSites,signature,end,get current(){return page}};
 }


 const DEFAULT_CUSTOMER_CLAUSES=Object.freeze([
  {number:'1',text:'تتعهد شركتنا بحماية إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'},
  {number:'2',text:'تتعهد شركتنا بتوفير إنارة الكابينة وإدامتها وحسب الحاجة.'},
  {number:'3',text:'في حالة تلف إعلان المشترك من قبل العناصر المجهولة تتعهد الشركة بإعادة تصميم وطبع إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'},
  {number:'4',text:'تتعهد الشركة بترويج إعلان المشترك على مشروع الشاشات العملاقة ولمدة 30 يوم وبسعر 25$ فقط من تاريخ التشغيل التابع لنا.'},
  {number:'5',text:'تتعهد الشركة بترويج إعلان المشترك على مواقع التواصل الاجتماعي التابعة لنا.'},
  {number:'6',text:'يتعهد المشترك بدفع جميع أجور الإعلان الخاصة به.'},
  {number:'7',text:'ترفع جميع الإعلانات التجارية في وقت الانتخابات المحددة ويتم إعادتها من قبلنا بعد انتهاء فترة الانتخابات.'},
  {number:'8',text:'يتعهد المشترك بتصميم وتبديل الإعلان الخاص به كل ستة أشهر ويكون مع الشركة حصراً.'},
  {number:'9',text:'حرر هذا العقد من نسختين ووقعه الطرفان بعد الاطلاع على البنود المدرجة أعلاه.'}
 ]);


 function customerClauses(payload){
  const clauses=DEFAULT_CUSTOMER_CLAUSES.map(clause=>({...clause}));
  // The fixed optional 25 USD promotional fee is printed in the same currency
  // as the agreement when a valid company exchange-rate snapshot is supplied.
  const rate=Number(payload?.exchangeRate);
  if(payload?.currency==='IQD'&&Number.isFinite(rate)&&rate>0){
   const fee=number(Math.round(25*rate))+' دينار عراقي';
   for(const clause of clauses)clause.text=clause.text.replace('25$',fee);
  }
  return clauses;
 }
 function landlordPeriodLabel(start,end){
  const a=Date.parse(String(start||'')+'T00:00:00Z'),b=Date.parse(String(end||'')+'T00:00:00Z');
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return 'المدة المحددة في هذا العقد';
  const days=Math.round((b-a)/86400000)+1;
  if(days>=358&&days<=372)return 'سنة واحدة';
  const months=Math.round(days/30.44);
  return months>0?months+' شهراً':'المدة المحددة في هذا العقد';
 }
 function landlordClauses(payload){
  const rent=amountInWords(payload.rentTotal,payload.currency);
  const days=Math.max(0,Number(payload.graceDays)||0);
  const grace=days===14?'أسبوعان':days===7?'أسبوع واحد':days+' يوماً';
  const start=label(payload.startDate).replace(/-/g,'/');
  const end=label(payload.endDate).replace(/-/g,'/');
  return [
   {number:'1',text:'يلتزم الطرف الثاني بدفع بدل الإيجار المتفق عليه وقدره '+rent+' وفق جدول الدفعات المثبت في العقد.'},
   {number:'2',text:'مدة العقد خمس سنوات قابلة للتجديد، ويلتزم الطرف الثاني بدفع إيجار كل سنة مقدماً للطرف الأول.'},
   {number:'3',text:'يقدم الطرف الأول فترة سماح مدتها '+grace+' للمواد الإعلانية ويبدأ الإيجار بتاريخ '+start+' إلى '+end+'.'},
   {number:'4',text:'يتعهد الطرف الثاني في حالة اضطراره لفسخ العقد لظروف قاهرة بأن يزيل الإعلان على نفقته الخاصة.'},
   {number:'5',text:'لا يحق للطرف الأول فسخ هذا العقد قبل موعد انتهائه.'},
   {number:'6',text:'لا يجوز لأي طرف من الأطراف خرق بنود العقد، وفي حالة الخرق يلجأ الطرفان إلى المحاكم العراقية للبت بالخلاف.'},
   {number:'7',text:'على الطرف الثاني عدم وضع صور نساء أو خمور أو سجائر أو صور مخلة بالآداب.'},
   {number:'8',text:'يتعهد الطرف الأول بتسهيل مهام الطرف الثاني لتركيب الهيكل ولتغيير المواد الإعلانية بحسب ما تدعو إليه الحاجة، وفي أي وقت كان غير أوقات الليل بعد الساعة 10 ليلاً ومنع التجول.'},
   {number:'9',text:'للطرف الثاني الأحقية بتجديد العقد من غيره، علماً أن الهيكل الحديدي تابع للشركة (الطرف الثاني).'},
   {number:'10',text:'أي تغيير على بنود هذا العقد يتطلب موافقة الطرف الأول والطرف الثاني، ويُحرَّر العقد بنسخ جديدة موقعة من الطرفين.'}
  ];
 }

 function drawTermsSheet(sheet,payload){
  const ctx=sheet.ctx,width=AREA.right-AREA.left;
  const print=(value,x,y,size=10,weight=600,color=COLOR.ink,align='right')=>{
   setFont(ctx,size,weight);ctx.textAlign=align;ctx.fillStyle=color;
   ctx.fillText(String(value??''),x,y);ctx.textAlign='right';
  };
  const clauses=Array.isArray(payload.clauses)?payload.clauses:
   payload.kind==='landlord'?landlordClauses(payload):customerClauses(payload);
  let y=AREA.top+10;
  // Exactly the same editable contract number as the page-one header.
  print('رقم العقد',AREA.left+10,AREA.top-1,9,600,COLOR.muted,'left');
  print(label(payload.number),AREA.left+10,AREA.top+15,11,800,COLOR.navy,'left');
  print('شروط العقد كالتالي:',AREA.right-12,y+22,17.5,800,'#b8323b');
  y+=47;
  const clauseSize=clauses.length>10?10.3:11.2,leading=clauseSize+4.8;
  for(const [index,clause] of clauses.entries()){
   // Source order is authoritative; numbering never skips 3, even after edits.
   const number=String(index+1);
   const lines=measureLines(ctx,String(clause.text||''),width-49,clauseSize,650);
   const height=Math.max(24,lines.length*leading+6);
   print(number+'.',AREA.right-8,y+clauseSize+2,11.6,800,'#bd3941');
   lines.forEach((line,i)=>print(line,AREA.right-37,y+clauseSize+2+i*leading,clauseSize,650));
   y+=height+3;
  }
  const sections=payload.kind==='landlord'?
   [['شروط خاصة إضافية',payload.extraTerms],['ملاحظات عقد الإيجار',payload.notes]]:
   [['شروط خاصة',payload.extraTerms||payload.terms],
    ['ملاحظات الحملة',payload.campaignNotes],
    ['ملاحظات العقد',payload.notes]];
  for(const [heading,value] of sections){
   if(!String(value||'').trim())continue;
   y+=7;
   print(heading,AREA.right-12,y+10,10.6,800,COLOR.navy);y+=17;
   const lines=measureLines(ctx,value,width-28,9.4,500);
   for(const line of lines){print(line,AREA.right-16,y+9,9.4,500,COLOR.ink);y+=12}
  }
  // The signature table is on the terms page, never on the first contract.
  const signatureTop=Math.max(AREA.top+493,y+20);
  const middle=(AREA.left+AREA.right)/2,half=width/2;
  ctx.strokeStyle=COLOR.line;ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(AREA.left,signatureTop-10);ctx.lineTo(AREA.right,signatureTop-10);ctx.stroke();
  const left=AREA.left+half-17,right=AREA.right-10;
  // The label, representative and date are fully editable per party.
  // First party (right) = owner for leases / Raafat for customer contracts.
  // Second party (left) = Raafat for leases / customer for customer contracts.
  const blocks=[
   {x:right,label:label(payload.firstSignatureLabel,payload.kind==='landlord'?'الطرف الأول — مالك السطح':'الطرف الأول — ممثل الشركة'),
    name:label(payload.firstSignatureName,payload.kind==='landlord'?payload.landlordRepresentative:payload.companyRepresentative),
    date:label(payload.firstSignatureDate,payload.startDate)},
   {x:left,label:label(payload.secondSignatureLabel,payload.kind==='landlord'?'الطرف الثاني — شركة رأفت':'الطرف الثاني — الزبون'),
    name:label(payload.secondSignatureName,payload.kind==='landlord'?payload.companyRepresentative:payload.customerRepresentative||payload.customerName),
    date:label(payload.secondSignatureDate,payload.startDate)}
  ];
  for(const item of blocks){
   print(item.label,item.x,signatureTop+10,10.8,800,COLOR.navy);
   print('الاسم: '+item.name,item.x,signatureTop+33,9.8,600,COLOR.ink);
   print('التاريخ: '+item.date,item.x,signatureTop+54,9.8,600,COLOR.ink);
   print('التوقيع: ___________________',item.x,signatureTop+77,9.5,600,COLOR.muted);
  }
  return signatureTop+90;
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
  // Both customer and landlord agreements use two copies of the original
  // Photoshop template: agreement on page 1, numbered legal terms on page 2.
  function renderContent(painter){
   painter.begin();
   if(payload.kind==='landlord'){
    painter.section('أطراف عقد إيجار السطح');
    painter.fields([
     {name:'الطرف الأول — المؤجر (المالك)',value:payload.landlordName},
     {name:'الطرف الثاني — المستأجر',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'}
    ]);
    painter.fields([
     {name:'هاتف المالك',value:payload.landlordPhone},
     {name:'هاتف الشركة',value:label(payload.companyPhones,'07766663304 - 07866663304')}
    ]);
    painter.fields([
     {name:'ممثل المالك',value:payload.landlordRepresentative},
     {name:'المدير المفوض',value:payload.companyRepresentative}
    ]);
    painter.field('محافظة وعنوان المالك',payload.landlordAddress);
    painter.section('السطح والعقار المؤجر');
    painter.field('اسم السطح / البناية',payload.propertyName);
    painter.fields([
     {name:'الطول × العرض',value:payload.dimensions},
     {name:'المساحة الإجمالية',value:label(payload.area)+' م²'}
    ]);
    painter.fields([
     {name:'عدد المساحات',value:payload.quantity},
     {name:'المحافظة',value:payload.governorate}
    ]);
    painter.section('مدة العقد والأجرة');
    painter.fields([
     {name:'تاريخ بداية الإيجار',value:payload.startDate},
     {name:'تاريخ نهاية الإيجار',value:payload.endDate}
    ]);
    painter.fields([
     {name:'دورية دفع الإيجار',value:payload.paymentFrequency},
     {name:'فترة السماح',value:label(payload.graceDays)+' يوم'}
    ]);
    painter.fields([
     {name:'الإيجار الإجمالي',value:amountInWords(payload.rentTotal,payload.currency)},
     {name:'المبلغ المقدم',value:amount(payload.advanceAmount,payload.currency)}
    ]);
    painter.field('المبلغ المتبقي بعد المقدم',amountInWords(payload.remainingAfterAdvance,payload.currency));
    painter.section('جدول أقساط الإيجار');
    if(Array.isArray(payload.installments)&&payload.installments.length){
     for(let i=0;i<payload.installments.length;i+=2){
      painter.fields(payload.installments.slice(i,i+2).map((item,j)=>({
       name:'القسط '+String(i+j+1).padStart(4,'0')+' — '+label(item.dueDate),
       value:amount(item.amount,payload.currency)
      })));
     }
    }else painter.block('الأقساط','لا توجد أقساط مجدولة لهذا العقد.');
    // No notes, legal conditions or signatures on this agreement sheet.
    painter.end();
    return;
   }
   painter.section('أطراف العقد وبيانات التواصل');
   // Party one (company) occupies the right cell of every row;
   // party two (customer) occupies the left cell, including representatives.
   painter.fields([
    {name:'الطرف الأول — شركة رأفت',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'},
    {name:'الطرف الثاني — الزبون',value:payload.customerName}
   ]);
   painter.fields([
    {name:'هاتف الشركة',value:label(payload.companyPhones,'07766663304 - 07866663304')},
    {name:'هاتف الزبون',value:payload.customerPhone}
   ]);
   painter.fields([
    {name:'المدير المفوض',value:payload.companyRepresentative},
    {name:'ممثل الزبون',value:payload.customerRepresentative}
   ]);

   painter.section('تفاصيل الحملة الإعلانية');
   painter.fields([
    {name:'الحملة الإعلانية',value:payload.campaignTitle},
    {name:'الباقة',value:payload.packageName}
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
    {name:'القياسات',value:payload.dimensions},
    {name:'المساحة م²',value:payload.area}
   ]);
   painter.field('القيمة الإجمالية المتفق عليها',amountInWords(payload.amount,payload.currency));
   // Specifications belong to the agreed advertising scope on the contract
   // sheet, not to the legal clauses on page two.
   if(String(payload.specifications||'').trim())
    painter.block('مواصفات الإعلان',payload.specifications);

   painter.section('القطع والمواقع الإعلانية');
   painter.compactSites(payload.sites);
   if(payload.additionalLocations)painter.block('مواقع إضافية',payload.additionalLocations);
   // Customer legal terms, signatures and general notes remain on page 2 only.
   painter.end();
  }

  const measurement=pageCanvas(size);
  const measurePainter=createPainter(size,()=>({...measurement,pageNumber:1}),payload);
  renderContent(measurePainter);
  const naturalHeight=Math.max(1,measurePainter.current.y-AREA.top);
  const availableHeight=Math.min(AREA.bottom,size.height-70)-AREA.top;
  const fit=Math.min(1,availableHeight/naturalHeight);
  if(fit<0.65)throw Error('تفاصيل القطع والمواقع الإعلانية لا تكفي صفحة A4 الأولى بخط مقروء. اختصر العناوين الطويلة أو قسّم قائمة المواقع.');
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

  {
   // Page two is a fresh copy of the company's *original* PDF template
   // for leases and customer agreements alike; no illustrative screenshots.
   const measureTerms=pageCanvas(size);
   const naturalTermsBottom=drawTermsSheet(measureTerms,payload);
   const termsHeight=naturalTermsBottom-AREA.top;
   const fitTerms=Math.min(1,availableHeight/Math.max(1,termsHeight));
   if(fitTerms<0.7)throw Error('الشروط والملاحظات أطول من المساحة المتاحة في صفحة الشروط. اختصر النص قبل الطباعة.');
   const termsOverlay=pageCanvas(size);
   termsOverlay.ctx.translate(middle*(1-fitTerms),AREA.top*(1-fitTerms));
   termsOverlay.ctx.scale(fitTerms,fitTerms);
   drawTermsSheet(termsOverlay,payload);
   const termsUri=termsOverlay.canvas.toDataURL('image/png');
   const termsData=await fetch(termsUri).then(res=>res.arrayBuffer());
   const termsImage=await out.embedPng(termsData);
   const [secondOriginal]=await out.copyPages(original,[0]);
   out.addPage(secondOriginal).drawImage(termsImage,{x:0,y:0,width:size.width,height:size.height});
  }
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
  saveBlob(blob,contractFileName(payload));
  return blob;
 }
 async function preview(payload,win){
  const blob=await generate(payload);
  const url=URL.createObjectURL(blob);
  if(win&&!win.closed){win.location.replace(url);return blob}
  saveBlob(blob,contractFileName(payload));
  return blob;
 }
 scope.RaafatContractPdf=Object.freeze({generate,download,preview,contractFileName,TEMPLATE_URL,
  amountInWords,defaultClauses:DEFAULT_CUSTOMER_CLAUSES,defaultCustomerClauses:customerClauses,defaultLandlordClauses:landlordClauses});
})(window);
)}
 // Spell out figures without changing the underlying contract balances.
 function arabicTriplet(value){
  const units=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'];
  const teens=['عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hundreds=['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة'];
  const n=Math.floor(value),parts=[],h=Math.floor(n/100),r=n%100;
  if(h)parts.push(hundreds[h]);
  if(r>=10&&r<20)parts.push(teens[r-10]);
  else if(r>=20)parts.push(r%10?units[r%10]+' و'+tens[Math.floor(r/10)]:tens[Math.floor(r/10)]);
  else if(r)parts.push(units[r]);
  return parts.join(' و');
 }
 function arabicInteger(value){
  if(!Number.isSafeInteger(value)||value<0)throw Error('قيمة المبلغ خارج مجال التحويل إلى كتابة عربية');
  if(value===0)return 'صفر';
  const groups=[
   null,
   {one:'ألف',two:'ألفان',plural:'آلاف'},
   {one:'مليون',two:'مليونان',plural:'ملايين'},
   {one:'مليار',two:'ملياران',plural:'مليارات'},
   {one:'تريليون',two:'تريليونان',plural:'تريليونات'}
  ];
  const chunks=[];let n=value,index=0;
  while(n>0){
   const chunk=n%1000;
   if(chunk){
    const group=groups[index];
    if(index===0)chunks.unshift(arabicTriplet(chunk));
    else if(!group)throw Error('المبلغ أكبر من الحد المدعوم للكتابة العربية');
    else if(chunk===1)chunks.unshift(group.one);
    else if(chunk===2)chunks.unshift(group.two);
    else chunks.unshift(arabicTriplet(chunk)+' '+(chunk<=10?group.plural:group.one));
   }
   n=Math.floor(n/1000);index++;
  }
  return chunks.join(' و');
 }
 function amountInWords(value,currency){
  const numeric=Number(value);
  if(!Number.isFinite(numeric)||numeric<0)throw Error('مبلغ العقد غير صالح للكتابة');
  const minorUnit=currency==='USD'?100:1000;
  const scaled=Math.round(numeric*minorUnit);
  const whole=Math.floor(scaled/minorUnit),fraction=scaled%minorUnit;
  const name=currency==='USD'?'دولار أمريكي':'دينار عراقي';
  let words=arabicInteger(whole)+' '+name;
  if(fraction)words+=' و'+arabicInteger(fraction)+(currency==='USD'?' سنت':' فلس');
  return amount(numeric,currency)+' ('+words+' لا غير)';
 }
 function filename(value){
  // Preserve Arabic names while stripping unsafe filename symbols.
  return String(value||'غير-مسمى').normalize('NFC')
   .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g,'-')
   .replace(/[^\p{L}\p{N}._ -]+/gu,'-')
   .replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[ .-]+|[ .-]+$/g,'').slice(0,90)||'غير-مسمى';
 }
 function contractFileName(payload){
  const person=payload.kind==='landlord'?payload.landlordName:payload.customerName;
  const phone=payload.kind==='landlord'?payload.landlordPhone:payload.customerPhone;
  const prefix=payload.kind==='landlord'?'عقد-سطح-':'عقد-زبون-';
  // Include the person's phone (when available) and the official contract reference.
  return prefix+filename(person)+(String(phone||'').trim()&&phone!=='—'?'-'+filename(phone):'')+
   '-'+filename(payload.number)+'.pdf';
 }
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
   if(page)return; // This painter owns one template-backed contract page.
   page=makePage();
   page.y=AREA.top;
   const {ctx}=page;
   const onFirst=page.pageNumber===1;
   print(ctx,payload.kind==='landlord'?'عقد استئجار سطح إعلاني':onFirst?'عقد حجز مساحات إعلانية':'تابع عقد حجز المساحات الإعلانية',
    AREA.right,page.y+15,onFirst?17:15,800,COLOR.navy);
   // The same contract reference is displayed at the top of both customer sheets.
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

  // The code stays on the right; names and addresses occupy distinct text lanes.
  // Their heights are measured before drawing, so no address can paint on a title.
  function compactSites(sites){
   const items=Array.isArray(sites)?sites:[];
   if(!items.length){block('المواقع الإعلانية','لا توجد قطع محددة بالرموز ضمن سجل العقد.');return}
   const gap=7,cellWidth=(w-gap)/2,large=items.length>14,medium=items.length>7;
   const nameSize=large?7.7:medium?8.3:9;
   const addressSize=large?6.9:medium?7.4:7.9;
   const lineGap=large?9.1:medium?9.8:10.4;
   const addrGap=large?8.0:8.8;
   const prepared=items.map((item,i)=>{
    const code=label(item.code,'—');
    const name=label(item.name,'موقع إعلاني');
    const address=[item.governorate,item.address].filter(Boolean).join('، ');
    // Reserve the rightmost 51 points for the code badge on the first title line.
    const titleLines=measureLines(page.ctx,name,cellWidth-67,nameSize,700);
    const addressLines=address?measureLines(page.ctx,address,cellWidth-20,addressSize,500):[];
    const nameBottom=16+(titleLines.length-1)*lineGap;
    const addressBaseline=Math.max(31,nameBottom+12);
    const bottom=addressLines.length?addressBaseline+(addressLines.length-1)*addrGap+8:
      Math.max(27,nameBottom+6);
    return {code,titleLines,addressLines,addressBaseline,height:bottom+4,i};
   });
   for(let i=0;i<prepared.length;i+=2){
    const row=prepared.slice(i,i+2);
    const height=Math.max(34,...row.map(item=>item.height));
    keep(height+3);
    const y=page.y,ctx=page.ctx;
    row.forEach((item,index)=>{
     const x=index===0?AREA.right-cellWidth:AREA.left;
     rect(ctx,x,y,cellWidth,height,item.i%4<2?COLOR.subtle:COLOR.subtleAlt);
     const badgeX=x+cellWidth-49;
     rect(ctx,badgeX,y+5,41,17,COLOR.navy);
     setFont(ctx,7.8,800);
     const codeWidth=ctx.measureText(item.code).width;
     const codeSize=Math.max(5.3,Math.min(7.8,7.8*35/Math.max(35,codeWidth)));
     print(ctx,item.code,badgeX+20.5,y+17,codeSize,800,COLOR.white,'center');
     // Names are right-aligned to a point left of the badge, never under it.
     const nameX=x+cellWidth-59;
     item.titleLines.forEach((line,j)=>print(ctx,line,nameX,y+16+j*lineGap,nameSize,700,COLOR.ink));
     // Address always starts strictly below the final title line and badge.
     const addressX=x+cellWidth-10;
     item.addressLines.forEach((line,j)=>print(ctx,line,addressX,y+item.addressBaseline+j*addrGap,addressSize,500,COLOR.muted));
    });
    page.y+=height+3;
   }
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
  return {begin,section,fields,field,block,site,compactSites,signature,end,get current(){return page}};
 }


 const DEFAULT_CUSTOMER_CLAUSES=Object.freeze([
  {number:'1',text:'تتعهد شركتنا بحماية إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'},
  {number:'2',text:'تتعهد شركتنا بتوفير إنارة الكابينة وإدامتها وحسب الحاجة.'},
  {number:'3',text:'في حالة تلف إعلان المشترك من قبل العناصر المجهولة تتعهد الشركة بإعادة تصميم وطبع إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'},
  {number:'4',text:'تتعهد الشركة بترويج إعلان المشترك على مشروع الشاشات العملاقة ولمدة 30 يوم وبسعر 25$ فقط من تاريخ التشغيل التابع لنا.'},
  {number:'5',text:'تتعهد الشركة بترويج إعلان المشترك على مواقع التواصل الاجتماعي التابعة لنا.'},
  {number:'6',text:'يتعهد المشترك بدفع جميع أجور الإعلان الخاصة به.'},
  {number:'7',text:'ترفع جميع الإعلانات التجارية في وقت الانتخابات المحددة ويتم إعادتها من قبلنا بعد انتهاء فترة الانتخابات.'},
  {number:'8',text:'يتعهد المشترك بتصميم وتبديل الإعلان الخاص به كل ستة أشهر ويكون مع الشركة حصراً.'},
  {number:'9',text:'حرر هذا العقد من نسختين ووقعه الطرفان بعد الاطلاع على البنود المدرجة أعلاه.'}
 ]);


 function customerClauses(payload){
  const clauses=DEFAULT_CUSTOMER_CLAUSES.map(clause=>({...clause}));
  // The fixed optional 25 USD promotional fee is printed in the same currency
  // as the agreement when a valid company exchange-rate snapshot is supplied.
  const rate=Number(payload?.exchangeRate);
  if(payload?.currency==='IQD'&&Number.isFinite(rate)&&rate>0){
   const fee=number(Math.round(25*rate))+' دينار عراقي';
   for(const clause of clauses)clause.text=clause.text.replace('25$',fee);
  }
  return clauses;
 }
 function landlordPeriodLabel(start,end){
  const a=Date.parse(String(start||'')+'T00:00:00Z'),b=Date.parse(String(end||'')+'T00:00:00Z');
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return 'المدة المحددة في هذا العقد';
  const days=Math.round((b-a)/86400000)+1;
  if(days>=358&&days<=372)return 'سنة واحدة';
  const months=Math.round(days/30.44);
  return months>0?months+' شهراً':'المدة المحددة في هذا العقد';
 }
 function landlordClauses(payload){
  // The legal rent line names Iraqi dinars explicitly, and spells out one million when exact.
  const rent=payload.currency==='IQD'?
   number(payload.rentTotal)+' دينار عراقي'+(Number(payload.rentTotal)===1000000?' (مليون دينار عراقي)':''):
   amount(payload.rentTotal,payload.currency);
  const days=Math.max(0,Number(payload.graceDays)||0);
  const grace=days===14?'أسبوعان':days===7?'أسبوع واحد':days+' يوماً';
  const start=label(payload.startDate).replace(/-/g,'/');
  const end=label(payload.endDate).replace(/-/g,'/');
  const period=landlordPeriodLabel(payload.startDate,payload.endDate);
  return [
   {number:'1',text:'يقوم الطرف الثاني بدفع إيجار السنة الأولى من المبلغ وقدره '+rent+' لا غيرها.'},
   {number:'2',text:'تكون مدة العقد '+period+' قابلة للتجديد على أن يدفع الطرف الثاني الإيجار كل سنة مقدماً.'},
   {number:'3',text:'يقدم الطرف الأول فترة سماح مدتها '+grace+' للمواد الإعلانية ويبدأ الإيجار بتاريخ '+start+' إلى '+end+'.'},
   {number:'4',text:'يتعهد الطرف الثاني في حالة اضطراره لفسخ العقد لظروف قاهرة بأن يزيل الإعلان على نفقته الخاصة.'},
   {number:'5',text:'لا يحق للطرف الأول فسخ هذا العقد قبل موعد انتهائه.'},
   {number:'6',text:'لا يجوز لأي طرف من الأطراف خرق بنود العقد، وفي حالة الخرق يلجأ الطرفان إلى المحاكم العراقية للبت بالخلاف.'},
   {number:'7',text:'على الطرف الثاني عدم وضع صور نساء أو خمور أو سجائر أو صور مخلة بالآداب.'},
   {number:'8',text:'يتعهد الطرف الأول بتسهيل مهام الطرف الثاني لتركيب الهيكل ولتغيير المواد الإعلانية بحسب ما تدعو إليه الحاجة، وفي أي وقت كان غير أوقات الليل بعد الساعة 10 ليلاً ومنع التجول.'},
   {number:'9',text:'للطرف الثاني الأحقية بتجديد العقد من غيره، علماً أن الهيكل الحديدي تابع للشركة (الطرف الثاني).'}
  ];
 }

 function drawTermsSheet(sheet,payload){
  const ctx=sheet.ctx,width=AREA.right-AREA.left;
  const print=(value,x,y,size=10,weight=600,color=COLOR.ink,align='right')=>{
   setFont(ctx,size,weight);ctx.textAlign=align;ctx.fillStyle=color;
   ctx.fillText(String(value??''),x,y);ctx.textAlign='right';
  };
  const clauses=Array.isArray(payload.clauses)?payload.clauses:
   payload.kind==='landlord'?landlordClauses(payload):customerClauses(payload);
  let y=AREA.top+10;
  // Exactly the same editable contract number as the page-one header.
  print('رقم العقد',AREA.left+10,AREA.top-1,9,600,COLOR.muted,'left');
  print(label(payload.number),AREA.left+10,AREA.top+15,11,800,COLOR.navy,'left');
  print('شروط العقد كالتالي:',AREA.right-12,y+22,17.5,800,'#b8323b');
  y+=47;
  const clauseSize=clauses.length>10?10.3:11.2,leading=clauseSize+4.8;
  for(const [index,clause] of clauses.entries()){
   // Source order is authoritative; numbering never skips 3, even after edits.
   const number=String(index+1);
   const lines=measureLines(ctx,String(clause.text||''),width-49,clauseSize,650);
   const height=Math.max(24,lines.length*leading+6);
   print(number+'.',AREA.right-8,y+clauseSize+2,11.6,800,'#bd3941');
   lines.forEach((line,i)=>print(line,AREA.right-37,y+clauseSize+2+i*leading,clauseSize,650));
   y+=height+3;
  }
  const sections=payload.kind==='landlord'?
   [['شروط خاصة إضافية',payload.extraTerms],['ملاحظات عقد الإيجار',payload.notes]]:
   [['شروط خاصة',payload.extraTerms||payload.terms],
    ['ملاحظات الحملة',payload.campaignNotes],
    ['ملاحظات العقد',payload.notes]];
  for(const [heading,value] of sections){
   if(!String(value||'').trim())continue;
   y+=7;
   print(heading,AREA.right-12,y+10,10.6,800,COLOR.navy);y+=17;
   const lines=measureLines(ctx,value,width-28,9.4,500);
   for(const line of lines){print(line,AREA.right-16,y+9,9.4,500,COLOR.ink);y+=12}
  }
  // The signature table is on the terms page, never on the first contract.
  const signatureTop=Math.max(AREA.top+493,y+20);
  const middle=(AREA.left+AREA.right)/2,half=width/2;
  ctx.strokeStyle=COLOR.line;ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(AREA.left,signatureTop-10);ctx.lineTo(AREA.right,signatureTop-10);ctx.stroke();
  const left=AREA.left+half-17,right=AREA.right-10;
  // The label, representative and date are fully editable per party.
  // First party (right) = owner for leases / Raafat for customer contracts.
  // Second party (left) = Raafat for leases / customer for customer contracts.
  const blocks=[
   {x:right,label:label(payload.firstSignatureLabel,payload.kind==='landlord'?'الطرف الأول — مالك السطح':'الطرف الأول — ممثل الشركة'),
    name:label(payload.firstSignatureName,payload.kind==='landlord'?payload.landlordRepresentative:payload.companyRepresentative),
    date:label(payload.firstSignatureDate,payload.startDate)},
   {x:left,label:label(payload.secondSignatureLabel,payload.kind==='landlord'?'الطرف الثاني — شركة رأفت':'الطرف الثاني — الزبون'),
    name:label(payload.secondSignatureName,payload.kind==='landlord'?payload.companyRepresentative:payload.customerRepresentative||payload.customerName),
    date:label(payload.secondSignatureDate,payload.startDate)}
  ];
  for(const item of blocks){
   print(item.label,item.x,signatureTop+10,10.8,800,COLOR.navy);
   print('الاسم: '+item.name,item.x,signatureTop+33,9.8,600,COLOR.ink);
   print('التاريخ: '+item.date,item.x,signatureTop+54,9.8,600,COLOR.ink);
   print('التوقيع: ___________________',item.x,signatureTop+77,9.5,600,COLOR.muted);
  }
  return signatureTop+90;
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
  // Both customer and landlord agreements use two copies of the original
  // Photoshop template: agreement on page 1, numbered legal terms on page 2.
  function renderContent(painter){
   painter.begin();
   if(payload.kind==='landlord'){
    painter.section('أطراف عقد إيجار السطح');
    painter.fields([
     {name:'الطرف الأول — المؤجر (المالك)',value:payload.landlordName},
     {name:'الطرف الثاني — المستأجر',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'}
    ]);
    painter.fields([
     {name:'هاتف المالك',value:payload.landlordPhone},
     {name:'هاتف الشركة',value:label(payload.companyPhones,'07766663304 - 07866663304')}
    ]);
    painter.fields([
     {name:'ممثل المالك',value:payload.landlordRepresentative},
     {name:'ممثل الشركة',value:payload.companyRepresentative}
    ]);
    painter.field('محافظة وعنوان المالك',payload.landlordAddress);
    painter.section('السطح والعقار المؤجر');
    painter.field('اسم السطح / البناية',payload.propertyName);
    painter.fields([
     {name:'الطول × العرض',value:payload.dimensions},
     {name:'المساحة الإجمالية',value:label(payload.area)+' م²'}
    ]);
    painter.fields([
     {name:'عدد المساحات',value:payload.quantity},
     {name:'المحافظة',value:payload.governorate}
    ]);
    painter.section('مدة العقد والأجرة');
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
    // No notes, legal conditions or signatures on this agreement sheet.
    painter.end();
    return;
   }
   painter.section('أطراف العقد وبيانات التواصل');
   // Party one (company) occupies the right cell of every row;
   // party two (customer) occupies the left cell, including representatives.
   painter.fields([
    {name:'الطرف الأول — شركة رأفت',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'},
    {name:'الطرف الثاني — الزبون',value:payload.customerName}
   ]);
   painter.fields([
    {name:'هاتف الشركة',value:label(payload.companyPhones,'07766663304 - 07866663304')},
    {name:'هاتف الزبون',value:payload.customerPhone}
   ]);
   painter.fields([
    {name:'ممثل الشركة',value:payload.companyRepresentative},
    {name:'ممثل الزبون',value:payload.customerRepresentative}
   ]);

   painter.section('تفاصيل الحملة الإعلانية');
   painter.fields([
    {name:'الحملة الإعلانية',value:payload.campaignTitle},
    {name:'الباقة',value:payload.packageName}
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
    {name:'القياسات',value:payload.dimensions},
    {name:'المساحة م²',value:payload.area}
   ]);
   painter.field('القيمة الإجمالية المتفق عليها',
    number(payload.amount)+' '+(payload.currency==='IQD'?'دينار عراقي':'دولار أمريكي'));
   // Specifications belong to the agreed advertising scope on the contract
   // sheet, not to the legal clauses on page two.
   if(String(payload.specifications||'').trim())
    painter.block('مواصفات الإعلان',payload.specifications);

   painter.section('القطع والمواقع الإعلانية');
   painter.compactSites(payload.sites);
   if(payload.additionalLocations)painter.block('مواقع إضافية',payload.additionalLocations);
   // Customer legal terms, signatures and general notes remain on page 2 only.
   painter.end();
  }

  const measurement=pageCanvas(size);
  const measurePainter=createPainter(size,()=>({...measurement,pageNumber:1}),payload);
  renderContent(measurePainter);
  const naturalHeight=Math.max(1,measurePainter.current.y-AREA.top);
  const availableHeight=Math.min(AREA.bottom,size.height-70)-AREA.top;
  const fit=Math.min(1,availableHeight/naturalHeight);
  if(fit<0.65)throw Error('تفاصيل القطع والمواقع الإعلانية لا تكفي صفحة A4 الأولى بخط مقروء. اختصر العناوين الطويلة أو قسّم قائمة المواقع.');
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

  {
   // Page two is a fresh copy of the company's *original* PDF template
   // for leases and customer agreements alike; no illustrative screenshots.
   const measureTerms=pageCanvas(size);
   const naturalTermsBottom=drawTermsSheet(measureTerms,payload);
   const termsHeight=naturalTermsBottom-AREA.top;
   const fitTerms=Math.min(1,availableHeight/Math.max(1,termsHeight));
   if(fitTerms<0.7)throw Error('الشروط والملاحظات أطول من المساحة المتاحة في صفحة الشروط. اختصر النص قبل الطباعة.');
   const termsOverlay=pageCanvas(size);
   termsOverlay.ctx.translate(middle*(1-fitTerms),AREA.top*(1-fitTerms));
   termsOverlay.ctx.scale(fitTerms,fitTerms);
   drawTermsSheet(termsOverlay,payload);
   const termsUri=termsOverlay.canvas.toDataURL('image/png');
   const termsData=await fetch(termsUri).then(res=>res.arrayBuffer());
   const termsImage=await out.embedPng(termsData);
   const [secondOriginal]=await out.copyPages(original,[0]);
   out.addPage(secondOriginal).drawImage(termsImage,{x:0,y:0,width:size.width,height:size.height});
  }
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
  saveBlob(blob,contractFileName(payload));
  return blob;
 }
 async function preview(payload,win){
  const blob=await generate(payload);
  const url=URL.createObjectURL(blob);
  if(win&&!win.closed){win.location.replace(url);return blob}
  saveBlob(blob,contractFileName(payload));
  return blob;
 }
 scope.RaafatContractPdf=Object.freeze({generate,download,preview,contractFileName,TEMPLATE_URL,
  defaultClauses:DEFAULT_CUSTOMER_CLAUSES,defaultCustomerClauses:customerClauses,defaultLandlordClauses:landlordClauses});
})(window);
