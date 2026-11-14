import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const $=(q,root=document)=>root.querySelector(q);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const money=(n,c)=>fmt(n)+' '+(c==='USD'?'$':'د.ع');
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID();
const PUBLIC_CONFIG={url:'https://gxredstctzkuwgsegykd.supabase.co',key:'sb_publishable_UtbrZOAMhrbBq3eeNaXf2Q_lrRT4K1s'};
const keys=['customers','packages','landlords','properties','ad_sites','campaigns','campaign_sites','leases','lease_installments','campaign_payments'];
const defs={
 customers:{title:'العملاء',icon:'♟',fields:[['name','اسم العميل','text',true],['phone','رقم الهاتف الأساسي (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة (12 رقم)','text',true],['rental_address','عنوان الاستئجار','text',true],['status','الحالة','select',true,['active','inactive','inquiry']],['notes','الملاحظات','textarea']]},
 packages:{title:'الباقات الإعلانية',icon:'◈',fields:[['name','اسم الباقة','text',true],['code','رمز الباقة','text',true],['default_months','عدد الأشهر الافتراضي','number',true],['price','سعر الباقة','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','ملاحظات','textarea']]},
 landlords:{title:'مالكو المواقع — الأسطح',icon:'▣',fields:[['name','اسم المالك','text',true],['phone','الهاتف (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة','text'],['governorate','المحافظة','text',true],['residential_address','عنوان السكن','text',true],['landmark','أقرب نقطة دالة','text'],['notes','الملاحظات','textarea'],['card_image','صورة البطاقة الموحدة','file']]},
 properties:{title:'عقارات ومساحات الأسطح',icon:'▤',fields:[['landlord_id','صاحب العقار','lookup:landlords',true],['title','اسم العقار / عنوانه','text',true],['dimensions','القياس / المساحة','text',true],['quantity','العدد','number',true],['notes','الملاحظات','textarea']]},
 leases:{title:'عقود إيجار الأسطح',icon:'▧',fields:[['landlord_id','اسم المالك','lookup:landlords',true],['property_id','عقار المالك','lookup:properties',true],['rent_total','إجمالي الإيجار المتفق عليه','number',true],['currency','عملة العقد','select',true,['IQD','USD']],['start_date','تاريخ البداية','date',true],['end_date','تاريخ النهاية','date',true],['grace_days','فترة السماح بالأيام','number',true],['payment_frequency','دورية الدفع','select',true,['annual','semiannual']],['company_representative','ممثل الشركة','text'],['landlord_representative','ممثل المالك','text'],['notes','الملاحظات','textarea']]},
 ad_sites:{title:'المواقع الإعلانية',icon:'⌖',fields:[['code','رمز الموقع','text',true],['name','اسم الموقع','text',true],['site_type','نوع الموقع','select',true,['roadside','rooftop','building','other']],['governorate','المحافظة','text',true],['address','الموقع والعنوان','text',true],['rooftop_property_id','العقار المرتبط (إذا كان سطحاً)','lookup:properties'],['notes','الملاحظات','textarea']]},
 campaigns:{title:'المشاريع والحملات',icon:'✦',fields:[['customer_id','العميل','lookup:customers',true],['title','اسم الحملة','text',true],['package_id','الباقة الإعلانية','lookup:packages'],['months','عدد الأشهر','number',true],['locations','المواقع الإعلانية (أسماء أو رموز المواقع)','textarea'],['price','السعر الإجمالي','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','الملاحظات','textarea']]},
 lease_installments:{title:'دفعات عقود الإيجار',icon:'◉',fields:[]},
 campaign_payments:{title:'دفعات الحملات',icon:'◉',fields:[]},
 campaign_sites:{title:'مواقع الحملات',icon:'⌖',fields:[]}
};
const labels={active:'فعال',inactive:'غير فعال',inquiry:'استفسار',IQD:'دينار عراقي',USD:'دولار أمريكي',annual:'سنوي',semiannual:'نصف سنوي',roadside:'شارع / رصيف',rooftop:'سطح',building:'واجهة بناية',other:'أخرى'};
const s={client:null,session:null,staff:null,config:PUBLIC_CONFIG,demo:false,view:'dashboard',data:Object.fromEntries(keys.map(k=>[k,[]])),settings:{usd_iqd:1500},displayCurrency:localStorage.getItem('raafat-display-currency')==='USD'?'USD':'IQD',search:'',filter:'all',editing:null,modal:null,formStep:0,error:'',loading:false};
const lookup=(table,id)=>s.data[table].find(x=>x.id===id);
const nameOf=(table,id)=>lookup(table,id)?.name||lookup(table,id)?.title||'—';
const convert=(v,from,to)=>from===to?Number(v):Number(v)*(from==='USD'?Number(s.settings.usd_iqd):1/Number(s.settings.usd_iqd));
const roundAmount=(n)=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const equivalent=(n,source,to=s.displayCurrency)=>roundAmount(convert(n,source,to));
const displayMoney=(n,source)=>'<strong class="amount">'+E(money(equivalent(n,source),s.displayCurrency))+'</strong>'+(s.displayCurrency!==source?'<small class="original-amount">الأصل: '+E(money(n,source))+'</small>':'');
const originalCurrency=(k,v)=>v?.currency||((k==='lease_installments')?lookup('leases',v?.lease_id)?.currency:(k==='campaign_payments')?lookup('campaigns',v?.campaign_id)?.currency:null)||'IQD';
const linkedSites=(campaignId)=>s.data.campaign_sites.filter(x=>x.campaign_id===campaignId).map(x=>lookup('ad_sites',x.site_id)).filter(Boolean);
const campaignPaid=(id)=>s.data.campaign_payments.filter(x=>x.campaign_id===id).reduce((a,b)=>a+Number(b.amount||0),0);
const campaignBalance=(v)=>Math.max(0,roundAmount(Number(v.price||0)-campaignPaid(v.id)));
const leaseBalance=(v)=>s.data.lease_installments.filter(x=>x.lease_id===v.id).reduce((a,x)=>a+Math.max(0,Number(x.amount)-Number(x.paid_amount)),0);
function toast(text,bad=false){let x=document.createElement('div');x.className=bad?'error toast':'notice toast';x.textContent=text;document.body.append(x);Object.assign(x.style,{position:'fixed',bottom:'20px',left:'20px',zIndex:20,maxWidth:'min(90vw,500px)',boxShadow:'0 5px 30px #1113'});setTimeout(()=>x.remove(),4500)}
async function load(){
 if(s.demo)return render();
 if(!s.client||!s.session)return render();
 s.loading=true;render();
 try{
  const {data:staff,error:se}=await s.client.from('staff_members').select('*').eq('user_id',s.session.user.id).maybeSingle();
  if(se)throw se;
  s.staff=staff?.active?staff:null;
  if(!s.staff){s.error='هذا الحساب لا يملك صلاحية استخدام النظام. أضف المستخدم إلى staff_members كموظف مفعل.';s.loading=false;render();return;}
  const requests=await Promise.all([...keys.map(x=>s.client.from(x).select('*').order('created_at',{ascending:false}).limit(1000)),s.client.from('settings').select('*').eq('id',1).maybeSingle()]);
  for(let i=0;i<keys.length;i++){if(requests[i].error)throw requests[i].error;s.data[keys[i]]=requests[i].data||[]}
  if(requests[keys.length].error)throw requests[keys.length].error;
  s.settings=requests[keys.length].data||s.settings;s.error='';
 }catch(e){s.error=e.message||String(e)}
 s.loading=false;render();
}
function demo(){
 s.demo=true;s.session=null;s.staff={role:'admin'};s.config=null;s.data=Object.fromEntries(keys.map(k=>[k,[]]));s.settings={usd_iqd:1500};
 s.view='dashboard';s.error='';render();
}
async function connect(){
 const url=$('#url').value.trim(),key=$('#key').value.trim(),email=$('#email').value.trim(),password=$('#password').value;
 if(!url.startsWith('https://')||!key){toast('أدخل رابط Supabase ومفتاح publishable الصحيح',true);return}
 try{
 s.client=createClient(url,key);s.config={url,key};localStorage.setItem('raafat-config',JSON.stringify(s.config));
 const {data,error}=await s.client.auth.signInWithPassword({email,password});if(error)throw error;
 s.session=data.session;s.demo=false;await load();
 }catch(e){toast(e.message,true)}
}
async function bootstrap(){
 if(s.config){try{s.client=createClient(s.config.url,s.config.key);const {data}=await s.client.auth.getSession();s.session=data.session;if(s.session)await load();else render()}catch(e){s.error=e.message;render()}}
 else render();
}
function authPage(){return '<div class="welcome"><div class="authbox"><h1>رأفت <span style="color:#167683">Sys.</span></h1><p class="muted">نظام الإدارة المتكامل للدعاية والإعلان</p><p class="subtle">ربط قاعدة البيانات الخاصة بالشركة وتسجيل دخول الموظفين</p>'+ (s.error?'<div class="error">'+E(s.error)+'</div>':'')+
 '<form id="connectForm"><input type="hidden" id="url" value="'+E(s.config?.url||'')+'"><input type="hidden" id="key" value="'+E(s.config?.key||'')+'"><label class="field"><span>البريد الإلكتروني</span><input id="email" type="email" autocomplete="username" required></label><label class="field"><span>كلمة المرور</span><input id="password" type="password" autocomplete="current-password" required></label><button class="btn" type="submit">دخول النظام</button></form><hr><button class="btn secondary" style="width:100%" data-action="demo">تجربة الواجهة بدون حفظ البيانات</button><p class="subtle" style="margin-top:14px">المعاينة مؤقتة وتُمحى بياناتها بمجرد تحديث الصفحة. لا تدخل معلومات حقيقية فيها.</p></div></div>';}
