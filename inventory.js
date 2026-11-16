/* Raafat Sys inventory workspace — standalone browser module. */
(function(global){
'use strict';
global.RaafatInventory=function(ctx){
 const {s,E,fmt,money,uiIcon,toast,render,canAccess,today}=ctx;
 const tabs=[['overview','نظرة عامة'],['items','تعريف المواد'],['receive','إدخال مخزني'],['out','إخراج وموافقات'],['return','استرجاع المواد'],['audit','الجرد'],['notices','إشعارات المخزن']];
 const units={piece:'قطعة',carton:'كارتون',meter:'متر',kg:'كيلوغرام'};
 const kinds={consumable:'استهلاكية',returnable:'دائمية — قابلة للإرجاع'};
 const docTypes={in:'إدخال مخزني',out:'إخراج مخزني',return:'استرجاع مواد'};
 const statuses={posted:'مُرحّل للمخزون',pending:'ينتظر الموافقة',approved:'وافق المدير — جاهز للتسليم',rejected:'مرفوض',issued:'تم التسليم والخروج'};
 const state={tab:'overview',loaded:false,loading:false,error:'',busy:false,
  items:[],documents:[],lines:[],movements:[],notifications:[],draft:null,
  itemDraft:null,confirm:null,printDocId:null,lastLoad:0,timer:null};
 const todayLocal=()=>String(today());
 const actor=()=>s.staff?.display_name||s.staff?.email||s.session?.user?.email||'الموظف المسجل';
 const manager=()=>s.demo||s.staff?.role==='admin';
 const canWrite=()=>s.demo||canAccess('inventory','create');
 const item=id=>state.items.find(x=>String(x.id)===String(id));
 const doc=id=>state.documents.find(x=>String(x.id)===String(id));
 const docLines=id=>state.lines.filter(x=>String(x.document_id)===String(id));
 const displayQty=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:3});
 const value=x=>Number(x)||0;
 const unique=(prefix)=>prefix+'-'+Math.random().toString(36).slice(2,10);
 function issueReserved(id){
  return state.lines.filter(line=>String(line.item_id)===String(id)&&doc(line.document_id)?.status==='approved'&&doc(line.document_id)?.document_type==='out')
   .reduce((sum,line)=>sum+value(line.base_qty),0);
 }
 function stockAvailable(it){return Math.max(0,value(it?.stock_qty)-issueReserved(it?.id));}
 function stockText(it,quantity){
  const n=value(quantity),kind=it?.unit;
  if(kind==='carton'){
   const factor=Math.max(1,value(it.pieces_per_carton));
   const cartons=Math.floor(n/factor),pieces=Number((n-cartons*factor).toFixed(3));
   return displayQty(cartons)+' كارتون'+(pieces?' و'+displayQty(pieces)+' قطعة':'')+
    ' ('+displayQty(n)+' قطعة)';
  }
  return displayQty(n)+' '+(units[kind]||'وحدة');
 }
 function inputToBase(it,q,unit){
  const factor=unit==='carton'?Math.max(1,value(it?.pieces_per_carton)):1;
  return Number((value(q)*factor).toFixed(3));
 }
 function minInSelectedUnit(it){
  return value(it?.min_stock_qty)/(it?.unit==='carton'?Math.max(1,value(it.pieces_per_carton)):1);
 }
 function isLow(it){return value(it.stock_qty)<=value(it.min_stock_qty)&&
  (value(it.min_stock_qty)>0||value(it.stock_qty)===0);}
 function lowItems(){return state.items.filter(x=>x.active!==false&&isLow(x));}
 function outstanding(){
  return state.lines.filter(line=>{
   const d=doc(line.document_id),it=item(line.item_id);
   return d?.document_type==='out'&&d.status==='issued'&&it?.item_kind==='returnable';
  }).map(line=>{
   const d=doc(line.document_id);
   const returned=state.lines.filter(x=>x.source_line_id===line.id&&doc(x.document_id)?.status==='posted')
    .reduce((sum,x)=>sum+value(x.base_qty),0);
   return {line,doc:d,item:item(line.item_id),returned,
    remaining:Math.max(0,Number((value(line.base_qty)-returned).toFixed(3)))};
  }).filter(x=>x.remaining>0);
 }
 function pendingDocs(){return state.documents.filter(d=>d.document_type==='out'&&d.status==='pending');}
 function overdueReturns(){
  return outstanding().filter(x=>x.doc.return_due_date&&x.doc.return_due_date<todayLocal());
 }
 function alertCount(){
  if(!state.loaded)return 0;
  const recent=state.notifications.filter(n=>new Date(n.created_at||0).getTime()>Date.now()-86400000);
  const notices=manager()?recent:recent.filter(n=>n.recipient_id);
  return (manager()?pendingDocs().length:0)+lowItems().length+overdueReturns().length+notices.length;
 }
 function alertHtml(){
  if(!state.loaded||!canAccess('inventory','read'))return '';
  const outstandingOverdue=overdueReturns();
  const pending=manager()?pendingDocs().length:0;
  const low=lowItems();
  const recent=state.notifications.filter(n=>Date.now()-new Date(n.created_at||0).getTime()<86400000).slice(0,5);
  if(!pending&&!low.length&&!outstandingOverdue.length&&!recent.length)return '';
  const alerts=[
   pending?pending+' طلب إخراج ينتظر موافقة المدير':null,
   low.length?low.length+' مواد أقل من الحد الأدنى أو نفدت':null,
   outstandingOverdue.length?outstandingOverdue.length+' عهدة لم تُسترجع بموعدها':null,
   recent.length?recent.length+' حركة أو قرار جديد خلال 24 ساعة':null
  ].filter(Boolean);
  return '<section class="inv-alerts-summary"><div><strong>'+uiIcon('alert',17)+' إشعارات المخازن</strong><p>'+
    E(alerts.join(' · '))+'</p></div><button type="button" class="btn secondary mini" data-inv-open-alerts>فتح قسم المخازن</button></section>';
 }
 function resetDemo(){
  state.items=[];state.documents=[];state.lines=[];state.movements=[];state.notifications=[];
  state.loaded=true;state.tab='overview';state.draft=null;state.itemDraft=null;state.error='';
 }
 async function reload({silent=false}={}){
  if(s.demo){state.loaded=true;return;}
  if(!s.client||!s.session||!canAccess('inventory','read'))return;
  if(state.loading)return;
  state.loading=true;
  if(!silent)render();
  try{
   const queries=[
    s.client.from('inventory_items').select('*').order('created_at',{ascending:false}).limit(1000),
    s.client.from('inventory_documents').select('*').order('created_at',{ascending:false}).limit(1000),
    s.client.from('inventory_document_lines').select('*').order('created_at',{ascending:false}).limit(5000),
    s.client.from('inventory_movements').select('*').order('created_at',{ascending:false}).limit(2000),
    s.client.from('inventory_notifications').select('*').order('created_at',{ascending:false}).limit(250)
   ];
   const result=await Promise.all(queries);
   for(const r of result)if(r.error)throw r.error;
   [state.items,state.documents,state.lines,state.movements,state.notifications]=result.map(r=>r.data||[]);
   state.error='';state.loaded=true;state.lastLoad=Date.now();
  }catch(error){state.error='تعذّر تحميل المخزن: '+(error?.message||String(error));}
  finally{state.loading=false;if(s.view==='inventory'||!silent)render();}
 }
 function startPolling(){
  if(s.demo||!s.session||!canAccess('inventory','read')||state.timer||typeof global.setInterval!=='function')return;
  state.timer=global.setInterval(()=>{if(s.session&&!state.busy&&!state.loading)reload({silent:true})},45000);
 }
 function stopPolling(){if(state.timer&&global.clearInterval)global.clearInterval(state.timer);state.timer=null;}
 function choice(options,selected=''){
  return options.map(([val,label])=>'<option value="'+E(val)+'"'+(String(selected)===String(val)?' selected':'')+'>'+E(label)+'</option>').join('');
 }
 const field=(label,name,val='',type='text',additional='')=>
  '<label class="field"><span>'+E(label)+'</span><input name="'+E(name)+'" type="'+type+'" value="'+E(val??'')+'" '+additional+'></label>';
 function itemForm(){
  if(!state.itemDraft)return '';
  const x=state.itemDraft;
  return '<div class="overlay inv-overlay"><div class="modal inv-item-modal"><div class="modalhead">'+
   '<h2>'+(x.id?'تعديل تعريف مادة':'تعريف مادة جديدة')+'</h2>'+
   '<button class="close" type="button" data-inv-dismiss>'+uiIcon('x',18)+'</button></div>'+
   '<p class="subtle">يُعرّف نوع المادة ووحدة قياسها مرة واحدة. لا يمكن تغيير الوحدة بعد تسجيل حركات عليها.</p>'+
   '<form id="invItemForm" class="inv-form-grid">'+
   field('رمز المادة *','code',x.code,'text','required maxlength="45"')+
   field('اسم المادة *','name',x.name,'text','required maxlength="180"')+
   '<label class="field inv-wide"><span>تفاصيل ومواصفات المادة</span><textarea name="description" rows="2" maxlength="2000">'+E(x.description||'')+'</textarea></label>'+
   '<label class="field"><span>وحدة القياس *</span><select name="unit">'+choice(Object.entries(units),x.unit||'piece')+'</select></label>'+
   '<label class="field"><span>نوع المادة *</span><select name="item_kind">'+choice(Object.entries(kinds),x.item_kind||'consumable')+'</select></label>'+
   (x.unit==='carton'?field('عدد القطع داخل الكارتون *','pieces_per_carton',x.pieces_per_carton||'','number','min="1" step="1" required'):'')+
   field('سعر الوحدة','price',x.price??0,'number','min="0" step=".01" required')+
   '<label class="field"><span>عملة السعر</span><select name="currency">'+choice([['IQD','دينار عراقي'],['USD','دولار أمريكي']],x.currency||'IQD')+'</select></label>'+
   field('حد التنبيه عند نقص الكمية ('+units[x.unit||'piece']+')','min_qty',
    x.min_qty??0,'number','min="0" step=".001" required')+
   '<label class="field"><span>الحالة</span><select name="active">'+choice([['true','فعالة'],['false','متوقفة']],String(x.active!==false))+'</select></label>'+
   '<div class="inv-wide inv-form-footer"><button class="btn" type="submit"'+(state.busy?' disabled':'')+'>حفظ المادة</button>'+
   '<button class="btn secondary" type="button" data-inv-dismiss>إلغاء</button></div></form></div></div>';
 }
 function lineBlank(){return {item_id:'',source_line_id:'',quantity:'',unit:'',unit_price:'',description:''};}
 function startDoc(kind){
  state.draft={type:kind,receipt_number:'',document_date:todayLocal(),details:'',
   recipient_name:actor(),return_due_date:'',lines:[lineBlank()]};
  state.tab=kind==='in'?'receive':kind==='out'?'out':'return';render();
 }
 function selectOptions(kind,row){
  if(kind==='return'){
   const opts=outstanding();
   return '<option value="">— اختر مادة من عهدة خرجت سابقاً —</option>'+
    opts.map(o=>'<option value="'+E(o.line.id)+'"'+(row.source_line_id===o.line.id?' selected':'')+'>'+
     E(o.item.name+' · '+o.doc.doc_number+' · متبقي '+stockText(o.item,o.remaining))+'</option>').join('');
  }
  return '<option value="">— اختر المادة —</option>'+state.items.filter(it=>it.active!==false)
   .map(it=>'<option value="'+E(it.id)+'"'+(row.item_id===it.id?' selected':'')+'>'+E(it.code+' — '+it.name)+'</option>').join('');
 }
 function lineUnit(kind,row){
  if(kind==='return'){
   const origin=state.lines.find(x=>x.id===row.source_line_id);
   return origin?.unit||'piece';
  }
  return row.unit||item(row.item_id)?.unit||'piece';
 }
 function docForm(){
  const d=state.draft;if(!d)return '';
  const kind=d.type,stockMode=kind==='out',returnMode=kind==='return';
  const title=kind==='in'?'وصل إدخال مخزني متعدد المواد':stockMode?'طلب إخراج مخزني يحتاج موافقة المدير':'مستند استرجاع مواد دائمية';
  return '<section class="inv-form-card"><div class="inv-section-head"><div><h3>'+title+'</h3><p>اسم الموظف المسجل: <strong>'+E(actor())+'</strong></p></div>'+
   '<button class="btn secondary mini" type="button" data-inv-reset-doc>تفريغ المستند</button></div>'+
   '<form id="invDocForm">'+
   '<div class="inv-form-grid">'+
   (kind==='in'?field('رقم الوصل الأصلي *','receipt_number',d.receipt_number,'text','required maxlength="100"'):'')+
   field('تاريخ المستند','document_date',d.document_date,'date','required')+
   (stockMode?field('اسم الموظف طالب المواد *','recipient_name',d.recipient_name,'text','required maxlength="160"'):'')+
   (stockMode?field('موعد إرجاع العهدة الدائمية','return_due_date',d.return_due_date,'date'):'')+
   '<label class="field inv-wide"><span>تفاصيل أو سبب الحركة</span><textarea name="details" maxlength="2000" rows="2">'+E(d.details||'')+'</textarea></label></div>'+
   '<div class="inv-lines-head"><h4>مواد المستند ('+d.lines.length+')</h4>'+
   '<div class="inline">'+(kind==='in'?'<button type="button" class="btn secondary mini" data-inv-newitem>'+uiIcon('plus',14)+' تعريف مادة جديدة</button>':'')+
    '<button type="button" class="btn secondary mini" data-inv-add-line>'+uiIcon('plus',14)+' إضافة مادة بنفس الوصل</button></div></div>'+
   '<div class="inv-document-lines">'+d.lines.map((r,i)=>{
    const it=item(r.item_id),source=state.lines.find(x=>x.id===r.source_line_id);
    const unit=lineUnit(kind,r),origin=returnMode?item(source?.item_id):it;
    const options=unit==='carton'?[['carton','كارتون'],['piece','قطعة']]:[[unit,units[unit]||'قطعة']];
    let available=returnMode?outstanding().find(o=>o.line.id===r.source_line_id)?.remaining:
     stockMode?stockAvailable(it):null;
    const limit=returnMode?source&&origin?available/(source.factor||1):null:
     stockMode&&it?available/(unit==='carton'?it.pieces_per_carton:1):null;
    return '<div class="inv-document-line" data-inv-line-index="'+i+'">'+
     '<div class="inv-line-top"><strong>المادة '+(i+1)+'</strong><button type="button" data-inv-remove-line="'+i+'"'+
       (d.lines.length===1?' disabled':'')+'>'+uiIcon('x',14)+' إزالة</button></div>'+
     '<div class="inv-line-grid">'+
     '<label class="field inv-line-item"><span>'+ (returnMode?'العهدة المطلوب استرجاعها':'المادة')+' *</span><select name="item_'+i+'" data-inv-item-choice="'+i+'" required>'+
      selectOptions(kind,r)+'</select></label>'+
     '<label class="field"><span>الكمية *</span><input type="number" name="quantity_'+i+'" min=".001" step="'+
      ((unit==='piece'||unit==='carton')?'1':'.001')+'" required value="'+E(r.quantity)+'"'+(limit!=null?' max="'+E(Number(limit.toFixed(3)))+'"':'')+'></label>'+
     '<label class="field"><span>وحدة القياس</span><select name="unit_'+i+'" data-inv-unit-choice="'+i+'"'+(returnMode?' disabled':'')+'>'+
      choice(options,unit)+'</select></label>'+
     (kind==='in'?field('سعر المادة لهذه الحركة','unit_price_'+i,
      r.unit_price===''?it?.price??'':r.unit_price,'number','min="0" step=".01"'):'')+
     '<label class="field inv-line-notes"><span>تفاصيل المادة</span><input type="text" name="description_'+i+'" maxlength="1500" value="'+E(r.description||'')+'"></label>'+
     '</div>'+
     '<small class="inv-availability">'+(origin?
       (returnMode?'المتبقي خارج المخزن: '+stockText(origin,available):
        stockMode?'المتاح للإخراج: '+stockText(it,available):
         'المخزون الحالي: '+stockText(it,it.stock_qty))+
       (it?.unit==='carton'?' · '+E(it.pieces_per_carton)+' قطعة بكل كارتون':''):
        'اختر المادة لعرض وحدة القياس والكمية')+'</small></div>';
   }).join('')+'</div>'+
   '<div class="inv-form-footer"><button class="btn" type="submit"'+(state.busy||!canWrite()?' disabled':'')+'>'+
     (kind==='out'?'إرسال طلب الإخراج إلى المدير':kind==='in'?'تسجيل الإدخال وإضافة المخزون':'تثبيت الاسترجاع وإعادة الكمية للمخزن')+
     '</button></div></form></section>';
 }
 function readDraft(){
  const form=global.document?.querySelector?.('#invDocForm');
  if(!form||!state.draft)return;
  const d=state.draft,fd=new FormData(form);
  for(const key of ['receipt_number','document_date','details','recipient_name','return_due_date']){
   if(fd.has(key))d[key]=String(fd.get(key)||'');
  }
  d.lines=d.lines.map((row,i)=>({
   item_id:String(fd.get('item_'+i)||(!row.item_id?'':row.item_id)),
   source_line_id:d.type==='return'?String(fd.get('item_'+i)||row.source_line_id):'',
   quantity:String(fd.get('quantity_'+i)||''),
   unit:String(fd.get('unit_'+i)||row.unit||''),
   unit_price:String(fd.get('unit_price_'+i)??row.unit_price??''),
   description:String(fd.get('description_'+i)||'')
  }));
 }
 function validateDraft(d){
  if(!d?.lines?.length)throw Error('أضف مادة واحدة على الأقل.');
  const lines=d.lines.map(r=>{
   const it=d.type==='return'?item(state.lines.find(x=>x.id===r.source_line_id)?.item_id):item(r.item_id);
   if(!it)throw Error('يجب تحديد المادة في كل سطر.');
   const quantity=Number(r.quantity);
   if(!Number.isFinite(quantity)||quantity<=0)throw Error('أدخل كمية أكبر من صفر للمادة '+it.name);
   const unit=d.type==='return'?state.lines.find(x=>x.id===r.source_line_id)?.unit:r.unit||it.unit;
   if((unit==='piece'||unit==='carton')&&!Number.isInteger(quantity))
    throw Error('عدد القطع أو الكارتونات يجب أن يكون عدداً صحيحاً.');
   if(d.type==='out'&&inputToBase(it,quantity,unit)>stockAvailable(it)+0.0001)
    throw Error('الكمية المطلوبة من '+it.name+' أكبر من المتوفر.');
   return d.type==='return'?{source_line_id:r.source_line_id,quantity,description:r.description}:
    {item_id:r.item_id,quantity,unit,unit_price:Number(r.unit_price||it.price||0),description:r.description};
  });
  if(d.type==='in'&&!String(d.receipt_number||'').trim())throw Error('أدخل رقم الوصل الأصلي.');
  if(d.type==='out'){
   if(!String(d.recipient_name||'').trim())throw Error('أدخل اسم الموظف الذي طلب المواد.');
   if(lines.some(x=>item(x.item_id)?.item_kind==='returnable')&&!d.return_due_date)
    throw Error('حدد موعد إرجاع المواد الدائمية قبل إرسال الطلب.');
   const requested=new Map();
   for(const x of lines){const it=item(x.item_id),base=inputToBase(it,x.quantity,x.unit);
    requested.set(it.id,(requested.get(it.id)||0)+base);}
   for(const [id,qty] of requested)if(qty>stockAvailable(item(id))+0.0001)
    throw Error('مجموع الكميات المطلوبة من '+item(id).name+' يتجاوز المتوفر.');
  }
  return {receipt_number:d.receipt_number,document_date:d.document_date,
   recipient_name:d.recipient_name,return_due_date:d.return_due_date,details:d.details,lines};
 }
 function cards(){
  const total=state.items.length,low=lowItems().length,pending=pendingDocs().length,
   open=outstanding().length,issued=state.documents.filter(d=>d.status==='issued').length;
  return '<div class="inv-summary">'+[
    ['مواد معرّفة',total,'layers'],['مخزون منخفض',low,'alert'],
    ['طلبات تنتظر الموافقة',pending,'clock'],['عهد لم ترجع',open,'refresh']
   ].map(([name,n,icon])=>'<div class="inv-summary-card"><span>'+uiIcon(icon,18)+' '+name+'</span><strong>'+fmt(n)+'</strong></div>').join('')+'</div>';
 }
 function documentsTable(kindsFilter,limit=150){
  const docs=state.documents.filter(d=>kindsFilter.includes(d.document_type)).slice(0,limit);
  if(!docs.length)return '<div class="inv-empty">لا توجد مستندات من هذا النوع بعد.</div>';
  return '<div class="inv-tablewrap"><table class="inv-table"><thead><tr><th>رقم المستند / الوصل</th><th>النوع والتاريخ</th><th>الموظف</th><th>الحالة</th><th>المواد</th><th>الإجراءات</th></tr></thead><tbody>'+
   docs.map(d=>'<tr><td><strong>'+E(d.doc_number)+'</strong><small>'+E(d.receipt_number||'')+'</small></td>'+
    '<td>'+E(docTypes[d.document_type]||d.document_type)+'<small>'+E(d.document_date)+'</small></td>'+
    '<td>'+E(d.document_type==='out'?d.recipient_name||d.requested_by_name:d.requested_by_name)+'</td>'+
    '<td><span class="inv-status '+E(d.status)+'">'+E(statuses[d.status]||d.status)+'</span>'+
     (d.approved_by_name?'<small>المدير: '+E(d.approved_by_name)+'</small>':'')+'</td>'+
    '<td>'+docLines(d.id).map(l=>E(l.item_name)+' × '+displayQty(l.quantity)+' '+E(units[l.unit]||l.unit)).join('<div class="inv-line-sep"></div>')+'</td>'+
    '<td><div class="inv-doc-actions">'+
     (d.document_type==='out'&&d.status==='pending'&&manager()?
       '<button class="btn mini" data-inv-decision="approve" data-inv-id="'+E(d.id)+'">موافقة</button>'+
       '<button class="btn mini secondary" data-inv-decision="reject" data-inv-id="'+E(d.id)+'">رفض</button>':'')+
     (d.document_type==='out'&&d.status==='approved'&&canWrite()?
       '<button class="btn mini" data-inv-decision="issue" data-inv-id="'+E(d.id)+'">تسليم وإخراج</button>':'')+
     (d.status==='posted'||d.status==='issued'?
       '<button class="btn mini secondary" data-inv-receipt="'+E(d.id)+'">'+uiIcon('printer',14)+' طباعة الوصل</button>':'')+
     (d.status==='pending'&&!manager()?'<small>بانتظار قرار المدير</small>':'')+
     (d.status==='rejected'?'<small>'+E(d.approval_note||'تم رفض الطلب')+'</small>':'')+
     '</div></td></tr>').join('')+'</tbody></table></div>';
 }
 function itemTable(){
  if(!state.items.length)return '<div class="inv-empty">المخزن بعده فارغ. اضغط «تعريف مادة جديدة» حتى تبدأ.</div>';
  return '<div class="inv-tablewrap"><table class="inv-table"><thead><tr>'+
   '<th>رمز المادة / الاسم</th><th>الوحدة</th><th>نوع المادة</th><th>الموجود</th><th>المتاح</th><th>حد التنبيه</th><th>السعر</th><th></th></tr></thead><tbody>'+
   state.items.map(it=>'<tr><td><strong>'+E(it.code)+' — '+E(it.name)+'</strong><small>'+E(it.description||'')+'</small></td>'+
    '<td>'+E(units[it.unit])+(it.unit==='carton'?'<small>'+E(it.pieces_per_carton)+' قطعة / كارتون</small>':'')+'</td>'+
    '<td>'+E(kinds[it.item_kind]||it.item_kind)+'</td>'+
    '<td><strong>'+E(stockText(it,it.stock_qty))+'</strong></td>'+
    '<td>'+E(stockText(it,stockAvailable(it)))+'</td>'+
    '<td>'+E(stockText(it,it.min_stock_qty))+(isLow(it)?'<small class="inv-low-mark">تنبيه نفاد أو نقص</small>':'')+'</td>'+
    '<td>'+E(money(it.price,it.currency))+'</td>'+
    '<td>'+(canWrite()?'<button class="btn secondary mini" data-inv-edititem="'+E(it.id)+'">تعديل</button>':'')+
    '</td></tr>').join('')+'</tbody></table></div>';
 }
 function returnTable(){
  const list=outstanding();
  if(!list.length)return '<div class="inv-empty">ماكو عهد دائمية بانتظار الإرجاع.</div>';
  return '<div class="inv-tablewrap"><table class="inv-table"><thead><tr><th>المادة</th><th>مستند الإخراج</th><th>المستلم</th><th>الكمية خارج المخزن</th><th>موعد الإرجاع</th></tr></thead><tbody>'+
   list.map(x=>'<tr><td><strong>'+E(x.item.name)+'</strong></td><td>'+E(x.doc.doc_number)+'</td>'+
    '<td>'+E(x.doc.recipient_name||x.doc.requested_by_name)+'</td>'+
    '<td>'+E(stockText(x.item,x.remaining))+'</td>'+
    '<td'+(x.doc.return_due_date&&x.doc.return_due_date<todayLocal()?' class="inv-low-mark"':'')+'>'+
      E(x.doc.return_due_date||'غير محدد')+'</td></tr>').join('')+'</tbody></table></div>';
 }
 function auditTable(){
  return '<section class="inv-block"><div class="inv-section-head"><div><h3>الجرد الفعلي حسب الحركات</h3>'+
   '<p>المتوفر محسوب من الوصولات المسجلة والإخراج المُسلّم والاسترجاع. الكميات الموافق عليها ولم تُسلّم تعتبر محجوزة.</p></div></div>'+
   itemTable()+'</section><section class="inv-block"><h3>العهد الدائمية التي لم ترجع</h3>'+returnTable()+'</section>'+
   '<section class="inv-block"><h3>آخر حركات المخزن</h3>'+
   (state.movements.length?'<div class="inv-tablewrap"><table class="inv-table"><thead><tr><th>التاريخ</th><th>المادة</th><th>الحركة</th><th>الكمية</th><th>الموظف</th></tr></thead><tbody>'+
     state.movements.slice(0,100).map(m=>'<tr><td>'+E(String(m.created_at||'').slice(0,16).replace('T',' '))+'</td>'+
      '<td>'+E(item(m.item_id)?.name||'—')+'</td><td>'+E(m.event==='received'?'إدخال':m.event==='issued'?'إخراج':'استرجاع')+'</td>'+
      '<td>'+E((m.delta_qty>0?'+':'')+displayQty(m.delta_qty))+'</td><td>'+E(m.actor_name)+'</td></tr>').join('')+'</tbody></table></div>':
     '<div class="inv-empty">ماكو حركات مسجلة.</div>')+'</section>';
 }
 function notificationsPage(){
  const low=lowItems(),late=overdueReturns();
  return '<section class="inv-block"><h3>تنبيهات المخزون والعهد</h3>'+
   (low.length?'<div class="inv-notice warn"><strong>مواد أوشكت على النفاد أو نفدت</strong>'+
     low.map(it=>'<p>'+E(it.name)+' — متوفر '+E(stockText(it,it.stock_qty))+
      ' · الحد الأدنى '+E(stockText(it,it.min_stock_qty))+'</p>').join('')+'</div>':'')+
   (late.length?'<div class="inv-notice warn"><strong>عهد تجاوزت موعد الإرجاع</strong>'+
      late.map(x=>'<p>'+E(x.item.name)+' — '+E(x.doc.doc_number)+' · '+E(x.doc.recipient_name)+
      ' · '+E(stockText(x.item,x.remaining))+' · '+E(x.doc.return_due_date)+'</p>').join('')+'</div>':'')+
   (manager()&&pendingDocs().length?'<div class="inv-notice"><strong>'+pendingDocs().length+' طلب إخراج ينتظر الموافقة</strong>'+
    '<p>افتح تبويب الإخراج والموافقات لمراجعة تفاصيل المواد واتخاذ القرار.</p></div>':'')+
   (!low.length&&!late.length&&(!manager()||!pendingDocs().length)?'<div class="inv-empty">ماكو تنبيهات نقص أو عهد متأخرة حالياً.</div>':'')+
   '</section><section class="inv-block"><h3>سجل إشعارات المخازن</h3>'+
    (state.notifications.length?state.notifications.map(n=>'<article class="inv-notice-item"><span>'+uiIcon('bell',15)+'</span>'+
     '<div><strong>'+E(n.message)+'</strong><small>'+E(String(n.created_at||'').replace('T',' ').slice(0,19))+'</small></div>'+
     (n.document_id?'<button type="button" class="btn secondary mini" data-inv-finddoc="'+E(n.document_id)+'">فتح المستند</button>':'')+
     '</article>').join(''):'<div class="inv-empty">ماكو إشعارات محفوظة بعد.</div>')+'</section>';
 }
 function page(){
  if(!state.loaded&&!s.demo&&!state.loading&&s.session){
   // Refresh outside the synchronous rendering path.
   Promise.resolve().then(()=>reload());
  }
  let main='';
  if(state.tab==='items')main='<section class="inv-block"><div class="inv-section-head"><div><h3>المواد ووحدات القياس</h3>'+
   '<p>حدد إذا كانت المادة استهلاكية أو دائمية قابلة للإرجاع، وسعر الوحدة وحد التنبيه.</p></div>'+
   (canWrite()?'<button type="button" class="btn" data-inv-newitem>'+uiIcon('plus',15)+' إضافة مادة</button>':'')+'</div>'+itemTable()+'</section>';
  else if(state.tab==='receive')main=(canWrite()?(state.draft?.type==='in'?docForm():
    '<button class="btn" data-inv-newdoc="in">'+uiIcon('plus',15)+' إنشاء وصل إدخال جديد</button>'):'')+
   '<section class="inv-block"><h3>وصولات الإدخال السابقة</h3>'+documentsTable(['in'])+'</section>';
  else if(state.tab==='out')main=(canWrite()?(state.draft?.type==='out'?docForm():
    '<button class="btn" data-inv-newdoc="out">'+uiIcon('plus',15)+' طلب إخراج جديد</button>'):'')+
   '<section class="inv-block"><h3>طلبات الإخراج والموافقات</h3>'+documentsTable(['out'])+'</section>';
  else if(state.tab==='return')main=(canWrite()?(state.draft?.type==='return'?docForm():
    '<button class="btn" data-inv-newdoc="return"'+(!outstanding().length?' disabled':'')+'>'+
     uiIcon('plus',15)+' إنشاء مستند استرجاع</button>'):'')+
   '<section class="inv-block"><h3>العهد المطلوب إرجاعها</h3>'+returnTable()+'</section>'+
   '<section class="inv-block"><h3>مستندات الإرجاع السابقة</h3>'+documentsTable(['return'])+'</section>';
  else if(state.tab==='audit')main=auditTable();
  else if(state.tab==='notices')main=notificationsPage();
  else main='<section class="inv-block"><div class="inv-section-head"><div><h3>حركة المخازن</h3>'+
   '<p>الاستلام مباشرة إلى الرصيد؛ الإخراج يبدأ بطلب ثم موافقة المدير وبعدها التسليم. الاسترجاع يعيد العهدة للمخزون.</p></div></div>'+
   '<div class="inv-quick">'+
   (canWrite()?'<button type="button" class="btn" data-inv-newdoc="in">'+uiIcon('plus',15)+' وصل إدخال</button>'+
    '<button type="button" class="btn secondary" data-inv-newdoc="out">'+uiIcon('receipt',15)+' طلب إخراج</button>':'')+
   '<button type="button" class="btn secondary" data-inv-tab="audit">'+uiIcon('layers',15)+' الجرد والمتوفر</button>'+
   '</div></section>'+
   '<section class="inv-block"><h3>أحدث الطلبات والوصولات</h3>'+documentsTable(['in','out','return'],20)+'</section>'+
   '<section class="inv-block"><h3>نواقص المخزن</h3>'+
    (lowItems().length?lowItems().map(it=>'<p class="inv-low-mark">'+E(it.name)+' · '+E(stockText(it,it.stock_qty))+'</p>').join(''):
      '<p class="subtle">المواد فوق الحد الأدنى المحدد.</p>')+'</section>';
  const overlay=state.itemDraft?itemForm():state.confirm?confirmation():'';
  return '<div class="inv-page">'+
   '<div class="inv-intro"><div><small>RAAFAT / INVENTORY</small><h2>إدارة المخازن والعهد</h2>'+
   '<p>وصولات موثقة · حركة كمية دقيقة · موافقة مدير قبل الإخراج · تتبع الاسترجاع</p></div>'+
   '<button class="btn secondary mini" type="button" data-inv-refresh'+(state.loading?' disabled':'')+'>'+uiIcon('refresh',16)+' تحديث الرصيد</button></div>'+
   cards()+
   '<div class="inv-tabs">'+tabs.map(([k,label])=>'<button type="button" data-inv-tab="'+k+'" class="'+
    (state.tab===k?'active':'')+'">'+E(label)+(k==='out'&&pendingDocs().length?' <b>'+pendingDocs().length+'</b>':'')+
    '</button>').join('')+'</div>'+
   (state.error?'<div class="error">'+E(state.error)+'</div>':'')+
   (state.loading?'<div class="inv-empty">جارِ تحديث المخزن...</div>':'')+
   (!state.loaded&&!s.demo?'<div class="inv-empty">جارِ جلب المواد والمستندات...</div>':main)+overlay+'</div>';
 }
 function confirmation(){
  const info=state.confirm;if(!info)return '';
  const d=doc(info.id);
  return '<div class="overlay inv-overlay"><div class="modal inv-confirm"><div class="modalhead"><h2>'+
   E(info.action==='approve'?'الموافقة على إخراج المواد':info.action==='reject'?'رفض طلب الإخراج':'تأكيد التسليم الفعلي')+
   '</h2><button type="button" class="close" data-inv-dismiss>'+uiIcon('x',17)+'</button></div>'+
   '<p>المستند: <strong>'+E(d?.doc_number||'—')+'</strong></p>'+
   '<p>'+E(info.action==='approve'?'ستصبح المواد محجوزة ولا يمكن تسليمها إلا بعد هذا القرار.':
    info.action==='reject'?'سيُبلغ مقدم الطلب بالرفض ولن تُخصم أي مواد.':
    'بهذا الإجراء ستُخصم الكميات من المخزون نهائياً وتصبح طباعة وصل الإخراج متاحة.')+'</p>'+
   '<label class="field"><span>ملاحظة القرار (اختياري)</span><textarea id="invDecisionNote" rows="2">'+E(info.note||'')+'</textarea></label>'+
   '<div class="actions"><button class="btn" data-inv-confirm-action'+(state.busy?' disabled':'')+'>تأكيد الإجراء</button>'+
    '<button class="btn secondary" type="button" data-inv-dismiss>رجوع</button></div></div></div>';
 }
 function printSheet(){
  const d=doc(state.printDocId);
  if(!d)return '';
  const lines=docLines(d.id);
  const statusAllowed=d.status==='issued'||d.status==='posted';
  if(!statusAllowed)return '';
  const title=docTypes[d.document_type]||'وصل مخزني';
  const total=lines.reduce((n,x)=>n+value(x.quantity)*value(x.unit_price),0);
  return '<div class="inv-print-outer"><article class="inv-print-sheet" dir="rtl">'+
   '<header><small>شركة رأفت للدعاية والإعلان والتجارة العامة</small>'+
   '<h2>'+E(title)+'</h2><strong>رقم المستند: '+E(d.doc_number)+'</strong></header>'+
   '<div class="inv-receipt-meta">'+[
    ['رقم الوصل',d.receipt_number||d.doc_number],
    ['تاريخ المستند',d.document_date],
    ['التاريخ الفعلي',String(d.created_at||'').replace('T',' ').slice(0,16)],
    ['اسم الموظف',d.requested_by_name],
    ['طالب المواد',d.recipient_name||d.requested_by_name],
    ['المدير الموافق',d.approved_by_name||'—'],
    ['موظف التسليم',d.issued_by_name||d.requested_by_name]
   ].map(([label,val])=>'<div><small>'+E(label)+'</small><strong>'+E(val||'—')+'</strong></div>').join('')+'</div>'+
   '<table><thead><tr><th>ت</th><th>المادة / الوصف</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th></tr></thead><tbody>'+
    lines.map((ln,i)=>'<tr><td>'+(i+1)+'</td><td><strong>'+E(ln.item_name)+'</strong><small>'+E(ln.description||'')+'</small></td>'+
     '<td>'+E(displayQty(ln.quantity))+'</td><td>'+E(units[ln.unit]||ln.unit)+
      (ln.unit==='carton'?'<small>'+E(ln.factor)+' قطعة/كارتون</small>':'')+'</td>'+
     '<td>'+E(displayQty(ln.unit_price))+'</td></tr>').join('')+'</tbody></table>'+
   '<div class="inv-receipt-note"><strong>ملاحظات:</strong> '+E(d.details||'—')+'</div>'+
   (d.return_due_date?'<p>موعد إعادة المواد الدائمية: '+E(d.return_due_date)+'</p>':'')+
   '<div class="inv-signatures"><span>توقيع مسؤول المخزن<br>______________</span>'+
    '<span>توقيع الموظف المستلم<br>______________</span>'+
    '<span>اعتماد المدير<br>______________</span></div>'+
   '<footer>هذا المستند صادر من نظام المخازن في شركة رأفت — الحالة: '+E(statuses[d.status])+'</footer>'+
   '</article><div class="inv-print-buttons"><button class="btn" type="button" data-inv-print-now>'+
    uiIcon('printer',16)+' طباعة الوصل / حفظ PDF</button>'+
    '<button class="btn secondary" type="button" data-inv-print-close>إغلاق</button></div></div>';
 }
 function sendDemo(action,payload){
  const u=unique('demo');const now=new Date().toISOString();
  if(action==='save_item'){
   const old=item(payload.id),factor=payload.unit==='carton'?Number(payload.pieces_per_carton):null;
   const record={...old,...payload,id:payload.id||u,pieces_per_carton:factor,
    stock_qty:old?.stock_qty||0,
    min_stock_qty:Number(payload.min_qty||0)*(factor||1),created_at:old?.created_at||now,
    created_by_name:actor(),active:payload.active!==false};
   if(old)Object.assign(old,record);else state.items.unshift(record);
   return {id:record.id};
  }
  if(['receive','request_out','return'].includes(action)){
   const kind=action==='receive'?'in':action==='request_out'?'out':'return';
   const document={id:u,doc_number:kind.toUpperCase()+'-'+String(state.documents.length+1).padStart(6,'0'),
    document_type:kind,status:kind==='out'?'pending':'posted',created_at:now,requested_by_name:actor(),
    requested_by:s.session?.user?.id||'demo-user',recipient_name:payload.recipient_name,
    receipt_number:payload.receipt_number||'',document_date:payload.document_date||todayLocal(),
    return_due_date:payload.return_due_date,details:payload.details};
   const entries=[];
   for(const ln of payload.lines){
    const source=ln.source_line_id?state.lines.find(x=>x.id===ln.source_line_id):null;
    const it=item(source?.item_id||ln.item_id),unit=source?.unit||ln.unit||it.unit;
    const factor=source?.factor||(unit==='carton'?it.pieces_per_carton:1),base=ln.quantity*factor;
    if(kind==='out'&&base>stockAvailable(it))throw Error('الكمية أكبر من المخزون المتاح.');
    if(kind==='return'){
     const outstandingRow=outstanding().find(x=>x.line.id===ln.source_line_id);
     if(!outstandingRow||base>outstandingRow.remaining)throw Error('المادة غير قابلة للاسترجاع أو الكمية أكبر من المتبقي.');
    }
    entries.push({id:unique('line'),document_id:u,item_id:it.id,item_name:it.name,
     quantity:ln.quantity,unit,factor,base_qty:base,unit_price:ln.unit_price||it.price,
     description:ln.description||'',source_line_id:ln.source_line_id||null,created_at:now});
   }
   state.documents.unshift(document);
   for(const ln of entries){state.lines.unshift(ln);
    if(kind!=='out')item(ln.item_id).stock_qty+=ln.base_qty;}
   state.notifications.unshift({id:unique('notice'),event_type:kind==='out'?'issue_requested':kind==='in'?'received':'returned',
    message:docTypes[kind]+' '+document.doc_number+' بواسطة '+actor(),created_at:now});
   return {id:u,doc_number:document.doc_number};
  }
  const target=doc(payload.id);
  if(!target)throw Error('المستند غير موجود.');
  if(['approve','reject'].includes(action)&&!manager())throw Error('الموافقة للمدير حصراً.');
  if(['approve','reject'].includes(action)){
   if(target.status!=='pending')throw Error('تم اتخاذ قرار مسبقاً');
   target.status=action==='approve'?'approved':'rejected';target.approved_by_name=actor();
  }else if(action==='issue'){
   if(target.status!=='approved')throw Error('لم تتم موافقة المدير.');
   for(const line of docLines(target.id)){
    const it=item(line.item_id);if(value(it.stock_qty)<value(line.base_qty))throw Error('المخزون لا يكفي');
    it.stock_qty-=value(line.base_qty);
   }
   target.status='issued';target.issued_by_name=actor();
  }
  state.notifications.unshift({id:unique('notice'),event_type:action,document_id:target.id,
   message:'مستند '+target.doc_number+' — '+action,created_at:now,
   recipient_id:target.requested_by});
  return {id:target.id,status:target.status};
 }
 async function command(action,payload){
  if(state.busy)return;
  state.busy=true;
  try{
   let result;
   if(s.demo)result=sendDemo(action,payload);
   else{
    const response=await s.client.rpc('inventory_action',{p_action:action,p_payload:payload});
    if(response.error)throw response.error;
    result=response.data;
    await reload({silent:true});
   }
   toast(action==='save_item'?'تم حفظ تعريف المادة':
    action==='receive'?'تم الإدخال المخزني وتحديث الرصيد وإرسال الإشعار':
    action==='request_out'?'تم تقديم طلب الإخراج وينتظر موافقة المدير':
    action==='approve'?'تمت موافقة المدير، والمواد جاهزة للتسليم':
    action==='reject'?'تم رفض طلب الإخراج وإشعار الموظف':
    action==='issue'?'تم التسليم وخصم الكمية. تگدر تطبع وصل الإخراج الآن':
    'تم استرجاع العهدة وإعادة الكمية للمخزن');
   if(action==='save_item')state.itemDraft=null;
   if(['receive','request_out','return'].includes(action))state.draft=null;
   if(['approve','reject','issue'].includes(action))state.confirm=null;
   render();
   return result;
  }catch(error){toast(error?.message||String(error),true);}
  finally{state.busy=false;}
 }
 function setTab(id){
  if(!tabs.some(([tab])=>tab===id))return;
  state.tab=id;state.draft=null;render();
 }
 function bind(){
  const document=global.document;
  if(!document||s.view!=='inventory')return;
  document.querySelectorAll('[data-inv-tab]').forEach(button=>button.onclick=()=>setTab(button.dataset.invTab));
  document.querySelectorAll('[data-inv-refresh]').forEach(button=>button.onclick=()=>reload());
  document.querySelectorAll('[data-inv-newdoc]').forEach(button=>button.onclick=()=>startDoc(button.dataset.invNewdoc));
  document.querySelectorAll('[data-inv-newitem]').forEach(button=>button.onclick=()=>{
   readDraft();state.itemDraft={unit:'piece',item_kind:'consumable',price:0,currency:'IQD',min_qty:0,active:true};render();
  });
  document.querySelectorAll('[data-inv-edititem]').forEach(button=>button.onclick=()=>{
   const it=item(button.dataset.invEdititem);if(!it)return;
   state.itemDraft={...it,min_qty:minInSelectedUnit(it)};render();
  });
  document.querySelectorAll('[data-inv-dismiss]').forEach(button=>button.onclick=()=>{
   state.itemDraft=null;state.confirm=null;render();
  });
  const itemF=document.querySelector('#invItemForm');
  if(itemF){
   const select=itemF.elements.namedItem('unit');
   if(select)select.onchange=()=>{
    const fd=new FormData(itemF);
    state.itemDraft={...state.itemDraft,...Object.fromEntries(fd.entries()),
     unit:select.value};
    render();
   };
   itemF.onsubmit=event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(itemF).entries());
    const payload={...values,id:state.itemDraft.id||undefined,
     active:values.active==='true',price:Number(values.price),min_qty:Number(values.min_qty)};
    if(payload.unit==='carton')payload.pieces_per_carton=Number(values.pieces_per_carton);
    command('save_item',payload);
   };
  }
  document.querySelectorAll('[data-inv-reset-doc]').forEach(button=>button.onclick=()=>{
   if(state.draft)startDoc(state.draft.type);
  });
  document.querySelectorAll('[data-inv-add-line]').forEach(button=>button.onclick=()=>{
   readDraft();state.draft.lines.push(lineBlank());render();
  });
  document.querySelectorAll('[data-inv-remove-line]').forEach(button=>button.onclick=()=>{
   readDraft();if(state.draft.lines.length>1)state.draft.lines.splice(Number(button.dataset.invRemoveLine),1);render();
  });
  document.querySelectorAll('[data-inv-item-choice]').forEach(select=>select.onchange=()=>{
   readDraft();const i=Number(select.dataset.invItemChoice),ln=state.draft.lines[i];
   const it=state.draft.type==='return'?
    item(state.lines.find(x=>x.id===ln.source_line_id)?.item_id):item(ln.item_id);
   ln.unit=state.draft.type==='return'?
     state.lines.find(x=>x.id===ln.source_line_id)?.unit||'piece':it?.unit||'piece';
   ln.unit_price=it?.price??0;ln.quantity='';
   render();
  });
  document.querySelectorAll('[data-inv-unit-choice]').forEach(select=>select.onchange=()=>{
   readDraft();const i=Number(select.dataset.invUnitChoice);
   state.draft.lines[i].unit=select.value;render();
  });
  const docF=document.querySelector('#invDocForm');
  if(docF)docF.onsubmit=event=>{
   event.preventDefault();readDraft();
   try{command(state.draft.type==='in'?'receive':state.draft.type==='out'?'request_out':'return',validateDraft(state.draft));}
   catch(e){toast(e.message,true);}
  };
  document.querySelectorAll('[data-inv-decision]').forEach(button=>button.onclick=()=>{
   const id=button.dataset.invId,action=button.dataset.invDecision;
   state.confirm={id,action,note:''};render();
  });
  const confirm=document.querySelector('[data-inv-confirm-action]');
  if(confirm)confirm.onclick=()=>command(state.confirm.action,{id:state.confirm.id,
   note:document.querySelector('#invDecisionNote')?.value||''});
  document.querySelectorAll('[data-inv-receipt]').forEach(button=>button.onclick=()=>{
   state.printDocId=button.dataset.invReceipt;render();
  });
  document.querySelectorAll('[data-inv-finddoc]').forEach(button=>button.onclick=()=>{
   const d=doc(button.dataset.invFinddoc);if(!d)return;
   state.tab=d.document_type==='in'?'receive':d.document_type==='out'?'out':'return';render();
  });
  const close=document.querySelector('[data-inv-print-close]');
  if(close)close.onclick=()=>{state.printDocId=null;render()};
  const print=document.querySelector('[data-inv-print-now]');
  if(print)print.onclick=()=>{if(typeof global.print==='function')global.print()};
 }
 return {page,bind,reload,startPolling,stopPolling,resetDemo,alertCount,alertHtml,printSheet,
  setTab,get state(){return state}};
};
})(window);
