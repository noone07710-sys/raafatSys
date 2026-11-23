/* Raafat Sys — dependency-free XLSX writer and Arabic multipage PDF report renderer.
 * XLSX is genuine OpenXML (not CSV disguised as XLS); phone and ID cells are typed as text.
 * PDF canvas uses the browser's Cairo Arabic font and stores all rows without truncation.
 */
(function(scope){
 'use strict';
 const encoder=new TextEncoder();
 const utf8=s=>encoder.encode(String(s??''));
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[x]))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'');
 const filename=s=>String(s||'raafat-report').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,100);
 const uint=(view,offset,val)=>view.setUint32(offset,val>>>0,true);
 const ushort=(view,offset,val)=>view.setUint16(offset,val,true);
 const CRCTABLE=Array.from({length:256},(_,i)=>{
  let crc=i;for(let j=0;j<8;j++)crc=(crc&1)?0xedb88320^(crc>>>1):(crc>>>1);
  return crc>>>0;
 });
 function crc32(bytes){
  let crc=0xffffffff;
  for(let i=0;i<bytes.length;i++)crc=CRCTABLE[(crc^bytes[i])&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
 }
 function zip(files){
  const records=[];let offset=0;
  for(const [name,content] of files){
   const nameData=utf8(name),data=content instanceof Uint8Array?content:utf8(content);
   if(data.length>0xffffffff)throw Error('التقرير كبير جداً للملف الواحد.');
   const crc=crc32(data),local=new Uint8Array(30+nameData.length+data.length);
   const h=new DataView(local.buffer);
   uint(h,0,0x04034b50);ushort(h,4,20);ushort(h,6,0x0800);
   ushort(h,8,0);ushort(h,10,0);ushort(h,12,0);
   uint(h,14,crc);uint(h,18,data.length);uint(h,22,data.length);
   ushort(h,26,nameData.length);ushort(h,28,0);
   local.set(nameData,30);local.set(data,30+nameData.length);
   records.push({nameData,data,crc,offset,local});offset+=local.length;
  }
  const centralSize=records.reduce((n,r)=>n+46+r.nameData.length,0),out=new Uint8Array(offset+centralSize+22);
  let at=0;
  for(const r of records){out.set(r.local,at);at+=r.local.length}
  const centralStart=at;
  for(const r of records){
   const c=new DataView(out.buffer,at,46+r.nameData.length);
   uint(c,0,0x02014b50);ushort(c,4,20);ushort(c,6,20);ushort(c,8,0x0800);
   ushort(c,10,0);ushort(c,12,0);ushort(c,14,0);
   uint(c,16,r.crc);uint(c,20,r.data.length);uint(c,24,r.data.length);
   ushort(c,28,r.nameData.length);ushort(c,30,0);ushort(c,32,0);ushort(c,34,0);
   ushort(c,36,0);uint(c,38,0);uint(c,42,r.offset);
   out.set(r.nameData,at+46);at+=46+r.nameData.length;
  }
  const e=new DataView(out.buffer,at,22);uint(e,0,0x06054b50);
  ushort(e,4,0);ushort(e,6,0);ushort(e,8,records.length);ushort(e,10,records.length);
  uint(e,12,at-centralStart);uint(e,16,centralStart);ushort(e,20,0);
  return out;
 }
 function excelColumn(i){
  let label='',x=i+1;
  while(x){x--;label=String.fromCharCode(65+x%26)+label;x=Math.floor(x/26)}
  return label;
 }
 function excelSheet(sheet){
  const columns=sheet.columns||[],rows=sheet.rows||[];
  if(columns.length>16384||rows.length>1048575)throw Error('تجاوز أحد تقارير Excel الحدود المعتمدة للصفوف أو الأعمدة.');
  let xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<dimension ref="A1:'+excelColumn(Math.max(0,columns.length-1))+(rows.length+1)+'"/>'+
   '<sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>'+
   '<sheetFormatPr defaultRowHeight="20"/><cols>'+
   columns.map((c,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(c.kind==='number'?'18':Math.min(42,Math.max(16,c.label.length*1.7)))+'" customWidth="1"/>').join('')+
   '</cols><sheetData><row r="1" ht="28" customHeight="1">'+
   columns.map((c,i)=>'<c r="'+excelColumn(i)+'1" t="inlineStr" s="1"><is><t>'+esc(c.label)+'</t></is></c>').join('')+
   '</row>';
  for(let ri=0;ri<rows.length;ri++){
   const row=rows[ri],rn=ri+2,style=ri%2===0?'2':'0';
   xml+='<row r="'+rn+'">';
   for(let ci=0;ci<columns.length;ci++){
    const col=columns[ci],value=row[col.key];
    if(value===null||value===undefined||value==='')continue;
    const ref=excelColumn(ci)+rn;
    if(col.kind==='number'&&typeof value==='number'&&Number.isFinite(value)){
     xml+='<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';
    }else{
     // Inline text cells cannot be interpreted as formulas. Leading-zero IDs
     // and untrusted user text are preserved exactly; no formula-injection risk.
     xml+='<c r="'+ref+'" t="inlineStr" s="'+style+'"><is><t xml:space="preserve">'+esc(value)+'</t></is></c>';
    }
   }
   xml+='</row>';
  }
  return xml+'</sheetData><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>';
 }
 function xlsx(report){
  if(!report?.sheets?.length)throw Error('لا توجد أوراق عمل للتقرير.');
  const content='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+
   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
   report.sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+
   '</Types>';
  const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
   '<bookViews><workbookView activeTab="0"/></bookViews><sheets>'+
   report.sheets.map((s,i)=>'<sheet name="'+esc(String(s.name).slice(0,31))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+
   '</sheets></workbook>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   report.sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
   '<Relationship Id="rId'+(report.sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>'+
   '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+
   '<fill><patternFill patternType="solid"><fgColor rgb="FF164638"/><bgColor indexed="64"/></patternFill></fill>'+
   '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF5F2"/><bgColor indexed="64"/></patternFill></fill></fills>'+
   '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
   '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
   '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
   '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'+
   '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs>'+
   '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const files=[
   ['[Content_Types].xml',content],
   ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
   ['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',rels],['xl/styles.xml',styles],
   ...report.sheets.map((sheet,i)=>['xl/worksheets/sheet'+(i+1)+'.xml',excelSheet(sheet)])
  ];
  return new Blob([zip(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }
 const PDF_SOURCES=['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'];
 let pdfLoader=null;
 function script(src){
  return new Promise((resolve,reject)=>{
   const e=document.createElement('script');e.async=true;e.src=src;e.crossOrigin='anonymous';
   e.onload=()=>scope.PDFLib?.PDFDocument?resolve(scope.PDFLib):reject(Error('مكتبة PDF غير جاهزة'));
   e.onerror=()=>{e.remove();reject(Error('تعذر تحميل مكتبة PDF'))};
   document.head.appendChild(e);
  });
 }
 async function pdfLib(){
  if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
  if(!pdfLoader)pdfLoader=(async()=>{
   for(const src of PDF_SOURCES)try{return await script(src)}catch(_){}
   throw Error('تعذر تحميل أداة PDF. تحقق من الإنترنت أو استخدم Excel.');
  })().catch(e=>{pdfLoader=null;throw e});
  return pdfLoader;
 }
 const PAGE={width:842,height:595,margin:37,top:100,bottom:548};
 function arabicLines(ctx,value,width,size=10){
  const str=String(value??'—').replace(/\r/g,'').trim()||'—';
  const result=[];
  ctx.font='500 '+size+'px Cairo, Tahoma, Arial, sans-serif';
  for(const block of str.split('\n')){
   let line='';
   for(const word of block.split(/\s+/)){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width<=width){line=next;continue}
    if(line){result.push(line);line=''}
    if(ctx.measureText(word).width<=width){line=word;continue}
    let chunk='';
    for(const char of Array.from(word)){
     if(chunk&&ctx.measureText(chunk+char).width>width){result.push(chunk);chunk=char}
     else chunk+=char;
    }
    line=chunk;
   }
   if(line)result.push(line);
   if(!line&&!block)result.push('');
  }
  return result.length?result:['—'];
 }
 async function pdf(report){
  if(!report?.sheets?.length)throw Error('لا توجد بيانات لإنشاء التقرير');
  const PDFLib=await pdfLib();
  if(document.fonts?.load)await document.fonts.load('600 12px Cairo');
  const doc=await PDFLib.PDFDocument.create();
  doc.setTitle(report.title);doc.setAuthor(report.companyName||'Raafat Sys');
  doc.setCreator('Raafat Sys — Reports');
  let page=null,ctx=null,canvas=null,y=0,pageNo=0;
  const text=(s,x,y,size=10,color='#192b33',bold=false)=>{
   ctx.font=(bold?'700 ':'500 ')+size+'px Cairo, Tahoma, Arial, sans-serif';
   ctx.textAlign='right';ctx.fillStyle=color;ctx.fillText(String(s??''),x,y);
  };
  const border=(x,y,w,h,color='#d9e6df')=>{ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.strokeRect(x,y,w,h)};
  const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
  async function flush(){
   if(!canvas)return;
   const bytes=canvas.toBlob?await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?blob.arrayBuffer().then(resolve,reject):reject(Error('تعذر رسم صفحة PDF')),'image/png')):
    await fetch(canvas.toDataURL('image/png')).then(r=>r.arrayBuffer());
   const image=await doc.embedPng(bytes),p=doc.addPage([PAGE.width,PAGE.height]);
   p.drawImage(image,{x:0,y:0,width:PAGE.width,height:PAGE.height});
   canvas=null;ctx=null;
  }
  async function newPage(title,continued=false){
   await flush();
   pageNo++;
   canvas=document.createElement('canvas');canvas.width=PAGE.width*2;canvas.height=PAGE.height*2;
   ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Canvas غير متوفر في المتصفح');
   ctx.scale(2,2);ctx.direction='rtl';
   fill(0,0,PAGE.width,PAGE.height,'#ffffff');
   fill(0,0,PAGE.width,9,'#184b3a');
   text(report.companyName||'شركة رأفت',PAGE.width-PAGE.margin,34,11,'#285544',true);
   text(report.title,PAGE.width-PAGE.margin,61,17,'#143c30',true);
   text(title+(continued?' (تابع)':''),PAGE.width-PAGE.margin,84,11,'#4d655f',true);
   fill(PAGE.margin,90,PAGE.width-2*PAGE.margin,1,'#dce6e0');
   fill(PAGE.margin,554,PAGE.width-2*PAGE.margin,1,'#dce6e0');
   text('صفحة '+pageNo,90,573,9,'#667875');
   text('المصدر: بيانات النظام — '+String(report.generatedAt||'').slice(0,10),
    PAGE.width-PAGE.margin,573,9,'#667875');
   y=PAGE.top+4;
  }
  function cardPairs(sheet,row){
   return sheet.columns.map(col=>[col.label,row?.[col.key]]);
  }
  async function card(sheet,row,index){
   const pairs=cardPairs(sheet,row),gap=18,
    cellW=(PAGE.width-2*PAGE.margin-gap-28)/2,
    contentX=PAGE.width-PAGE.margin-13,columns=2;
   let segments=[];
   for(let i=0;i<pairs.length;i+=columns){
    let chunk=pairs.slice(i,i+columns);
    const lineGroups=chunk.map(([label,value])=>({
     label,
     lines:arabicLines(ctx,typeof value==='number'?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value):value,cellW-12,10)
    }));
    const height=Math.max(...lineGroups.map(x=>23+x.lines.length*14))+4;
    segments.push({lineGroups,height});
   }
   let segmentIndex=0;
   while(segmentIndex<segments.length){
    if(y+35>PAGE.bottom)await newPage(sheet.name,true);
    const top=y;
    fill(PAGE.margin,top,PAGE.width-PAGE.margin*2,28,'#f1f7f3');
    text('سجل '+String(index+1),PAGE.width-PAGE.margin-13,top+19,10,'#245b47',true);
    y=top+34;
    const rowStart=segmentIndex;
    for(;segmentIndex<segments.length;segmentIndex++){
     const segment=segments[segmentIndex],need=segment.height+5;
     if(y+need>PAGE.bottom)break;
     for(let ci=0;ci<segment.lineGroups.length;ci++){
      const group=segment.lineGroups[ci];
      const right=contentX-ci*(cellW+gap);
      text(group.label,right,y+12,9,'#768781');
      group.lines.forEach((line,lineIndex)=>text(line,right,y+28+14*lineIndex,10,'#1e3530',false));
     }
     y+=need;
    }
    if(segmentIndex===rowStart){
     // At least one very long field must fit by splitting text; repeated
     // row headers and smaller type keep all content represented.
     const segment=segments[segmentIndex];
     if(y+segment.height>PAGE.bottom){
      const maxLines=Math.max(1,Math.floor((PAGE.bottom-y-40)/14));
      const a=segment.lineGroups.map(g=>({...g,lines:g.lines.slice(0,maxLines)}));
      for(let ci=0;ci<a.length;ci++){
       const right=contentX-ci*(cellW+gap);
       text(a[ci].label,right,y+12,9,'#768781');
       a[ci].lines.forEach((line,i)=>text(line,right,y+28+14*i,10,'#1e3530'));
      }
      segment.lineGroups=segment.lineGroups.map(g=>({...g,lines:g.lines.slice(maxLines)}));
      if(segment.lineGroups.every(g=>!g.lines.length))segmentIndex++;
      await newPage(sheet.name,true);
     }else segmentIndex++;
    }else if(segmentIndex<segments.length)await newPage(sheet.name,true);
   }
   if(y+14<=PAGE.bottom){border(PAGE.margin,y-1,PAGE.width-2*PAGE.margin,1,'#e4ebe7');y+=9}
  }
  for(const sheet of report.sheets){
   await newPage(sheet.name,false);
   text('إجمالي السجلات: '+sheet.rows.length,PAGE.width-PAGE.margin,y+12,10,'#526761');
   y+=22;
   if(!sheet.rows.length){
    text('لا توجد بيانات محفوظة في هذا القسم.',PAGE.width-PAGE.margin,y+20,12,'#667875');
    continue;
   }
   for(let i=0;i<sheet.rows.length;i++)await card(sheet,sheet.rows[i],i);
  }
  await flush();
  return new Blob([await doc.save({useObjectStreams:false})],{type:'application/pdf'});
 }
 async function download(report,format){
  if(!['xlsx','pdf'].includes(format))throw Error('صيغة الملف غير مدعومة');
  const file=format==='xlsx'?xlsx(report):await pdf(report);
  const date=String(report.generatedAt||new Date().toISOString()).slice(0,10);
  const title=filename(report.title)+'-'+date+'.'+format;
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;a.download=title;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  return {filename:title,bytes:file.size,sheets:report.sheets.length};
 }
 scope.RaafatReportFiles=Object.freeze({xlsx,pdf,download});
})(window);