function nav(){return [['dashboard','الرئيسية','◫'],['customers','العملاء','♟'],['campaigns','المشاريع والحملات','✦'],['packages','الباقات الإعلانية','◈'],['ad_sites','المواقع الإعلانية','⌖'],['landlords','مالكو الأسطح','▣'],['properties','العقارات والمساحات','▤'],['leases','عقود الإيجار','▧'],['campaign_payments','دفعات الحملات','◉'],['lease_installments','دفعات الإيجار','◉'],['reports','التقارير','▥'],['settings','الإعدادات','⚙']].map(([id,label,icon])=>'<button data-nav="'+id+'" class="'+(id===s.view?'active':'')+'">'+icon+' &nbsp;'+label+'</button>').join('')}
function shell(content){
 return '<div class="shell"><aside class="sidebar"><div class="brand">رأفت <span style="color:#8fd6c8">SYS</span><small>الدعاية والإعلان والتجارة العامة</small></div><div class="nav">'+nav()+'</div><div class="asidefoot">'+(s.demo?'وضع المعاينة — لا يتم حفظ أي معلومات':'اتصال آمن — حساب موظف')+'</div></aside><main class="main"><header class="top"><div><h1>'+E(s.view==='dashboard'?'لوحة التحكم':s.view==='reports'?'التقارير':s.view==='settings'?'الإعدادات':defs[s.view]?.title||'النظام')+'</h1><small>نظام إدارة شركة رأفت</small></div><div class="inline"><label class="currency-switch">عرض الأسعار <select id="globalCurrency"><option value="IQD" '+(s.displayCurrency==='IQD'?'selected':'')+'>IQD — دينار</option><option value="USD" '+(s.displayCurrency==='USD'?'selected':'')+'>USD — دولار</option></select></label><span class="pill">'+(s.demo?'تجريبي':'متصل')+'</span><button class="btn secondary mini" data-action="logout">'+(s.demo?'خروج':'تسجيل خروج')+'</button></div></header><section class="content">'+(s.error?'<div class="error">'+E(s.error)+'</div>':'')+(s.demo?'<div class="notice">وضع تجربة مؤقت — بيانات المعاينة غير محفوظة. لا تدخل معلومات حساسة هنا.</div>':'')+(s.loading?'<p>جارٍ تحميل البيانات...</p>':content)+'</section></main></div>';
}
const visibleTable=(k)=>s.data[k]||[];
function dashboard(){
 let due=s.data.lease_installments.filter(x=>Number(x.paid_amount)<Number(x.amount)&&x.due_date<=today()).length;
 let paid=s.data.campaign_payments.reduce((a,x)=>a+convert(x.amount,originalCurrency('campaign_payments',x),s.displayCurrency),0);
 const active=s.data.customers.filter(x=>x.status==='active').length;
 return '<div class="cards">'+[['العملاء',s.data.customers.length],['الحملات',s.data.campaigns.length],['المواقع الإعلانية',s.data.ad_sites.length],['أقساط مستحقة',due]].map(([t,n])=>'<div class="box stat"><small>'+t+'</small><b>'+fmt(n)+'</b></div>').join('')+'</div><div class="box"><h2>ملخص النشاط المرتبط</h2><div class="summary"><div><small>العملاء الفعالون</small><b>'+active+'</b></div><div><small>مالكو الأسطح / العقارات</small><b>'+s.data.landlords.length+' / '+s.data.properties.length+'</b></div><div><small>إجمالي دفعات الحملات المحوّل</small><b>'+E(money(paid,s.displayCurrency))+'</b></div><div><small>سعر الدولار المحدد في الإعدادات</small><b>'+fmt(s.settings.usd_iqd)+' د.ع</b></div></div><p class="subtle" style="margin-top:15px">جميع مبالغ العرض تتبدّل فوراً من قائمة العملة بالأعلى؛ المبالغ الأصلية للعقود والدفعات لا تتغير.</p></div>';
}
const columns={
 customers:[['name','العميل'],['phone','الهاتف'],['rental_address','العنوان'],['status','الحالة'],['campaign_count','الحملات']],
 packages:[['code','الرمز'],['name','الباقة'],['default_months','الأشهر'],['price','السعر']],
 landlords:[['name','المالك'],['phone','الهاتف'],['governorate','المحافظة'],['properties_count','العقارات']],
 properties:[['title','العقار'],['landlord_id','المالك'],['dimensions','القياس'],['quantity','العدد']],
 ad_sites:[['code','الرمز'],['name','الموقع'],['site_type','النوع'],['governorate','المحافظة'],['rooftop_property_id','العقار المرتبط']],
 leases:[['contract_number','رقم العقد'],['landlord_id','المالك'],['property_id','العقار'],['rent_total','الإيجار'],['lease_balance','المتبقي'],['end_date','النهاية']],
 campaigns:[['title','الحملة'],['customer_id','العميل'],['package_id','الباقة'],['sites','المواقع'],['price','السعر'],['campaign_balance','المتبقي']],
 campaign_payments:[['campaign_id','الحملة'],['paid_at','التاريخ'],['amount','الدفعة']],
 lease_installments:[['lease_id','العقد'],['due_date','تاريخ الاستحقاق'],['amount','المبلغ'],['paid_amount','المدفوع']]
};
function showVal(k,row,f){
 let v=row[f];
 if(f==='status')return '<span class="pill '+E(v)+'">'+E(labels[v]||v)+'</span>';
 if(f==='site_type')return E(labels[v]||v);
 if(f==='campaign_count')return fmt(s.data.campaigns.filter(x=>x.customer_id===row.id).length);
 if(f==='properties_count')return fmt(s.data.properties.filter(x=>x.landlord_id===row.id).length);
 if(f==='sites')return E(linkedSites(row.id).map(x=>x.code+' — '+x.name).join('، ')||row.locations||'—');
 if(f==='campaign_balance')return displayMoney(campaignBalance(row),row.currency);
 if(f==='lease_balance')return displayMoney(leaseBalance(row),row.currency);
 if(f==='landlord_id')return E(nameOf('landlords',v));
 if(f==='customer_id')return E(nameOf('customers',v));
 if(f==='property_id')return E(nameOf('properties',v));
 if(f==='rooftop_property_id')return E(v?nameOf('properties',v):'—');
 if(f==='package_id')return E(nameOf('packages',v));
 if(f==='campaign_id')return E(nameOf('campaigns',v));
 if(f==='lease_id')return E(lookup('leases',v)?.contract_number||'—');
 if(['price','rent_total','amount','paid_amount'].includes(f))return displayMoney(v,originalCurrency(k,row));
 return E(v);
}
function listing(k){
 const rows=visibleTable(k).filter(x=>{
  let q=s.search.trim().toLocaleLowerCase(),match=!q||JSON.stringify(x).toLocaleLowerCase().includes(q)||
   (x.landlord_id&&nameOf('landlords',x.landlord_id).toLocaleLowerCase().includes(q))||
   (x.customer_id&&nameOf('customers',x.customer_id).toLocaleLowerCase().includes(q));
  return match&&(k!=='customers'||s.filter==='all'||x.status===s.filter);
 });
 let labelsBy={lease_installments:'إضافة دفعة يدوية',campaign_payments:'تسجيل دفعة'};
 return '<div class="toolbar"><div class="filters"><input class="search" style="width:min(320px,85vw)" id="search" placeholder="بحث في السجلات..." value="'+E(s.search)+'">'+(k==='customers'?'<select id="statusfilter" class="search" style="width:150px">'+[['all','جميع الحالات'],['active','فعال'],['inactive','غير فعال'],['inquiry','استفسار']].map(([v,t])=>'<option value="'+v+'" '+(s.filter===v?'selected':'')+'>'+t+'</option>').join('')+'</select>':'')+'</div><button class="btn" data-new="'+k+'">+ '+(labelsBy[k]||'إضافة جديد')+'</button></div><div class="box tablewrap"><table class="table"><thead><tr>'+columns[k].map(x=>'<th>'+x[1]+'</th>').join('')+'<th>إجراءات</th></tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+columns[k].map(([f])=>'<td>'+showVal(k,row,f)+'</td>').join('')+'<td><button class="linkbtn" data-edit="'+k+':'+row.id+'">تفاصيل / تعديل</button></td></tr>').join(''):'<tr><td colspan="9" class="empty">لا توجد سجلات مطابقة</td></tr>')+'</tbody></table></div><p class="subtle" style="margin-top:13px">عدد السجلات الظاهرة: '+rows.length+'. حد التحميل الأولي: 1000 سجل لكل قسم.</p>';
}
function reports(){
 const counts=[['جميع العملاء',s.data.customers.length],['فعال',s.data.customers.filter(x=>x.status==='active').length],['غير فعال',s.data.customers.filter(x=>x.status==='inactive').length],['استفسار',s.data.customers.filter(x=>x.status==='inquiry').length]];
 return '<div class="cards">'+counts.map(([a,b])=>'<div class="box stat"><small>'+a+'</small><b>'+b+'</b></div>').join('')+'</div><div class="box"><h2>تقرير العملاء</h2><p class="muted">تصدير CSV متوافق مع برامج الجداول — يتضمن بيانات الهوية الحساسة، ويجب حفظه في مكان آمن.</p><button class="btn" data-action="exportCustomers">تصدير تقرير العملاء CSV</button><hr><h2>تقرير الأقساط</h2><p>الأقساط غير المسددة: '+s.data.lease_installments.filter(x=>Number(x.paid_amount)<Number(x.amount)).length+'</p><button class="btn secondary" data-action="exportInstallments">تصدير جدول الدفعات CSV</button></div>';
}
function settings(){return '<div class="box" style="max-width:550px"><h2>أسعار الصرف</h2><p class="muted">سعر الدولار يتم تحديده يدوياً من إعدادات الشركة. يتغير تحويل العرض مباشرةً، ولا تتبدل المبالغ الأصلية المحفوظة.</p><form id="settingsForm"><label class="field"><span>قيمة 1 دولار أمريكي بالدينار العراقي</span><input name="usd_iqd" required type="number" min=".0001" step="any" value="'+E(s.settings.usd_iqd)+'"></label><button class="btn" type="submit">حفظ سعر الصرف</button></form><hr><p class="subtle">1 USD = '+fmt(s.settings.usd_iqd)+' IQD</p></div>';}
function accessDenied(){return '<div class="welcome"><div class="authbox"><h1>الصلاحية غير مفعلة</h1><p class="muted">تم تسجيل الدخول، لكن حسابك غير مضاف إلى موظفي نظام رأفت.</p><div class="notice">يجب إضافة معرّف حسابك إلى جدول staff_members من لوحة Supabase بدور admin أو staff، ثم تسجيل الدخول مجدداً.</div><button class="btn" data-action="logout">تسجيل خروج</button></div></div>'}
function render(){
 let target=$('#app');
 let content=s.view==='dashboard'?dashboard():s.view==='reports'?reports():s.view==='settings'?settings():listing(s.view);
 if(!s.demo&&!s.session){target.innerHTML=authPage();}
 else if(!s.demo&&!s.staff&&!s.loading){target.innerHTML=accessDenied();}
 else{target.innerHTML=shell(content)+(s.modal?modalHtml():'');}
 bind();
}
function optionText(k,x){return k==='landlords'?x.name:k==='customers'?x.name:k==='properties'?x.title+' — '+nameOf('landlords',x.landlord_id):k==='packages'?x.name+' ('+x.code+')':k==='leases'?x.contract_number:k==='campaigns'?x.title:'—';}

