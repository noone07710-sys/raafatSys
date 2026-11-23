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
 // A3 landscape gives Arabic financial reports usable column widths.
 // Wide datasets are split into COLUMN PANELS, not one page per record.
 const PAGE={width:1191,height:842,margin:34,top:112,bottom:788};
 const W=PAGE.width-2*PAGE.margin;
 const ROW_FONT=10.1,ROW_LINE=14.5,HEADER_FONT=10,HEADER_HEIGHT=49;
 function arabicLines(ctx,value,width,size=ROW_FONT){
  const str=String(value??'—').replace(/\r/g,'').trim()||'—',result=[];
  ctx.font='500 '+size+'px Cairo, Tahoma, Arial, sans-serif';
  for(const block of str.split('\n')){
   if(!block.trim()){result.push('');continue}
   let line='';
   for(const word of block.trim().split(/\s+/)){
    if(!word)continue;
    const together=line?line+' '+word:word;
    if(ctx.measureText(together).width<=width){line=together;continue}
    if(line){result.push(line);line=''}
    if(ctx.measureText(word).width<=width){line=word;continue}
    let partial='';
    for(const char of Array.from(word)){
     if(partial&&ctx.measureText(partial+char).width>width){
      result.push(partial);partial=char;
     }else partial+=char;
    }
    line=partial;
   }
   if(line)result.push(line);
  }
  return result.length?result:['—'];
 }
 function showCell(value){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='number')return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
  return String(value);
 }
 function splitColumns(sheet,measure){
  const all=sheet.columns||[];
  if(!all.length)return [{columns:[],widths:[]}];
  const stable=['customerName','ownerName','contractNumber','receiptNumber','item','campaignTitle','propertyName'];
  const pinned=[];
  for(const key of stable){
   const c=all.find(col=>col.key===key);
   if(c&&pinned.length<2&&!(pinned.length&&['ownerName','customerName'].includes(c.key)))
    pinned.push(c);
  }
  if(!pinned.length)pinned.push(all[0]);
  const floating=all.filter(col=>!pinned.includes(col));
  const estimate=(col)=>{
   const samples=(sheet.rows||[]).slice(0,35);
   const header=measure(col.label,HEADER_FONT)+21;
   const ordered=samples.map(r=>measure(showCell(r[col.key]),ROW_FONT)+19).sort((a,b)=>a-b);
   const typical=ordered.length?ordered[Math.floor(ordered.length*0.72)]:0;
   const isMoney=col.kind==='number';
   return Math.max(isMoney?96:101,
    Math.min(col.key==='ownerName'||col.key==='customerName'?174:isMoney?133:205,
     Math.max(header,typical)));
  };
  const serialWidth=40;
  const pinnedWidths=pinned.map(estimate);
  const pinnedTotal=pinnedWidths.reduce((a,b)=>a+b,0);
  // Reserve useful space for at least two detail columns on large reports.
  const maxPin=W-serialWidth-230;
  if(pinnedTotal>maxPin){
   const ratio=maxPin/pinnedTotal;
   for(let i=0;i<pinnedWidths.length;i++)pinnedWidths[i]*=ratio;
  }
  if(!floating.length)return [{columns:pinned,widths:pinnedWidths}];
  const pages=[];let group=[],width=serialWidth+pinnedWidths.reduce((a,b)=>a+b,0);
  for(const col of floating){
   const colWidth=Math.min(estimate(col),W-serialWidth-pinnedWidths.reduce((a,b)=>a+b,0));
   if(group.length&&width+colWidth>W){
    pages.push({columns:[...pinned,...group.map(x=>x.column)],
     widths:[...pinnedWidths,...group.map(x=>x.width)]});
    group=[];width=serialWidth+pinnedWidths.reduce((a,b)=>a+b,0);
   }
   group.push({column:col,width:colWidth});width+=colWidth;
  }
  if(group.length)pages.push({columns:[...pinned,...group.map(x=>x.column)],
   widths:[...pinnedWidths,...group.map(x=>x.width)]});
  return pages;
 }
 async function pdf(report){
  if(!report?.sheets?.length)throw Error('لا توجد بيانات لإنشاء التقرير');
  const PDFLib=await pdfLib();
  if(document.fonts?.load)await document.fonts.load('600 12px Cairo');
  const doc=await PDFLib.PDFDocument.create();
  doc.setTitle(report.title);doc.setAuthor(report.companyName||'Raafat Sys');
  doc.setCreator('Raafat Sys — Tabular Reports');
  let ctx=null,canvas=null,y=0,pageNo=0;
  const text=(value,x,baseline,size=10,color='#1e3430',bold=false)=>{
   ctx.font=(bold?'700 ':'500 ')+size+'px Cairo, Tahoma, Arial, sans-serif';
   ctx.textAlign='right';ctx.fillStyle=color;ctx.fillText(String(value??''),x,baseline);
  };
  const fill=(x,at,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(x,at,width,height)};
  const stroke=(x,at,width,height,color='#d5e4db')=>{
   ctx.strokeStyle=color;ctx.lineWidth=.75;ctx.strokeRect(x,at,width,height);
  };
  async function flush(){
   if(!canvas)return;
   const bytes=canvas.toBlob?await new Promise((resolve,reject)=>
    canvas.toBlob(blob=>blob?blob.arrayBuffer().then(resolve,reject):
     reject(Error('تعذر رسم صفحة PDF')),'image/png')):
    await fetch(canvas.toDataURL('image/png')).then(r=>r.arrayBuffer());
   const image=await doc.embedPng(bytes),p=doc.addPage([PAGE.width,PAGE.height]);
   p.drawImage(image,{x:0,y:0,width:PAGE.width,height:PAGE.height});
   canvas=null;ctx=null;
  }
  function paintHeader(sheet,part,partCount,cols,widths){
   fill(0,0,PAGE.width,PAGE.height,'#ffffff');
   fill(0,0,PAGE.width,9,'#164638');
   text(report.companyName||'شركة رأفت',PAGE.width-PAGE.margin,32,12,'#285544',true);
   text(report.title,PAGE.width-PAGE.margin,61,17,'#143c30',true);
   text(sheet.name+' — جدول '+part+' من '+partCount,PAGE.width-PAGE.margin,86,12,'#48695d',true);
   text('عدد السجلات: '+(sheet.rows||[]).length,PAGE.margin+135,82,10,'#536960');
   fill(PAGE.margin,98,W,1,'#dce6e0');
   fill(PAGE.margin,PAGE.height-39,W,1,'#dce6e0');
   text('صفحة '+pageNo,PAGE.margin+79,PAGE.height-18,9,'#667875');
   text('المصدر: بيانات النظام — '+String(report.generatedAt||'').slice(0,10),
    PAGE.width-PAGE.margin,PAGE.height-18,9,'#667875');
   y=PAGE.top;
   const allWidths=[40,...widths],allCols=[{key:'_index',label:'#'},...cols];
   let right=PAGE.width-PAGE.margin;
   for(let c=0;c<allCols.length;c++){
    const width=allWidths[c];
    fill(right-width,y,width,HEADER_HEIGHT,'#164638');
    stroke(right-width,y,width,HEADER_HEIGHT,'#4b806c');
    const lines=arabicLines(ctx,allCols[c].label,width-12,HEADER_FONT);
    const maxLines=Math.min(3,lines.length);
    const baseline=y+14+Math.max(0,(3-maxLines)*5);
    for(let j=0;j<maxLines;j++)text(lines[j],right-7,baseline+j*13,HEADER_FONT,'#ffffff',true);
    right-=width;
   }
   y+=HEADER_HEIGHT;
  }
  async function startPage(sheet,part,partCount,cols,widths){
   await flush();
   pageNo++;
   canvas=document.createElement('canvas');
   canvas.width=PAGE.width*1.65;canvas.height=PAGE.height*1.65;
   ctx=canvas.getContext('2d');
   if(!ctx)throw Error('تعذر تهيئة رسم صفحات PDF');
   ctx.scale(1.65,1.65);ctx.direction='rtl';
   paintHeader(sheet,part,partCount,cols,widths);
  }
  async function drawRow(sheet,row,index,part,partCount,cols,widths){
   const widthsAll=[40,...widths],fields=[{key:'_index'},...cols],rowData={...row,_index:index+1};
   const cells=fields.map((col,ci)=>arabicLines(ctx,showCell(rowData[col.key]),widthsAll[ci]-13,ROW_FONT));
   let offset=0,continued=false;
   // Tall notes wrap naturally and continue in the NEXT TABLE ROW on a later page
   // rather than losing text or forcing a single record to occupy its own page.
   const longest=Math.max(1,...cells.map(lines=>lines.length));
   while(offset<longest){
    const available=PAGE.bottom-y-13;
    const maxLines=Math.floor((available-13)/ROW_LINE);
    if(maxLines<1){await startPage(sheet,part,partCount,cols,widths);continue}
    const drawn=Math.min(longest-offset,maxLines);
    const height=13+drawn*ROW_LINE;
    const background=index%2===0?'#f1f6f3':'#ffffff';
    let right=PAGE.width-PAGE.margin;
    for(let ci=0;ci<fields.length;ci++){
     const width=widthsAll[ci];
     fill(right-width,y,width,height,background);
     stroke(right-width,y,width,height);
     const chunk=cells[ci].slice(offset,offset+drawn);
     if(ci===0&&continued)text(String(index+1)+'…',right-7,y+16,ROW_FONT,'#4a655c',true);
     else for(let li=0;li<chunk.length;li++){
      const color=ci===0?'#275c44':'#192d2a';
      text(chunk[li],right-7,y+17+li*ROW_LINE,ROW_FONT,color,ci===0);
     }
     right-=width;
    }
    y+=height;
    offset+=drawn;
    continued=true;
    if(offset<longest)await startPage(sheet,part,partCount,cols,widths);
   }
  }
  const measureCanvas=document.createElement('canvas');
  const measureCtx=measureCanvas.getContext('2d');
  if(!measureCtx)throw Error('تعذر قياس أعمدة التقرير');
  const measure=(value,size)=>{
   measureCtx.font='500 '+size+'px Cairo, Tahoma, Arial, sans-serif';
   return measureCtx.measureText(String(value||'')).width;
  };
  for(const sheet of report.sheets){
   const panels=splitColumns(sheet,measure);
   for(let partIndex=0;partIndex<panels.length;partIndex++){
    const {columns,widths}=panels[partIndex];
    await startPage(sheet,partIndex+1,panels.length,columns,widths);
    if(!sheet.rows?.length){
     text('لا توجد بيانات محفوظة في هذا القسم.',PAGE.width-PAGE.margin-14,y+28,13,'#677c72');
    }else{
     for(let ri=0;ri<sheet.rows.length;ri++){
      await drawRow(sheet,sheet.rows[ri],ri,partIndex+1,panels.length,columns,widths);
     }
    }
   }
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