function fieldCurrency(k,v){
 if(k==='campaign_payments')return lookup('campaigns',v.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments')return lookup('leases',v.lease_id)?.currency||s.displayCurrency;
 return v.currency||s.displayCurrency;
}
function moneyHint(n,currency){
 if(n===''||n===null||n===undefined||!Number.isFinite(Number(n)))return 'سيظهر المبلغ المقابل هنا';
 let other=currency==='USD'?'IQD':'USD';
 return 'يعادل '+money(roundAmount(convert(n,currency,other)),other)+' • السعر: 1$ = '+fmt(s.settings.usd_iqd)+' د.ع';
}
function fieldHtml(f,v,all){
 let [id,label,type,required,opts]=f, val=v?.[id]??'',req=required?'required':'',k=s.modal?.table;
 if(type==='file')return '<label class="field full"><span>'+E(label)+' — PNG/JPEG/WebP حتى 5MB</span><input name="'+id+'" type="file" accept="image/png,image/jpeg,image/webp"><span class="subtle">'+(v?.card_image_path?'صورة محفوظة خاصة':'ترفع إلى مساحة خاصة بعد الحفظ')+'</span></label>';
 if(type==='textarea')return '<label class="field full"><span>'+E(label)+'</span><textarea name="'+id+'">'+E(val)+'</textarea></label>';
 if(type.startsWith('lookup:')){
  let table=type.slice(7),rows=s.data[table].filter(x=>id!=='property_id'||!all?.landlord_id||x.landlord_id===all.landlord_id);
  return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><select name="'+id+'" '+req+'><option value="">— اختر —</option>'+rows.map(x=>'<option value="'+E(x.id)+'" '+(val===x.id?'selected':'')+'>'+E(optionText(table,x))+'</option>').join('')+'</select></label>';
 }
 if(type==='select')return '<label class="field"><span>'+E(label)+'</span><select name="'+id+'" '+req+'>'+opts.map(x=>'<option value="'+x+'" '+(val===x?'selected':'')+'>'+E(labels[x]||x)+'</option>').join('')+'</select></label>';
 let monetary=['price','rent_total','amount','paid_amount','initial_payment_amount'].includes(id);
 let extra=type==='number'?'min="0" step="'+(['months','default_months','quantity','grace_days'].includes(id)?'1':'0.01')+'"':type==='tel'?'inputmode="numeric" pattern="[0-9]{11}" maxlength="11"':id==='national_id'?'inputmode="numeric" pattern="[0-9]{12}" maxlength="12"':'';
 return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><input name="'+id+'" type="'+type+'" '+req+' '+extra+' value="'+E(val)+'">'+(monetary?'<small class="conversion-hint" data-money-hint="'+id+'">'+E(moneyHint(val,fieldCurrency(k,v)))+'</small>':'')+'</label>';
}
function selectedSiteCards(v){
 const selected=s.modal?.siteIds||[];
 const rows=s.data.ad_sites.filter(x=>x.active!==false||selected.includes(x.id));
 if(!rows.length)return '<div class="notice full">لا توجد مواقع مسجلة بعد. أضف المواقع من قسم «المواقع الإعلانية» أولاً، ثم اربطها بهذه الحملة.</div>';
 return '<div class="full"><strong>اختيار المواقع الإعلانية المرتبطة بالحملة</strong><p class="subtle">حدد موقعاً واحداً أو أكثر؛ كل موقع مرتبط بسجله ومعلوماته.</p><div class="site-picker">'+rows.map(x=>'<label class="site-option"><input type="checkbox" data-site-id="'+E(x.id)+'" '+(selected.includes(x.id)?'checked':'')+'><span><b>'+E(x.code)+' — '+E(x.name)+'</b><small>'+E(labels[x.site_type]||x.site_type)+' · '+E(x.governorate)+' · '+E(x.address)+(x.rooftop_property_id?' · '+E(nameOf('properties',x.rooftop_property_id)):'')+'</small></span></label>').join('')+'</div></div>';
}


function relatedDetails(k,v){
 if(!v?.id)return '';
 const list=(label,rows,table,title)=>rows.length?'<div class="related-group"><strong>'+E(label)+' <span class="pill">'+rows.length+'</span></strong>'+rows.map(x=>'<div class="related-item"><span>'+E(title(x))+'</span><button type="button" class="linkbtn" data-edit="'+table+':'+x.id+'">فتح</button></div>').join('')+'</div>':'';
 let parts='';
 if(k==='customers'){
  parts+=list('حملات هذا العميل',s.data.campaigns.filter(x=>x.customer_id===v.id),'campaigns',x=>x.title+' — '+money(x.price,x.currency));
  parts+='<button type="button" class="btn secondary mini" data-new-linked="campaigns|customer_id|'+v.id+'">+ حملة لهذا العميل</button>';
 }
 if(k==='landlords'){
  parts+=list('عقارات المالك',s.data.properties.filter(x=>x.landlord_id===v.id),'properties',x=>x.title+' / '+x.dimensions);
  parts+=list('عقود المالك',s.data.leases.filter(x=>x.landlord_id===v.id),'leases',x=>x.contract_number+' — '+money(x.rent_total,x.currency));
  parts+='<button type="button" class="btn secondary mini" data-new-linked="properties|landlord_id|'+v.id+'">+ إضافة عقار للمالك</button>';
 }
 if(k==='properties'){
  parts+=list('مواقع هذا العقار',s.data.ad_sites.filter(x=>x.rooftop_property_id===v.id),'ad_sites',x=>x.code+' — '+x.name);
  parts+=list('عقود هذا العقار',s.data.leases.filter(x=>x.property_id===v.id),'leases',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="leases|property_id|'+v.id+'">+ عقد للعقار</button>';
 }
 if(k==='packages')parts+=list('حملات الباقة',s.data.campaigns.filter(x=>x.package_id===v.id),'campaigns',x=>x.title);
 if(k==='ad_sites')parts+=list('حملات هذا الموقع',s.data.campaign_sites.filter(x=>x.site_id===v.id).map(x=>lookup('campaigns',x.campaign_id)).filter(Boolean),'campaigns',x=>x.title);
 if(k==='campaigns'){
  parts+=list('دفعات الحملة',s.data.campaign_payments.filter(x=>x.campaign_id===v.id),'campaign_payments',x=>x.paid_at+' — '+money(x.amount,v.currency));
  parts+='<div class="notice">المدفوع: '+E(money(campaignPaid(v.id),v.currency))+' · المتبقي: '+E(money(campaignBalance(v),v.currency))+'</div>';
  parts+='<button type="button" class="btn secondary mini" data-new-linked="campaign_payments|campaign_id|'+v.id+'">+ تسجيل دفعة للحملة</button>';
 }
 if(k==='leases'){
  parts+=list('استحقاقات العقد',s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date)),'lease_installments',x=>x.due_date+' — '+money(x.paid_amount,v.currency)+' / '+money(x.amount,v.currency));
  parts+='<div class="notice">المتبقي في الأقساط: '+E(money(leaseBalance(v),v.currency))+'</div>';
 }
 return parts?'<div class="related-panel"><h3>السجلات المرتبطة</h3>'+parts+'</div>':'';
}

function modalHtml(){
 let m=s.modal, k=m.table,v=m.data||{},meta=defs[k];if(m.kind==='preview')return previewHtml(v);
 let fields=meta.fields;
 if(k==='campaigns'){const steps=[['العميل والحملة',['customer_id','title']],['الباقة والمواقع',['package_id','locations']],['الأسعار والأشهر',['months','price','currency']],['الدفعات والملاحظات',['notes']],['مراجعة وحفظ',[]]];
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل':'إضافة')+' حملة إعلانية</h2><button class="close" data-action="close">✕</button></div><div class="steps">'+steps.map((x,i)=>'<span class="step '+(s.formStep===i?'current':'')+'">'+(i+1)+'. '+x[0]+'</span>').join('')+'</div><form id="recordForm"><div class="formgrid">'+(s.formStep<4?fields.filter(x=>steps[s.formStep][1].includes(x[0])).map(f=>fieldHtml(f,v,v)).join(''):review(v))+(s.formStep===3?'<label class="field"><span>دفعة أولى (اختياري)</span><input type="number" name="initial_payment_amount" min="0" step="any" value="'+E(v.initial_payment_amount||'')+'"></label><label class="field"><span>تاريخ الدفعة</span><input type="date" name="initial_payment_date" value="'+E(v.initial_payment_date||today())+'"></label>':'')+'</div>'+(s.formStep===0&&v.customer_id?'<div class="notice">معلومات العميل: '+E(nameOf('customers',v.customer_id))+' — '+E(lookup('customers',v.customer_id)?.phone||'')+' — '+E(lookup('customers',v.customer_id)?.rental_address||'')+'</div>':'')+'<div class="actions">'+(s.formStep>0?'<button type="button" class="btn secondary" data-action="prevStep">السابق</button>':'')+'<button class="btn" type="submit">'+(s.formStep<4?'التالي':'حفظ الحملة')+'</button></div></form></div></div>';
 }
 if(k==='leases'){return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.renewed_from?'تجديد العقد':v.id?'تعديل عقد '+E(v.contract_number):'عقد إيجار جديد')+'</h2><button class="close" data-action="close">✕</button></div><p class="subtle">تُنشأ دفعات الإيجار تلقائياً حسب مدة العقد ودورية الدفع، مع مراعاة فترة السماح.</p><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ التعديلات':'حفظ العقد وإنشاء الدفعات')+'</button></div></form>'+(v.id?'<hr><button class="btn secondary" data-preview="'+v.id+'">معاينة / طباعة</button> <button class="btn secondary" data-renew="'+v.id+'">تجديد العقد</button>':'')+'</div></div>';}
 if(k==='lease_installments'||k==='campaign_payments'){fields=[k==='lease_installments'?['lease_id','العقد','lookup:leases',true]:['campaign_id','الحملة','lookup:campaigns',true],['due_date', 'تاريخ الاستحقاق','date'],['paid_at','تاريخ الدفع','date'],['amount','المبلغ','number',true],...(k==='lease_installments'?[['paid_amount','المدفوع','number',true]]:[]),['notes','الملاحظات','textarea']].filter(x=>k==='lease_installments'?x[0]!=='paid_at':x[0]!=='due_date');}
 return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+ (v.id?'تعديل':'إضافة')+' — '+meta.title+'</h2><button class="close" data-action="close">✕</button></div><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">حفظ البيانات</button></div></form>'+(k==='landlords'&&v.card_image_path?'<button class="btn secondary mini" data-card="'+v.id+'">عرض صورة البطاقة المرفوعة</button>':'')+'</div></div>';
}
function review(v){return '<div class="summary full">'+[['العميل',nameOf('customers',v.customer_id)],['الحملة',v.title],['الباقة',nameOf('packages',v.package_id)],['المواقع',v.locations],['الأشهر',v.months],['السعر',money(v.price,v.currency)],['الملاحظات',v.notes]].map(([a,b])=>'<div><small>'+a+'</small><b>'+E(b||'—')+'</b></div>').join('')+'</div>'}
function previewHtml(v){
 let p=nameOf('properties',v.property_id),l=nameOf('landlords',v.landlord_id);
 let rows=s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 return '<div class="overlay"><div class="modal"><div class="modalhead noprint"><h2>معاينة العقد</h2><button class="close" data-action="close">✕</button></div><article class="contract"><h2 style="text-align:center">شركة رأفت للدعاية والإعلان والتجارة العامة</h2><h3 style="text-align:center">عقد إيجار أسطح — '+E(v.contract_number)+'</h3><div class="summary"><div><small>اسم المالك</small>'+E(l)+'</div><div><small>العقار</small>'+E(p)+'</div><div><small>بداية العقد</small>'+E(v.start_date)+'</div><div><small>نهاية العقد</small>'+E(v.end_date)+'</div><div><small>الأجرة الإجمالية</small>'+E(money(v.rent_total,v.currency))+'</div><div><small>الدورية</small>'+E(labels[v.payment_frequency])+'</div><div><small>فترة السماح</small>'+E(v.grace_days)+' يوم</div><div><small>ممثل الشركة / المالك</small>'+E(v.company_representative||'—')+' / '+E(v.landlord_representative||'—')+'</div></div><p style="margin-top:18px">ملاحظات وشروط: '+E(v.notes||'لا توجد')+'</p><h3>جدول الدفعات</h3><table><thead><tr><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>المدفوع</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+E(x.due_date)+'</td><td>'+E(money(x.amount,v.currency))+'</td><td>'+E(money(x.paid_amount,v.currency))+'</td></tr>').join('')+'</tbody></table><div style="display:flex;justify-content:space-between;margin-top:55px"><span>توقيع ممثل الشركة: ___________</span><span>توقيع ممثل المالك: ___________</span></div><p class="subtle" style="margin-top:25px">هذه معاينة للبيانات المسجلة وليست بديلاً عن نص عقد قانوني معتمد.</p></article><div class="actions noprint"><button class="btn" data-action="print">طباعة العقد</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{s.view=x.dataset.nav;s.search='';s.filter='all';s.modal=null;render()});
 document.querySelectorAll('[data-new]').forEach(x=>x.onclick=()=>openForm(x.dataset.new));
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{let [k,id]=x.dataset.edit.split(':');openForm(k,lookup(k,id))});
 document.querySelectorAll('[data-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',data:lookup('leases',x.dataset.preview)};render()});
 document.querySelectorAll('[data-renew]').forEach(x=>x.onclick=()=>{let v=lookup('leases',x.dataset.renew);openForm('leases',{...v,id:undefined,contract_number:undefined,renewed_from:v.id,start_date:today(),end_date:'',rent_total:v.rent_total})});
 document.querySelectorAll('[data-card]').forEach(x=>x.onclick=()=>showCard(lookup('landlords',x.dataset.card)));
 document.querySelectorAll('[data-action]').forEach(x=>x.onclick=()=>actions(x.dataset.action));
 if($('#search'))$('#search').oninput=e=>{let pos=e.target.selectionStart;s.search=e.target.value;const parent=e.target.closest('.content');parent.innerHTML=listing(s.view);bind();let n=$('#search');n.focus();n.setSelectionRange(pos,pos)};
 if($('#statusfilter'))$('#statusfilter').onchange=e=>{s.filter=e.target.value;render()};
 if($('#connectForm'))$('#connectForm').onsubmit=e=>{e.preventDefault();connect()};
 if($('#recordForm'))$('#recordForm').onsubmit=e=>{e.preventDefault();saveForm(e.target)};
 if($('#settingsForm'))$('#settingsForm').onsubmit=e=>{e.preventDefault();saveSettings(e.target)};
 if($('#recordForm')&&s.modal?.table==='leases'){
 let owner=$('[name=landlord_id]');if(owner)owner.onchange=()=>{captureForm($('#recordForm'));s.modal.data.landlord_id=owner.value;s.modal.data.property_id='';render()};
 }
 if($('#recordForm')&&s.modal?.table==='campaigns'){
  let cust=$('[name=customer_id]');if(cust)cust.onchange=()=>{s.modal.data.customer_id=cust.value;render()};
  let pack=$('[name=package_id]');if(pack)pack.onchange=()=>{let p=lookup('packages',pack.value);if(p){s.modal.data.package_id=p.id;s.modal.data.months=p.default_months;s.modal.data.price=p.price;s.modal.data.currency=p.currency}};
 }
}
function openForm(k,row){let defaults={status:'inquiry',currency:'IQD',default_months:3,months:3,quantity:1,grace_days:0,payment_frequency:'annual',start_date:today(),paid_at:today(),due_date:today(),paid_amount:0,price:0,amount:0};s.modal={kind:'edit',table:k,data:{...defaults,...(row||{})}};s.formStep=0;render()}
function captureForm(form){if(!s.modal)return;let data=new FormData(form);for(let [k,v] of data.entries()){if(!(v instanceof File))s.modal.data[k]=v}}
function formValidate(k,v){if(k==='customers'&&(!/^[0-9]{11}$/.test(v.phone)||!/^[0-9]{12}$/.test(v.national_id)))throw Error('رقم الهاتف يجب أن يكون 11 رقم، والبطاقة الموحدة 12 رقم');
 if(['landlords','customers'].includes(k)&&v.alternate_phone&&!/^[0-9]{11}$/.test(v.alternate_phone))throw Error('الهاتف البديل يجب أن يكون 11 رقم');
 if(k==='landlords'&&!/^[0-9]{11}$/.test(v.phone))throw Error('رقم هاتف المالك يجب أن يكون 11 رقم');
 if(k==='leases'&&new Date(v.end_date)<new Date(v.start_date))throw Error('تاريخ انتهاء العقد يجب أن يكون بعد البداية');
 if(k==='leases'&&lookup('properties',v.property_id)?.landlord_id!==v.landlord_id)throw Error('العقار ليس تابعاً للمالك المختار');
}
function clean(k,v){let fields=k==='campaign_payments'?['campaign_id','paid_at','amount','notes']:k==='lease_installments'?['lease_id','due_date','amount','paid_amount','notes']:defs[k].fields.filter(x=>x[2]!=='file').map(x=>x[0]);if(k==='leases')fields.push('renewed_from');let o={};fields.forEach(f=>{if(v[f]!==undefined){let val=v[f];if(val===''&&['alternate_phone','national_id','notes','landmark','card_image_path','package_id','renewed_from','company_representative','landlord_representative'].includes(f))val=null;o[f]=val}});if(k==='landlords'&&v.card_image_path)o.card_image_path=v.card_image_path;return o}
async function persist(k,o,id){
 if(s.demo){if(k==='leases'&&!id&&!o.contract_number)o.contract_number='RA-'+(1+Math.max(0,...s.data.leases.map(x=>Number((x.contract_number||'').replace('RA-',''))||0)));let record={...o,id:id||uid(),created_at:today()};let idx=s.data[k].findIndex(x=>x.id===id);if(idx>=0)s.data[k][idx]={...s.data[k][idx],...record};else s.data[k].unshift(record);return record;}
 const request=id?s.client.from(k).update(o).eq('id',id).select().single():s.client.from(k).insert(o).select().single();let {data,error}=await request;if(error)throw error;return data;
}
function plusMonths(date,months){let d=new Date(date+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);let max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString().slice(0,10)}
function addDays(date,n){let d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)}
async function generateInstallments(v){let interval=v.payment_frequency==='semiannual'?6:12,start=v.start_date,end=v.end_date,dates=[];for(let i=0;i<240;i+=interval){let date=plusMonths(start,i);if(date>end)break;dates.push(addDays(date,v.grace_days||0))}
 if(!dates.length)dates=[addDays(start,v.grace_days||0)];
 let total=Math.round(Number(v.rent_total)*100),base=Math.floor(total/dates.length),remainder=total-base*dates.length;
 let records=dates.map((date,i)=>({lease_id:v.id,due_date:date,amount:(base+(i===dates.length-1?remainder:0))/100,paid_amount:0}));
 for(let rec of records)await persist('lease_installments',rec);
}
async function saveForm(form){
 let m=s.modal,k=m.table;captureForm(form);let v=m.data;
 if(k==='campaigns'&&s.formStep<4){s.formStep++;render();return}
 try{
 formValidate(k,v);let o=clean(k,v);
 if(k==='leases'&&!v.id){o.contract_number='';}
 if(k==='landlords'){
  let file=form.elements.card_image?.files?.[0];
  if(file){if(s.demo)throw Error('رفع صورة بطاقة حقيقية غير مسموح في وضع المعاينة');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880)throw Error('الصورة يجب أن تكون PNG أو JPEG أو WebP وبحجم أقل من 5MB');
   let path=s.session.user.id+'/'+uid()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
   let {error}=await s.client.storage.from('identity-cards').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;
   o.card_image_path=path;
  }
 }
 let saved=await persist(k,o,v.id);
 if(k==='campaigns'&&!v.id&&Number(v.initial_payment_amount)>0)await persist('campaign_payments',{campaign_id:saved.id,paid_at:v.initial_payment_date||today(),amount:Number(v.initial_payment_amount)});
 if(k==='leases'&&!v.id){try{await generateInstallments(saved)}catch(e){toast('تم حفظ العقد لكن فشل إنشاء دفعاته: '+e.message,true)}}
 s.modal=null;
 if(s.demo){s.view=k;render()}else await load();
 toast('تم حفظ السجل بنجاح');
 }catch(e){toast(e.message,true)}
}
async function saveSettings(form){const rate=Number(new FormData(form).get('usd_iqd'));if(!(rate>0))return toast('سعر الصرف يجب أن يكون أكبر من الصفر',true);
 try{if(!s.demo){let {error}=await s.client.from('settings').update({usd_iqd:rate,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error}s.settings.usd_iqd=rate;render();toast('تم تحديث سعر الصرف')}catch(e){toast(e.message,true)}
}
async function showCard(v){if(!v?.card_image_path||s.demo)return;
 let {data,error}=await s.client.storage.from('identity-cards').createSignedUrl(v.card_image_path,60);
 if(error)return toast(error.message,true);
 // Open transient link rather than embedding sensitive ID images in the document.
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}
function exportCsv(k){let rows=s.data[k],cols=k==='customers'?['name','phone','alternate_phone','national_id','rental_address','status','notes']:['lease_id','due_date','amount','paid_amount','notes'];
 let csv='\ufeff'+[cols.join(','),...rows.map(r=>cols.map(col=>'"'+String(r[col]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');
 let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));let a=document.createElement('a');a.href=url;a.download='raafat-'+k+'-'+today()+'.csv';a.click();URL.revokeObjectURL(url);
}
function actions(a){
 if(a==='demo')return demo();
 if(a==='close'){s.modal=null;return render()}
 if(a==='logout'){if(s.client)s.client.auth.signOut();s.session=null;s.staff=null;s.demo=false;s.modal=null;s.error='';return render()}
 if(a==='prevStep'){captureForm($('#recordForm'));s.formStep=Math.max(0,s.formStep-1);return render()}
 if(a==='print')return window.print();
 if(a==='exportCustomers')return exportCsv('customers');
 if(a==='exportInstallments')return exportCsv('lease_installments');
}
bootstrap();
