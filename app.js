import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const $=(q,root=document)=>root.querySelector(q);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const money=(n,c)=>fmt(n)+' '+(c==='USD'?'$':'د.ع');
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID();
const PUBLIC_CONFIG={url:'https://gxredstctzkuwgsegykd.supabase.co',key:'sb_publishable_UtbrZOAMhrbBq3eeNaXf2Q_lrRT4K1s'};
const keys=['customers','packages','landlords','properties','ad_sites','campaigns','campaign_sites','leases','lease_installments','campaign_payments','customer_contracts'];
const defs={
 customers:{title:'العملاء',icon:'♟',fields:[['name','اسم العميل','text',true],['phone','رقم الهاتف الأساسي (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة (12 رقم)','text',true],['rental_address','عنوان الاستئجار','text',true],['preferred_package_id','الباقة الإعلانية المطلوبة','lookup:packages',true],['status','الحالة','select',true,['active','inactive','inquiry']],['notes','الملاحظات','textarea']]},
 packages:{title:'الباقات الإعلانية',icon:'◈',fields:[['name','اسم الباقة','text',true],['code','رمز الباقة','text',true],['package_type','نوع الباقة','select',true,['cabin','rooftop']],['width_m','العرض بالمتر','number',true],['height_m','الطول بالمتر','number',true],['area_m2','المساحة الإجمالية م²','computed'],['sides','عدد الأوجه','number',true],['specifications','مواصفات الباقة','textarea'],['default_months','عدد الأشهر الافتراضي','number',true],['price','سعر الباقة','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','ملاحظات','textarea']]},
 landlords:{title:'مالكو المواقع — الأسطح',icon:'▣',fields:[['name','اسم المالك','text',true],['phone','الهاتف (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة','text'],['governorate','المحافظة','text',true],['residential_address','عنوان السكن','text',true],['landmark','أقرب نقطة دالة','text'],['notes','الملاحظات','textarea'],['card_image','صورة البطاقة الموحدة','file']]},
 properties:{title:'عقارات ومساحات الأسطح',icon:'▤',fields:[['landlord_id','صاحب العقار','lookup:landlords',true],['title','اسم السطح / العقار','text',true],['width_m','عرض السطح بالمتر','number',true],['height_m','طول السطح بالمتر','number',true],['area_m2','إجمالي مساحة السطح م²','computed'],['quantity','العدد','number',true],['notes','الملاحظات','textarea']]},
 leases:{title:'عقود إيجار الأسطح',icon:'▧',fields:[['landlord_id','اسم المالك','lookup:landlords',true],['property_id','عقار المالك','lookup:properties',true],['rent_total','إجمالي الإيجار المتفق عليه','number',true],['currency','عملة العقد','select',true,['IQD','USD']],['start_date','تاريخ البداية','date',true],['end_date','تاريخ النهاية','date',true],['grace_days','فترة السماح بالأيام','number',true],['payment_frequency','دورية الدفع','select',true,['annual','semiannual']],['company_representative','ممثل الشركة','text'],['landlord_representative','ممثل المالك','text'],['notes','الملاحظات','textarea']]},
 ad_sites:{title:'المواقع الإعلانية',icon:'⌖',fields:[['code','رمز الموقع','text',true],['name','اسم الموقع','text',true],['site_type','نوع الموقع','select',true,['roadside','rooftop','building','other']],['governorate','المحافظة','text',true],['address','الموقع والعنوان','text',true],['rooftop_property_id','العقار المرتبط (إذا كان سطحاً)','lookup:properties'],['active','حالة الموقع','select',true,['true','false']],['notes','الملاحظات','textarea']]},
 campaigns:{title:'المشاريع والحملات',icon:'✦',fields:[['customer_id','العميل','lookup:customers',true],['title','اسم الحملة','text',true],['package_id','الباقة الإعلانية','lookup:packages'],['months','عدد الأشهر','number',true],['locations','المواقع الإعلانية (أسماء أو رموز المواقع)','textarea'],['price','السعر الإجمالي','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','الملاحظات','textarea']]},
 lease_installments:{title:'دفعات عقود الإيجار',icon:'◉',fields:[]},
 campaign_payments:{title:'دفعات الحملات',icon:'◉',fields:[]},
 campaign_sites:{title:'مواقع الحملات',icon:'⌖',fields:[]},
 customer_contracts:{title:'عقود الزبائن — الكابينات والأسطح',icon:'▣',fields:[['customer_id','الزبون','lookup:customers',true],['package_id','الباقة الإعلانية','lookup:packages',true],['contract_type','نوع العقد','select',true,['cabin','rooftop']],['campaign_id','الحملة المرتبطة (اختياري)','lookup:campaigns'],['site_id','الموقع الإعلاني (اختياري)','lookup:ad_sites'],['start_date','تاريخ بداية العقد','date',true],['end_date','تاريخ نهاية العقد','date',true],['amount','قيمة عقد الزبون','number',true],['currency','العملة','select',true,['IQD','USD']],['company_representative','ممثل شركة رأفت','text'],['customer_representative','ممثل الزبون','text'],['terms','شروط الاتفاق','textarea'],['notes','ملاحظات','textarea']]}
};
const labels={active:'فعال',inactive:'غير فعال',inquiry:'استفسار',IQD:'دينار عراقي',USD:'دولار أمريكي',annual:'سنوي',semiannual:'نصف سنوي',cabin:'كابينة إعلانية',roadside:'شارع / رصيف',rooftop:'سطح',building:'واجهة بناية',other:'أخرى',true:'متاح للحملات',false:'غير متاح'};
const s={client:null,session:null,staff:null,realtimeChannel:null,config:PUBLIC_CONFIG,demo:false,view:'dashboard',data:Object.fromEntries(keys.map(k=>[k,[]])),settings:{usd_iqd:1500},displayCurrency:localStorage.getItem('raafat-display-currency')==='USD'?'USD':'IQD',search:'',filter:'all',editing:null,modal:null,formStep:0,error:'',loading:false};
const lookup=(table,id)=>s.data[table].find(x=>x.id===id);
const nameOf=(table,id)=>lookup(table,id)?.name||lookup(table,id)?.title||'—';
const convert=(v,from,to)=>from===to?Number(v):Number(v)*(from==='USD'?Number(s.settings.usd_iqd):1/Number(s.settings.usd_iqd));
const roundAmount=(n)=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const equivalent=(n,source,to=s.displayCurrency)=>roundAmount(convert(n,source,to));
const displayMoneyText=(n,source)=>money(equivalent(n,source),s.displayCurrency)+(s.displayCurrency!==source?' (الأصل '+money(n,source)+')':'');
const displayMoney=(n,source)=>'<strong class="amount">'+E(money(equivalent(n,source),s.displayCurrency))+'</strong>'+(s.displayCurrency!==source?'<small class="original-amount">الأصل: '+E(money(n,source))+'</small>':'');
const originalCurrency=(k,v)=>v?.currency||((k==='lease_installments')?lookup('leases',v?.lease_id)?.currency:(k==='campaign_payments')?lookup('campaigns',v?.campaign_id)?.currency:null)||'IQD';
const linkedSites=(campaignId)=>s.data.campaign_sites.filter(x=>x.campaign_id===campaignId).map(x=>lookup('ad_sites',x.site_id)).filter(Boolean);
const campaignPaid=(id)=>s.data.campaign_payments.filter(x=>x.campaign_id===id).reduce((a,b)=>a+Number(b.amount||0),0);
const campaignBalance=(v)=>Math.max(0,roundAmount(Number(v.price||0)-campaignPaid(v.id)));
const leaseBalance=(v)=>s.data.lease_installments.filter(x=>x.lease_id===v.id).reduce((a,x)=>a+Math.max(0,Number(x.amount)-Number(x.paid_amount)),0);
function toast(text,bad=false){let x=document.createElement('div');x.className=bad?'error toast':'notice toast';x.textContent=text;document.body.append(x);Object.assign(x.style,{position:'fixed',bottom:'20px',left:'20px',zIndex:20,maxWidth:'min(90vw,500px)',boxShadow:'0 5px 30px #1113'});setTimeout(()=>x.remove(),4500)}

function subscribeToExchangeRate(){
 if(s.demo||!s.staff||!s.client||s.realtimeChannel)return;
 s.realtimeChannel=s.client.channel('raafat-sys-exchange-rate')
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'settings',filter:'id=eq.1'},payload=>{
   if(payload.new?.usd_iqd&&Number(payload.new.usd_iqd)>0){
    if($('#recordForm'))captureForm($('#recordForm'));
    s.settings=payload.new;render();
   }
  })
  .subscribe();
}

async function load(){
 if(s.demo)return render();
 if(!s.client||!s.session)return render();
 s.loading=true;render();
 try{
  const {data:staff,error:se}=await s.client.from('staff_members').select('*').eq('user_id',s.session.user.id).maybeSingle();
  if(se)throw se;
  s.staff=staff?.active?staff:null;
  if(!s.staff){s.error='هذا الحساب لا يملك صلاحية استخدام النظام. أضف المستخدم إلى staff_members كموظف مفعل.';s.loading=false;render();return;}
  const fetchAll=async table=>{
   const all=[];
   for(let start=0;start<100000;start+=1000){
    const {data,error}=await s.client.from(table).select('*').order('created_at',{ascending:false}).range(start,start+999);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<1000)return all;
   }
   throw Error('تجاوز عدد سجلات '+table+' حد التحميل المسموح؛ يلزم ترحيل عرض القائمة إلى صفحات.');
  };
  const requests=await Promise.all([...keys.map(fetchAll),s.client.from('settings').select('*').eq('id',1).maybeSingle()]);
  for(let i=0;i<keys.length;i++)s.data[keys[i]]=requests[i]||[];
  if(requests[keys.length].error)throw requests[keys.length].error;
  s.settings=requests[keys.length].data||s.settings;s.error='';
  subscribeToExchangeRate();
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
function nav(){return [['dashboard','الرئيسية','◫'],['customers','العملاء','♟'],['campaigns','المشاريع والحملات','✦'],['customer_contracts','عقود الزبائن','▣'],['packages','الباقات الإعلانية','◈'],['ad_sites','المواقع الإعلانية','⌖'],['landlords','مالكو الأسطح','▣'],['properties','العقارات والمساحات','▤'],['leases','عقود الإيجار','▧'],['campaign_payments','دفعات الحملات','◉'],['lease_installments','دفعات الإيجار','◉'],['reports','التقارير','▥'],['settings','الإعدادات','⚙']].map(([id,label,icon])=>'<button data-nav="'+id+'" class="'+(id===s.view?'active':'')+'">'+icon+' &nbsp;'+label+'</button>').join('')}
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
 customers:[['name','العميل'],['phone','الهاتف'],['preferred_package_id','الباقة المطلوبة'],['rental_address','العنوان'],['status','الحالة'],['campaign_count','الحملات']],
 packages:[['code','الرمز'],['name','الباقة'],['package_type','النوع'],['area_m2','م²'],['default_months','الأشهر'],['price','السعر']],
 landlords:[['name','المالك'],['phone','الهاتف'],['governorate','المحافظة'],['properties_count','العقارات']],
 properties:[['title','السطح'],['landlord_id','المالك'],['width_m','العرض م'],['height_m','الطول م'],['area_m2','المساحة م²'],['quantity','العدد']],
 ad_sites:[['code','الرمز'],['name','الموقع'],['site_type','النوع'],['governorate','المحافظة'],['active','الحالة'],['rooftop_property_id','العقار المرتبط']],
 leases:[['contract_number','رقم العقد'],['landlord_id','المالك'],['property_id','العقار'],['rent_total','الإيجار'],['lease_balance','المتبقي'],['end_date','النهاية']],
 campaigns:[['title','الحملة'],['customer_id','العميل'],['package_id','الباقة'],['sites','المواقع'],['price','السعر'],['campaign_balance','المتبقي']],
 campaign_payments:[['campaign_id','الحملة'],['paid_at','التاريخ'],['amount','الدفعة']],
 customer_contracts:[['contract_number','رقم العقد'],['customer_id','الزبون'],['package_id','الباقة'],['contract_type','النوع'],['start_date','من'],['end_date','إلى'],['amount','القيمة']],
 lease_installments:[['lease_id','العقد'],['due_date','تاريخ الاستحقاق'],['amount','المبلغ'],['paid_amount','المدفوع']]
};
function showVal(k,row,f){
 let v=row[f];
 if(f==='status')return '<span class="pill '+E(v)+'">'+E(labels[v]||v)+'</span>';
 if(f==='site_type'||f==='contract_type'||f==='package_type')return E(labels[v]||v);
 if(f==='area_m2')return v==null?'—':E(fmt(v))+' م²';
 if(f==='preferred_package_id')return E(nameOf('packages',v));
 if(f==='active')return '<span class="pill '+(v?'active':'inactive')+'">'+E(v?'متاح':'غير متاح')+'</span>';
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
 if(f==='site_id')return E(nameOf('ad_sites',v));
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
 return '<div class="toolbar"><div class="filters"><input class="search" style="width:min(320px,85vw)" id="search" placeholder="بحث في السجلات..." value="'+E(s.search)+'">'+(k==='customers'?'<select id="statusfilter" class="search" style="width:150px">'+[['all','جميع الحالات'],['active','فعال'],['inactive','غير فعال'],['inquiry','استفسار']].map(([v,t])=>'<option value="'+v+'" '+(s.filter===v?'selected':'')+'>'+t+'</option>').join('')+'</select>':'')+'</div><button class="btn" data-new="'+k+'">+ '+(labelsBy[k]||'إضافة جديد')+'</button></div><div class="box tablewrap"><table class="table"><thead><tr>'+columns[k].map(x=>'<th>'+x[1]+'</th>').join('')+'<th>إجراءات</th></tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+columns[k].map(([f])=>'<td>'+showVal(k,row,f)+'</td>').join('')+'<td><button class="linkbtn" data-edit="'+k+':'+row.id+'">تفاصيل / تعديل</button></td></tr>').join(''):'<tr><td colspan="9" class="empty">لا توجد سجلات مطابقة</td></tr>')+'</tbody></table></div><p class="subtle" style="margin-top:13px">عدد السجلات الظاهرة: '+rows.length+'. يتم تحميل كل السجلات الموجودة حالياً بالقاعدة.</p>';
}

function reports(){
 const counts=[['جميع العملاء',s.data.customers.length],['فعال',s.data.customers.filter(x=>x.status==='active').length],['غير فعال',s.data.customers.filter(x=>x.status==='inactive').length],['استفسار',s.data.customers.filter(x=>x.status==='inquiry').length]];
 const receipts=s.data.campaign_payments.reduce((total,p)=>total+convert(p.amount,originalCurrency('campaign_payments',p),s.displayCurrency),0);
 const outstanding=s.data.campaigns.reduce((total,v)=>total+convert(campaignBalance(v),v.currency,s.displayCurrency),0);
 const rents=s.data.lease_installments.reduce((total,v)=>total+convert(Math.max(0,Number(v.amount)-Number(v.paid_amount)),originalCurrency('lease_installments',v),s.displayCurrency),0);
 const late=s.data.lease_installments.filter(x=>x.due_date<=today()&&Number(x.paid_amount)<Number(x.amount));
 return '<div class="cards">'+counts.map(([a,b])=>'<div class="box stat"><small>'+a+'</small><b>'+b+'</b></div>').join('')+'</div><div class="box"><h2>التقرير المالي المترابط</h2><div class="summary"><div><small>الدفعات المستلمة من الحملات</small><b>'+E(money(receipts,s.displayCurrency))+'</b></div><div><small>الذمم المتبقية على العملاء</small><b>'+E(money(outstanding,s.displayCurrency))+'</b></div><div><small>أقساط الإيجار غير المسددة</small><b>'+E(money(rents,s.displayCurrency))+'</b></div><div><small>أقساط إيجار مستحقة حتى اليوم</small><b>'+late.length+'</b></div></div><p class="subtle" style="margin-top:12px">التقرير يعرض بالعملة المختارة بالأعلى وبسعر الصرف المحدد في الإعدادات؛ العقود والدفعات تبقى بعملتها الأصلية.</p><hr><h2>تقرير العملاء</h2><p class="muted">تصدير CSV يتضمن بيانات هوية حساسة — احفظ التقرير بشكل آمن.</p><button class="btn" data-action="exportCustomers">تصدير العملاء CSV</button><hr><h2>التقارير المالية</h2><div class="inline"><button class="btn secondary" data-action="exportCampaigns">تصدير الحملات</button><button class="btn secondary" data-action="exportInstallments">تصدير أقساط الإيجار</button></div></div>';
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
function optionText(k,x){return k==='landlords'||k==='customers'?x.name:k==='properties'?x.title+' — '+nameOf('landlords',x.landlord_id):k==='packages'?x.name+' ('+x.code+' / '+(labels[x.package_type]||x.package_type||'')+')':k==='ad_sites'?x.code+' — '+x.name:k==='leases'||k==='customer_contracts'?x.contract_number:k==='campaigns'?x.title+' — '+nameOf('customers',x.customer_id):'—';}

function fieldCurrency(k,v){
 if(k==='campaign_payments')return v.entry_currency||lookup('campaigns',v.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments')return v.entry_currency||lookup('leases',v.lease_id)?.currency||s.displayCurrency;
 return v.currency||s.displayCurrency;
}
function moneyHint(n,currency){
 if(n===''||n===null||n===undefined||!Number.isFinite(Number(n)))return 'سيظهر المبلغ المقابل هنا';
 let other=currency==='USD'?'IQD':'USD';
 return 'يعادل '+money(roundAmount(convert(n,currency,other)),other)+' • السعر: 1$ = '+fmt(s.settings.usd_iqd)+' د.ع';
}
function fieldHtml(f,v,all){
 let [id,label,type,required,opts]=f, val=v?.[id]??'',req=required?'required':'',k=s.modal?.table;
 if(type==='computed')return '<label class="field"><span>'+E(label)+'</span><output class="computed-area" data-area-output>'+E(fmt(Number(v?.width_m||0)*Number(v?.height_m||0)))+' م²</output><small class="subtle">تُحسب تلقائياً: الطول × العرض</small></label>';
 if(type==='file')return '<label class="field full"><span>'+E(label)+' — PNG/JPEG/WebP حتى 5MB</span><input name="'+id+'" type="file" accept="image/png,image/jpeg,image/webp"><span class="subtle">'+(v?.card_image_path?'صورة محفوظة خاصة':'ترفع إلى مساحة خاصة بعد الحفظ')+'</span></label>';
 if(type==='textarea')return '<label class="field full"><span>'+E(label)+'</span><textarea name="'+id+'">'+E(val)+'</textarea></label>';
 if(type.startsWith('lookup:')){
  let table=type.slice(7),rows=s.data[table].filter(x=>id!=='property_id'||!all?.landlord_id||x.landlord_id===all.landlord_id);
  return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><select name="'+id+'" '+req+'><option value="">— اختر —</option>'+rows.map(x=>'<option value="'+E(x.id)+'" '+(val===x.id?'selected':'')+'>'+E(optionText(table,x))+'</option>').join('')+'</select></label>';
 }
 if(type==='select')return '<label class="field"><span>'+E(label)+'</span><select name="'+id+'" '+req+'>'+opts.map(x=>'<option value="'+x+'" '+(String(val)===String(x)?'selected':'')+'>'+E(labels[x]||x)+'</option>').join('')+'</select></label>';
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
  parts+=list('حملات هذا العميل',s.data.campaigns.filter(x=>x.customer_id===v.id),'campaigns',x=>x.title+' — '+displayMoneyText(x.price,x.currency));
  parts+=list('عقود هذا الزبون',s.data.customer_contracts.filter(x=>x.customer_id===v.id),'customer_contracts',x=>x.contract_number+' — '+(labels[x.contract_type]||x.contract_type));
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaigns|customer_id|'+v.id+'">+ حملة لهذا العميل</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|customer_id|'+v.id+'">+ عقد زبون</button></div>';
 }
 if(k==='landlords'){
  parts+=list('الأسطح وأبعاد كل واحد',s.data.properties.filter(x=>x.landlord_id===v.id),'properties',x=>x.title+' / '+(x.width_m&&x.height_m?fmt(x.width_m)+' × '+fmt(x.height_m)+' م = '+fmt(x.area_m2)+' م²':x.dimensions));
  parts+=list('عقود المالك',s.data.leases.filter(x=>x.landlord_id===v.id),'leases',x=>x.contract_number+' — '+displayMoneyText(x.rent_total,x.currency));
  parts+='<button type="button" class="btn secondary mini" data-new-linked="properties|landlord_id|'+v.id+'">+ إضافة عقار للمالك</button>';
 }
 if(k==='properties'){
  parts+=list('مواقع هذا العقار',s.data.ad_sites.filter(x=>x.rooftop_property_id===v.id),'ad_sites',x=>x.code+' — '+x.name);
  parts+=list('عقود هذا العقار',s.data.leases.filter(x=>x.property_id===v.id),'leases',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="leases|property_id|'+v.id+'">+ عقد للعقار</button>';
 }
 if(k==='packages'){
  parts+=list('الزبائن الراغبون بهذه الباقة',s.data.customers.filter(x=>x.preferred_package_id===v.id),'customers',x=>x.name+' — '+x.phone);
  parts+=list('حملات الباقة',s.data.campaigns.filter(x=>x.package_id===v.id),'campaigns',x=>x.title);
  parts+=list('عقود الزبائن على الباقة',s.data.customer_contracts.filter(x=>x.package_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="customers|preferred_package_id|'+v.id+'">+ إضافة زبون لهذه الباقة</button>';
 }
 if(k==='ad_sites')parts+=list('حملات هذا الموقع',s.data.campaign_sites.filter(x=>x.site_id===v.id).map(x=>lookup('campaigns',x.campaign_id)).filter(Boolean),'campaigns',x=>x.title);
 if(k==='campaigns'){
  parts+=list('عقود الزبائن التابعة للحملة',s.data.customer_contracts.filter(x=>x.campaign_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+=list('دفعات الحملة',s.data.campaign_payments.filter(x=>x.campaign_id===v.id),'campaign_payments',x=>x.paid_at+' — '+displayMoneyText(x.amount,v.currency));
  parts+='<div class="notice">المدفوع: '+E(money(campaignPaid(v.id),v.currency))+' · المتبقي: '+E(money(campaignBalance(v),v.currency))+'</div>';
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaign_payments|campaign_id|'+v.id+'">+ تسجيل دفعة للحملة</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|campaign_id|'+v.id+'">+ إنشاء عقد زبون لهذه الحملة</button></div>';
 }
 if(k==='customer_contracts'){
   parts+='<div class="notice">هذا عقد بين الشركة والزبون، وليس عقد استئجار السطح من مالك البناية.</div><button type="button" class="btn secondary mini" data-customer-preview="'+v.id+'">معاينة وطباعة عقد الزبون</button>';
 }
 if(k==='leases'){
  parts+=list('استحقاقات العقد',s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date)),'lease_installments',x=>x.due_date+' — '+displayMoneyText(x.paid_amount,v.currency)+' / '+displayMoneyText(x.amount,v.currency));
  parts+='<div class="notice">المتبقي في الأقساط: '+E(money(leaseBalance(v),v.currency))+'</div>';
 }
 return parts?'<div class="related-panel"><h3>السجلات المرتبطة</h3>'+parts+'</div>':'';
}



function landlordRoofMarkup(){
 const roofs=s.modal?.roofs||[];
 const rowHtml=roofs.map((r,i)=>'<div class="roof-draft" data-roof-row="'+i+'"><div class="inline"><strong>السطح '+(i+1)+'</strong><button type="button" class="linkbtn" data-remove-roof="'+i+'">حذف السطح</button></div><div class="formgrid"><label class="field full"><span>اسم أو عنوان السطح</span><input required data-roof-field="title" value="'+E(r.title||'')+'" placeholder="مثلاً: سطح بناية شارع الأربعين"></label><label class="field"><span>العرض بالمتر</span><input required type="number" min=".01" step=".01" data-roof-field="width_m" value="'+E(r.width_m||'')+'"></label><label class="field"><span>الطول بالمتر</span><input required type="number" min=".01" step=".01" data-roof-field="height_m" value="'+E(r.height_m||'')+'"></label><div class="field"><span>مساحة هذا السطح</span><output data-roof-area class="computed-area">'+E(fmt(Number(r.width_m||0)*Number(r.height_m||0)))+' م²</output></div><label class="field"><span>العدد</span><input required type="number" min="1" step="1" data-roof-field="quantity" value="'+E(r.quantity||1)+'"></label><label class="field full"><span>ملاحظات السطح</span><textarea data-roof-field="notes">'+E(r.notes||'')+'</textarea></label></div></div>').join('');
 return '<div class="roof-section"><h3>الأسطح التابعة لهذا المالك</h3><p class="subtle">كل سطح يُسجّل بقياسه الخاص (طول وعرض) ويُحسب بالمتر المربع مباشرة، بدون تكرار بيانات المالك. الأسطح المسجلة سابقاً تظهر أسفل بيانات المالك ويمكن تعديل كل واحد منها.</p><div id="roofDrafts">'+rowHtml+'</div><button type="button" class="btn secondary" data-add-roof>+ إضافة سطح بقياس مختلف</button></div>';
}
function captureRoofDrafts(){
 if(s.modal?.table!=='landlords')return;
 const rows=[...document.querySelectorAll('[data-roof-row]')];
 s.modal.roofs=rows.map(row=>{
  const o={};
  row.querySelectorAll('[data-roof-field]').forEach(input=>{o[input.dataset.roofField]=input.value;});
  const original=s.modal.roofs?.[Number(row.dataset.roofRow)];
  if(original?.saved)o.saved=true;
  return o;
 });
}
function updateAreaOutputs(form){
 if(!form)return;
 const width=Number(form.elements.namedItem('width_m')?.value||0);
 const height=Number(form.elements.namedItem('height_m')?.value||0);
 const out=form.querySelector('[data-area-output]');
 if(out)out.textContent=fmt(width*height)+' م²';
 document.querySelectorAll('[data-roof-row]').forEach(row=>{
  const w=Number(row.querySelector('[data-roof-field="width_m"]')?.value||0);
  const h=Number(row.querySelector('[data-roof-field="height_m"]')?.value||0);
  const target=row.querySelector('[data-roof-area]');
  if(target)target.textContent=fmt(w*h)+' م²';
 });
}

function modalHtml(){
 let m=s.modal,k=m.table,v=m.data||{},meta=defs[k];if(m.kind==='preview')return k==='customer_contracts'?customerContractPreview(v):previewHtml(v);
 let fields=meta.fields;
 if(k==='campaigns'){
  const steps=[['العميل والحملة',['customer_id','title']],['الباقة والمواقع',['package_id','locations']],['الأسعار والأشهر',['months','price','currency']],['الدفعات والملاحظات',['notes']],['مراجعة وحفظ',[]]];
  const stepFields=s.formStep<4?fields.filter(x=>steps[s.formStep][1].includes(x[0])).map(f=>fieldHtml(f,v,v)).join(''):review(v);
  const client=lookup('customers',v.customer_id);
  const extra=s.formStep===0&&client?'<div class="notice full"><b>بيانات العميل:</b> '+E(client.name)+' · '+E(client.phone)+' · '+E(client.rental_address)+' · '+E(labels[client.status]||client.status)+'</div>':
   s.formStep===1?selectedSiteCards(v):
   s.formStep===3&&!v.id?'<label class="field"><span>الدفعة الأولى (اختياري، بنفس عملة الحملة)</span><input type="number" name="initial_payment_amount" min="0" step="0.01" value="'+E(v.initial_payment_amount??'')+'"><small class="conversion-hint" data-money-hint="initial_payment_amount">'+E(moneyHint(v.initial_payment_amount||0,v.currency))+'</small></label><label class="field"><span>تاريخ الدفعة</span><input type="date" name="initial_payment_date" value="'+E(v.initial_payment_date||today())+'"></label>':'';
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل':'إضافة')+' حملة إعلانية</h2><button class="close" data-action="close">✕</button></div><div class="steps">'+steps.map((x,i)=>'<span class="step '+(s.formStep===i?'current':'')+'">'+(i+1)+'. '+x[0]+'</span>').join('')+'</div><form id="recordForm"><div class="formgrid">'+stepFields+extra+'</div><div class="actions">'+(s.formStep>0?'<button type="button" class="btn secondary" data-action="prevStep">السابق</button>':'')+'<button class="btn" type="submit">'+(s.formStep<4?'التالي':'حفظ الحملة')+'</button></div></form>'+linkedDetails('campaigns',v)+'</div></div>';
 }
 if(k==='leases'){
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.renewed_from?'تجديد العقد':v.id?'تعديل عقد '+E(v.contract_number):'عقد إيجار جديد')+'</h2><button class="close" data-action="close">✕</button></div><p class="subtle">تُسحب عقارات المالك تلقائياً، وتُولّد الأقساط حسب مدة العقد ودورية الدفع.</p><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ التعديلات':'حفظ العقد وإنشاء الدفعات')+'</button></div></form>'+(v.id?'<div class="inline"><button class="btn secondary" data-preview="'+v.id+'">معاينة / طباعة</button><button class="btn secondary" data-renew="'+v.id+'">تجديد العقد</button></div>':'')+relatedDetails(k,v)+'</div></div>';
 }

 if(k==='customer_contracts'){
  const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id);
  const summary='<div class="notice"><b>الزبون:</b> '+E(customer?.name||'—')+' · <b>الباقة:</b> '+E(pkg?.name||'—')+' · <b>قياسها:</b> '+(pkg?.width_m&&pkg?.height_m?E(fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م / '+fmt(pkg.area_m2)+' م²'):'غير محدد')+'</div>';
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل عقد '+E(v.contract_number):'إضافة عقد زبون جديد')+'</h2><button class="close" data-action="close">✕</button></div><div class="notice">هذا عقد بين <b>شركة رأفت والزبون</b>، من باقة الكابينات أو الأسطح؛ مختلف عن عقد الشركة مع مالك البناية.</div>'+summary+'<form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ تعديلات عقد الزبون':'حفظ عقد الزبون')+'</button></div></form>'+(v.id?'<div class="inline"><button class="btn secondary" data-customer-preview="'+v.id+'">معاينة وطباعة العقد</button></div>':'')+relatedDetails(k,v)+'</div></div>';
 }
 if(k==='lease_installments'||k==='campaign_payments'){
  fields=[k==='lease_installments'?['lease_id','العقد','lookup:leases',true]:['campaign_id','الحملة','lookup:campaigns',true],['entry_currency','عملة إدخال المبلغ','select',true,['IQD','USD']],...(k==='lease_installments'?[['due_date','تاريخ الاستحقاق','date',true]]:[['paid_at','تاريخ الدفع','date',true]]),['amount',k==='lease_installments'?'قيمة القسط':'قيمة الدفعة','number',true],...(k==='lease_installments'?[['paid_amount','المبلغ المسدد','number',true]]:[]),['notes','الملاحظات','textarea']];
 }
 return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+ (v.id?'تعديل':'إضافة')+' — '+meta.title+'</h2><button class="close" data-action="close">✕</button></div><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div>'+(k==='landlords'?landlordRoofMarkup():'')+(k==='campaign_payments'||k==='lease_installments'?'<div class="notice" id="paymentParentInfo"></div>':'')+'<div class="actions"><button class="btn" type="submit">حفظ البيانات</button></div></form>'+(k==='landlords'&&v.card_image_path?'<button class="btn secondary mini" data-card="'+v.id+'">عرض صورة البطاقة المرفوعة</button>':'')+relatedDetails(k,v)+'</div></div>';
}

function review(v){
 let ids=s.modal?.siteIds||[],names=ids.map(id=>lookup('ad_sites',id)).filter(Boolean).map(x=>x.code+' — '+x.name).join('، ');
 return '<div class="summary full">'+[['العميل',nameOf('customers',v.customer_id)],['الحملة',v.title],['الباقة',nameOf('packages',v.package_id)],['المواقع المختارة',names||v.locations||'—'],['الأشهر',v.months],['السعر الأصلي',money(v.price,v.currency)],['ما يعادله',money(equivalent(v.price,v.currency),s.displayCurrency)],['الدفعة الأولى',money(v.initial_payment_amount||0,v.currency)],['الملاحظات',v.notes]].map(([a,b])=>'<div><small>'+E(a)+'</small><b>'+E(b||'—')+'</b></div>').join('')+'</div>';
}


function customerContractPreview(v){
 const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id),site=lookup('ad_sites',v.site_id),campaign=lookup('campaigns',v.campaign_id);
 const dimension=v.package_dimensions_snapshot||(pkg?.width_m&&pkg?.height_m?fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م':'غير مسجل');
 const specs=v.package_specifications_snapshot||pkg?.specifications||'لم يتم إدخال المواصفات';
 const record=(label,value)=>'<div><small>'+E(label)+'</small><strong>'+E(value??'—')+'</strong></div>';
 return '<div class="overlay print-overlay"><div class="modal print-modal"><div class="modalhead noprint"><h2>معاينة عقد الزبون</h2><button class="close" data-action="close">✕</button></div><article class="contract printed-contract" dir="rtl"><div class="contract-head"><h2>شركة رأفت للدعاية والإعلان والتجارة العامة</h2><h3>عقد حجز وتأجير مساحة إعلانية للزبون</h3><strong>'+E(v.contract_number)+'</strong><small>نوع العقد: '+E(labels[v.contract_type]||v.contract_type)+'</small></div><div class="summary">'+record('الطرف الأول','شركة رأفت للدعاية والإعلان والتجارة العامة')+record('الطرف الثاني (الزبون)',v.customer_name_snapshot||customer?.name||'—')+record('رقم هاتف الزبون',customer?.phone||'—')+record('الرقم الوطني',customer?.national_id||'—')+record('اسم الباقة',v.package_name_snapshot||pkg?.name||'—')+record('نوع المساحة',labels[v.contract_type]||v.contract_type)+record('الطول والعرض',dimension)+record('المساحة م²',pkg?.area_m2?fmt(pkg.area_m2):'—')+record('الموقع الإعلاني',v.site_name_snapshot||site?.name||'لم يتم تحديد الموقع')+record('الحملة',campaign?.title||'لا توجد حملة مرتبطة')+record('تاريخ البداية',v.start_date)+record('تاريخ النهاية',v.end_date)+record('القيمة المتفق عليها',money(v.amount,v.currency))+record('ممثل الشركة',v.company_representative||'—')+record('ممثل الزبون',v.customer_representative||'—')+'</div><h3>مواصفات المساحة الإعلانية</h3><p class="legal-text">'+E(specs)+'</p><h3>الشروط المتفق عليها</h3><p class="legal-text">'+E(v.terms||'لم تسجّل شروط إضافية')+'</p><h3>ملاحظات</h3><p class="legal-text">'+E(v.notes||'—')+'</p><div class="contract-sign"><div>توقيع ممثل الشركة<br>____________________</div><div>توقيع الزبون أو ممثله<br>____________________</div></div><p class="print-note">تُراجع هذه المسودة مع الإدارة القانونية قبل اعتمادها كصيغة تعاقد نهائية.</p></article><div class="actions noprint"><button class="btn" data-action="print">طباعة / حفظ PDF</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
}

function previewHtml(v){
 let p=nameOf('properties',v.property_id),l=nameOf('landlords',v.landlord_id);
 let rows=s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 return '<div class="overlay"><div class="modal"><div class="modalhead noprint"><h2>معاينة العقد</h2><button class="close" data-action="close">✕</button></div><article class="contract"><h2 style="text-align:center">شركة رأفت للدعاية والإعلان والتجارة العامة</h2><h3 style="text-align:center">عقد إيجار أسطح — '+E(v.contract_number)+'</h3><div class="summary"><div><small>اسم المالك</small>'+E(l)+'</div><div><small>العقار</small>'+E(p)+'</div><div><small>بداية العقد</small>'+E(v.start_date)+'</div><div><small>نهاية العقد</small>'+E(v.end_date)+'</div><div><small>الأجرة الإجمالية</small>'+E(money(v.rent_total,v.currency))+'</div><div><small>المعادل بسعر الصرف الحالي — للاطلاع فقط</small>'+E(money(equivalent(v.rent_total,v.currency),s.displayCurrency))+'</div><div><small>الدورية</small>'+E(labels[v.payment_frequency])+'</div><div><small>فترة السماح</small>'+E(v.grace_days)+' يوم</div><div><small>ممثل الشركة / المالك</small>'+E(v.company_representative||'—')+' / '+E(v.landlord_representative||'—')+'</div></div><p style="margin-top:18px">ملاحظات وشروط: '+E(v.notes||'لا توجد')+'</p><h3>جدول الدفعات</h3><table><thead><tr><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>المدفوع</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+E(x.due_date)+'</td><td>'+E(money(x.amount,v.currency))+'</td><td>'+E(money(x.paid_amount,v.currency))+'</td></tr>').join('')+'</tbody></table><div style="display:flex;justify-content:space-between;margin-top:55px"><span>توقيع ممثل الشركة: ___________</span><span>توقيع ممثل المالك: ___________</span></div><p class="subtle" style="margin-top:25px">هذه معاينة للبيانات المسجلة وليست بديلاً عن نص عقد قانوني معتمد.</p></article><div class="actions noprint"><button class="btn" data-action="print">طباعة العقد</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
}

function updateMoneyHints(){
 const form=$('#recordForm');if(!form||!s.modal)return;
 const k=s.modal.table,v={...s.modal.data};
 if(form.elements.currency)v.currency=form.elements.currency.value;
 if(form.elements.campaign_id)v.campaign_id=form.elements.campaign_id.value;
 if(form.elements.lease_id)v.lease_id=form.elements.lease_id.value;
 const currency=fieldCurrency(k,v);
 document.querySelectorAll('[data-money-hint]').forEach(span=>{
  const inp=form.elements.namedItem(span.dataset.moneyHint);
  if(inp)span.textContent=moneyHint(inp.value,currency);
 });
 const info=$('#paymentParentInfo');
 if(info){
  if(k==='campaign_payments'){
   const parent=lookup('campaigns',v.campaign_id);
   const paidOthers=s.data.campaign_payments.filter(x=>x.campaign_id===v.campaign_id&&x.id!==v.id).reduce((a,x)=>a+Number(x.amount),0);
   info.textContent=parent?'الحملة: '+parent.title+' | العميل: '+nameOf('customers',parent.customer_id)+' | العملة الأصلية: '+(labels[parent.currency]||parent.currency)+' | المتاح لهذه الدفعة: '+money(Math.max(0,Number(parent.price)-paidOthers),parent.currency):'اختر الحملة أولاً لعرض العميل والمبلغ المتبقي وعملة الدفع.';
  }else{
   const parent=lookup('leases',v.lease_id);
   info.textContent=parent?'العقد: '+parent.contract_number+' | المالك: '+nameOf('landlords',parent.landlord_id)+' | العملة: '+(labels[parent.currency]||parent.currency)+' | إجمالي العقد: '+money(parent.rent_total,parent.currency):'اختر عقد الإيجار أولاً.';
  }
 }
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{s.view=x.dataset.nav;s.search='';s.filter='all';s.modal=null;render()});
 document.querySelectorAll('[data-new]').forEach(x=>x.onclick=()=>openForm(x.dataset.new));
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{let [k,id]=x.dataset.edit.split(':');openForm(k,lookup(k,id))});
 document.querySelectorAll('[data-new-linked]').forEach(x=>x.onclick=()=>{let [k,field,id]=x.dataset.newLinked.split('|');let data={[field]:id};if(field==='property_id')data.landlord_id=lookup('properties',id)?.landlord_id;if(field==='campaign_id'){
   const parent=lookup('campaigns',id);
   if(k==='campaign_payments')data.amount=campaignBalance(parent);
   if(k==='customer_contracts'&&parent){data.customer_id=parent.customer_id;data.package_id=parent.package_id;data.amount=parent.price;data.currency=parent.currency;}
  }if(field==='site_id')data.siteIds=[id];openForm(k,data)});
 document.querySelectorAll('[data-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'leases',data:lookup('leases',x.dataset.preview)};render()});
 document.querySelectorAll('[data-customer-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'customer_contracts',data:lookup('customer_contracts',x.dataset.customerPreview)};render()});
 document.querySelectorAll('[data-print-record]').forEach(x=>x.onclick=()=>{const [table,id]=x.dataset.printRecord.split('|');s.modal={kind:'preview',table,data:lookup(table,id)};render()});
 document.querySelectorAll('[data-renew]').forEach(x=>x.onclick=()=>{let v=lookup('leases',x.dataset.renew);openForm('leases',{...v,id:undefined,contract_number:undefined,renewed_from:v.id,start_date:today(),end_date:'',rent_total:v.rent_total})});
 document.querySelectorAll('[data-card]').forEach(x=>x.onclick=()=>showCard(lookup('landlords',x.dataset.card)));
 document.querySelectorAll('[data-action]').forEach(x=>x.onclick=()=>actions(x.dataset.action));
 document.querySelectorAll('[data-add-roof]').forEach(x=>x.onclick=()=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  captureRoofDrafts();
  s.modal.roofs.push({});
  render();
 });
 document.querySelectorAll('[data-remove-roof]').forEach(x=>x.onclick=()=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  captureRoofDrafts();
  s.modal.roofs.splice(Number(x.dataset.removeRoof),1);
  render();
 });
 document.querySelectorAll('[data-roof-field]').forEach(input=>input.addEventListener('input',()=>updateAreaOutputs($('#recordForm'))));
 if($('#globalCurrency'))$('#globalCurrency').onchange=e=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  s.displayCurrency=e.target.value;
  localStorage.setItem('raafat-display-currency',s.displayCurrency);
  render();
 };
 if($('#search'))$('#search').oninput=e=>{let pos=e.target.selectionStart;s.search=e.target.value;const parent=e.target.closest('.content');parent.innerHTML=listing(s.view);bind();let n=$('#search');n.focus();n.setSelectionRange(pos,pos)};
 if($('#statusfilter'))$('#statusfilter').onchange=e=>{s.filter=e.target.value;render()};
 if($('#connectForm'))$('#connectForm').onsubmit=e=>{e.preventDefault();connect()};
 if($('#recordForm'))$('#recordForm').onsubmit=e=>{e.preventDefault();saveForm(e.target)};
 if($('#settingsForm'))$('#settingsForm').onsubmit=e=>{e.preventDefault();saveSettings(e.target)};
 const form=$('#recordForm'),v=s.modal?.data,k=s.modal?.table;
 if(!form)return;
 for(const name of ['width_m','height_m','quantity']){
  const el=form.elements.namedItem(name);
  if(el)el.addEventListener('input',()=>updateAreaOutputs(form));
 }
 updateAreaOutputs(form);
 document.querySelectorAll('[data-site-id]').forEach(x=>x.onchange=()=>{s.modal.siteIds=[...document.querySelectorAll('[data-site-id]:checked')].map(a=>a.dataset.siteId)});
 for(const name of ['price','rent_total','amount','paid_amount','initial_payment_amount']){
  let input=form.elements.namedItem(name);if(input)input.addEventListener('input',()=>{if(name==='price'&&k==='campaigns')s.modal.autoPrice=false;updateMoneyHints()});
 }
 const currency=form.elements.namedItem('currency');
 if(currency)currency.onchange=()=>{
  const previous=v.currency||s.displayCurrency,next=currency.value;
  for(const name of ['price','rent_total','amount','paid_amount','initial_payment_amount']){
   let input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  captureForm(form);s.modal.data.currency=next;updateMoneyHints();
 };
 const entryCurrency=form.elements.namedItem('entry_currency');
 if(entryCurrency)entryCurrency.onchange=()=>{
  const previous=v.entry_currency||fieldCurrency(k,v),next=entryCurrency.value;
  for(const name of ['amount','paid_amount']){
   const input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  captureForm(form);v.entry_currency=next;updateMoneyHints();
 };
 const owner=form.elements.namedItem('landlord_id');
 if(owner&&k==='leases')owner.onchange=()=>{captureForm(form);v.landlord_id=owner.value;v.property_id='';render()};
 const client=form.elements.namedItem('customer_id');
 if(client&&k==='campaigns')client.onchange=()=>{
  captureForm(form);
  v.customer_id=client.value;
  const pkg=lookup('packages',lookup('customers',client.value)?.preferred_package_id);
  if(pkg&&!v.id){v.package_id=pkg.id;v.price=pkg.price;v.currency=pkg.currency;v.months=pkg.default_months;s.modal.autoPrice=true;}
  render();
 };
 if(client&&k==='customer_contracts')client.onchange=()=>{
  captureForm(form);v.customer_id=client.value;
  if(!v.id){const p=lookup('packages',lookup('customers',client.value)?.preferred_package_id);if(p){v.package_id=p.id;v.contract_type=p.package_type;v.amount=p.price;v.currency=p.currency;v.end_date=addDays(plusMonths(v.start_date||today(),p.default_months),-1);}}
  render();
 };
 const pack=form.elements.namedItem('package_id');
 if(pack&&k==='customer_contracts')pack.onchange=()=>{
  captureForm(form);
  const p=lookup('packages',pack.value);
  v.package_id=pack.value;
  if(p){v.contract_type=p.package_type;v.amount=p.price;v.currency=p.currency;if(!v.id)v.end_date=addDays(plusMonths(v.start_date||today(),p.default_months),-1);}
  render();
 };
 const linkedCampaign=form.elements.namedItem('campaign_id');
 if(linkedCampaign&&k==='customer_contracts')linkedCampaign.onchange=()=>{
  captureForm(form);
  const cam=lookup('campaigns',linkedCampaign.value);
  v.campaign_id=linkedCampaign.value;
  if(cam){v.customer_id=cam.customer_id;if(cam.package_id){const pkg=lookup('packages',cam.package_id);v.package_id=cam.package_id;v.contract_type=pkg?.package_type||'cabin';}v.amount=cam.price;v.currency=cam.currency;}
  render();
 };
 if(pack&&k==='campaigns')pack.onchange=()=>{
  captureForm(form);const p=lookup('packages',pack.value);
  v.package_id=pack.value;
  if(p){v.months=p.default_months;v.price=p.price;v.currency=p.currency;s.modal.autoPrice=true;}
  render();
 };
 const months=form.elements.namedItem('months');
 if(months&&k==='campaigns')months.oninput=()=>{
  if(s.modal.autoPrice){
   let p=lookup('packages',v.package_id),price=form.elements.namedItem('price');
   if(p&&price)price.value=String(roundAmount(convert(p.price,p.currency,currency?.value||v.currency)*Number(months.value||0)/Number(p.default_months||1)));
  }
  updateMoneyHints();
 };
 const parentCampaign=form.elements.namedItem('campaign_id');
 if(parentCampaign&&k==='campaign_payments')parentCampaign.onchange=()=>{
  const old=lookup('campaigns',v.campaign_id),wasEmpty=!v.campaign_id;
  const oldCurrency=v.entry_currency||old?.currency||s.displayCurrency;
  captureForm(form);v.campaign_id=parentCampaign.value;
  const camp=lookup('campaigns',v.campaign_id);
  if(camp){
   if(!v.id&&(wasEmpty||Number(v.amount)===0))v.amount=campaignBalance(camp);
   else v.amount=roundAmount(convert(v.amount,oldCurrency,camp.currency));
   v.entry_currency=camp.currency;
  }
  render();
 };
 const parentLease=form.elements.namedItem('lease_id');
 if(parentLease&&k==='lease_installments')parentLease.onchange=()=>{
  const old=lookup('leases',v.lease_id),oldCurrency=v.entry_currency||old?.currency||s.displayCurrency;
  captureForm(form);v.lease_id=parentLease.value;
  const lease=lookup('leases',v.lease_id);
  if(lease){
   v.amount=roundAmount(convert(v.amount,oldCurrency,lease.currency));
   v.paid_amount=roundAmount(convert(v.paid_amount,oldCurrency,lease.currency));
   v.entry_currency=lease.currency;
  }
  render();
 };
 updateMoneyHints();
}


function openForm(k,row){
 const defaults={status:'inquiry',currency:s.displayCurrency,site_type:'roadside',active:true,default_months:3,months:3,quantity:1,grace_days:0,payment_frequency:'annual',start_date:today(),paid_at:today(),due_date:today(),paid_amount:0,price:0,amount:0};
 let data={...defaults,...(row||{})};
 if(k==='campaign_payments'&&data.campaign_id)data.entry_currency=lookup('campaigns',data.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments'&&data.lease_id)data.entry_currency=lookup('leases',data.lease_id)?.currency||s.displayCurrency;
 if(k==='campaigns'&&!data.package_id&&data.customer_id){data.package_id=lookup('customers',data.customer_id)?.preferred_package_id||'';}
 if(k==='campaigns'&&data.package_id&&!row?.id){let pack=lookup('packages',data.package_id);if(pack){data.price=pack.price;data.currency=pack.currency;data.months=pack.default_months;}}
 if(k==='customer_contracts'){
  if(!data.package_id&&data.customer_id)data.package_id=lookup('customers',data.customer_id)?.preferred_package_id||'';
  if(data.package_id&&!data.id){const p=lookup('packages',data.package_id);if(p){data.contract_type=p.package_type;data.amount=p.price;data.currency=p.currency;}}
  if(!data.end_date&&data.start_date&&data.package_id){const p=lookup('packages',data.package_id);if(p)data.end_date=addDays(plusMonths(data.start_date,p.default_months||1),-1);}
 }
 const ids=k==='campaigns'?(data.siteIds||s.data.campaign_sites.filter(x=>x.campaign_id===data.id).map(x=>x.site_id)):[];
 s.modal={kind:'edit',table:k,data,siteIds:[...ids],roofs:k==='landlords'&&!data.id?[{}]:[],autoPrice:k==='campaigns'&&!data.id};
 s.formStep=0;render();
}
function captureForm(form){
 if(!s.modal||!form)return;
 const data=new FormData(form);
 for(let [k,v] of data.entries())if(!(v instanceof File))s.modal.data[k]=v;
 const siteInputs=[...form.querySelectorAll('[data-site-id]')];
 if(siteInputs.length)s.modal.siteIds=siteInputs.filter(el=>el.checked).map(el=>el.dataset.siteId);
}
function formValidate(k,v){
 if(k==='customers'){
  if(!/^[0-9]{11}$/.test(v.phone)||!/^[0-9]{12}$/.test(v.national_id))throw Error('الهاتف يجب أن يكون 11 رقم، والبطاقة الموحدة 12 رقم');
  if(!v.preferred_package_id||!lookup('packages',v.preferred_package_id))throw Error('حدد باقة إعلانية مسجلة للزبون');
 }
 if(k==='packages'||k==='properties'){
  if(!(Number(v.width_m)>0&&Number(v.height_m)>0))throw Error('أدخل طول وعرض أكبر من صفر بالمتر');
 }
 if(k==='customer_contracts'){
  const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id);
  if(!customer||!pkg)throw Error('اختر زبوناً وباقة إعلانية مسجلين');
  if((v.contract_type||pkg.package_type)!==pkg.package_type)throw Error('نوع عقد الزبون يجب أن يطابق نوع الباقة');
  if(v.end_date<v.start_date||!v.start_date||!v.end_date)throw Error('تأكد من تواريخ عقد الزبون');
  if(!(Number(v.amount)>=0))throw Error('مبلغ عقد الزبون غير صالح');
  if(v.campaign_id){const cam=lookup('campaigns',v.campaign_id);if(!cam||cam.customer_id!==v.customer_id||(cam.package_id&&cam.package_id!==v.package_id))throw Error('الحملة المختارة يجب أن تكون لنفس الزبون والباقة');}
 }
 if(['landlords','customers'].includes(k)&&v.alternate_phone&&!/^[0-9]{11}$/.test(v.alternate_phone))throw Error('الهاتف البديل يجب أن يكون 11 رقم');
 if(k==='landlords'&&(!/^[0-9]{11}$/.test(v.phone)||(v.national_id&&!/^[0-9]{12}$/.test(v.national_id))))throw Error('هاتف المالك 11 رقم، ورقم البطاقة عند إدخاله 12 رقم');
 if(k==='ad_sites'&&v.site_type==='rooftop'&&!v.rooftop_property_id)throw Error('موقع السطح لازم تربطه بعقار مسجل عند مالك');
 if(k==='campaigns'){
  if(!lookup('customers',v.customer_id))throw Error('اختر عميلاً مسجلاً أولاً');
  if(v.package_id&&!lookup('packages',v.package_id))throw Error('الباقة غير موجودة في السجلات');
  if(!s.modal.siteIds?.length&&!String(v.locations||'').trim())throw Error('حدد موقعاً إعلانياً مسجلاً أو أضف موقعاً في الملاحظات النصية');
  if(s.modal.siteIds?.some(id=>!lookup('ad_sites',id)))throw Error('أحد المواقع المختارة غير مسجل');
  if(!(Number(v.months)>0)||Number(v.price)<0)throw Error('أدخل عدد أشهر وسعراً صحيحين');
  if(Number(v.initial_payment_amount||0)>Number(v.price))throw Error('الدفعة الأولى أكبر من سعر الحملة');
  if(v.id&&Number(v.price)<campaignPaid(v.id))throw Error('سعر الحملة أقل من الدفعات المسددة سابقاً');
  const old=lookup('campaigns',v.id);
  if(old&&old.currency!==v.currency&&s.data.campaign_payments.some(x=>x.campaign_id===v.id))throw Error('لا يمكن تغيير عملة حملة لها دفعات محفوظة. استخدم تحويل العرض بالأعلى.');
 }
 if(k==='campaign_payments'){
  const campaign=lookup('campaigns',v.campaign_id);
  if(!campaign)throw Error('اختر حملة مسجلة أولاً');
  if(!(Number(v.amount)>0))throw Error('الدفعة يجب أن تكون أكبر من الصفر');
  const others=s.data.campaign_payments.filter(x=>x.campaign_id===v.campaign_id&&x.id!==v.id).reduce((a,x)=>a+Number(x.amount),0);
  if(Number(v.amount)>Number(campaign.price)-others+0.001)throw Error('قيمة الدفعة أكبر من رصيد الحملة المتبقي');
 }
 if(k==='leases'){
  const property=lookup('properties',v.property_id);
  if(!property||property.landlord_id!==v.landlord_id)throw Error('العقار المختار لا يتبع المالك المسجل');
  if(!v.start_date||!v.end_date||v.end_date<v.start_date)throw Error('تأكد من بداية العقد ونهايته');
  if(Number(v.rent_total)<0)throw Error('إجمالي الإيجار غير صالح');
  const old=lookup('leases',v.id);
  if(old&&s.data.lease_installments.some(x=>x.lease_id===v.id)&&['rent_total','currency','start_date','end_date','grace_days','payment_frequency'].some(field=>String(old[field])!==String(v[field])))throw Error('العقد له أقساط مرتبطة؛ استخدم تجديد العقد للشروط المالية الجديدة.');
 }
 if(k==='lease_installments'){
  if(!lookup('leases',v.lease_id))throw Error('اختر عقداً مسجلاً أولاً');
  if(Number(v.amount)<0||Number(v.paid_amount)<0||Number(v.paid_amount)>Number(v.amount))throw Error('المسدد لا يجوز أن يتجاوز قيمة القسط');
 }
}
function clean(k,v){
 let fields=k==='campaign_payments'?['campaign_id','paid_at','amount','notes']:k==='lease_installments'?['lease_id','due_date','amount','paid_amount','notes']:defs[k].fields.filter(x=>!['file','computed'].includes(x[2])).map(x=>x[0]);
 if(k==='leases')fields.push('renewed_from');

 let o={};
 fields.forEach(f=>{if(v[f]!==undefined){
  let val=v[f];
  if(val===''&&['alternate_phone','national_id','notes','landmark','card_image_path','package_id','rooftop_property_id','renewed_from','company_representative','landlord_representative','locations'].includes(f))val=null;
  if(f==='active')val=(val===true||val==='true');
  o[f]=val;
 }});
 if(k==='landlords'&&v.card_image_path)o.card_image_path=v.card_image_path;
 if(k==='properties'&&v.width_m&&v.height_m)o.dimensions=v.width_m+' × '+v.height_m+' m';
 if(k==='customer_contracts')o.contract_type=lookup('packages',v.package_id)?.package_type||v.contract_type||'cabin';
 return o;
}

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

async function syncCampaignSites(campaignId,siteIds){
 const ids=[...new Set(siteIds||[])];
 const current=s.data.campaign_sites.filter(x=>x.campaign_id===campaignId);
 for(const row of current.filter(x=>!ids.includes(x.site_id))){
  if(s.demo)s.data.campaign_sites=s.data.campaign_sites.filter(x=>x.id!==row.id);
  else{
   const {error}=await s.client.from('campaign_sites').delete().eq('id',row.id);
   if(error)throw error;
  }
 }
 for(const id of ids.filter(x=>!current.some(row=>row.site_id===x))){
  const added=await persist('campaign_sites',{campaign_id:campaignId,site_id:id});
  if(!s.demo)s.data.campaign_sites.push(added);
 }
}
async function saveForm(form){
 if(!s.modal)return;
 const m=s.modal,k=m.table;
 captureForm(form);let v=m.data;
 if(k==='campaigns'&&s.formStep<4){
  if(s.formStep===1&&!m.siteIds?.length&&!String(v.locations||'').trim()){
   toast('حدد موقعاً من القائمة أو أدخل موقعاً إضافياً قبل المتابعة',true);return;
  }
  s.formStep++;render();return;
 }
 try{
  const normalized={...v};
  if(k==='campaign_payments'||k==='lease_installments'){
   const target=k==='campaign_payments'?lookup('campaigns',v.campaign_id)?.currency:lookup('leases',v.lease_id)?.currency;
   if(target){
    const source=v.entry_currency||target;
    normalized.amount=roundAmount(convert(v.amount,source,target));
    if(k==='lease_installments')normalized.paid_amount=roundAmount(convert(v.paid_amount,source,target));
   }
  }
  formValidate(k,normalized);
  let o=clean(k,normalized);
  if(k==='leases'&&!v.id)o.contract_number='';
  if(k==='landlords'){
   let file=form.elements.card_image?.files?.[0];
   if(file){
    if(s.demo)throw Error('رفع صورة البطاقة غير متاح في وضع المعاينة');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880)throw Error('صورة البطاقة يجب أن تكون PNG أو JPEG أو WebP وبحد أقصى 5MB');
    const path=s.session.user.id+'/'+uid()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const {error}=await s.client.storage.from('identity-cards').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;
    o.card_image_path=path;
   }
  }
  const wasNew=!v.id;
  const saved=await persist(k,o,v.id);
  if(k==='campaigns'){
   // The parent record is saved first to get its id; all site records point to that id.
   // Keep the existing record open on partial failure to prevent accidental duplicate creation.
   m.data.id=saved.id;
   await syncCampaignSites(saved.id,m.siteIds);
   if(wasNew&&Number(v.initial_payment_amount)>0&&!m.initialPaymentSaved){
    await persist('campaign_payments',{campaign_id:saved.id,paid_at:v.initial_payment_date||today(),amount:Number(v.initial_payment_amount)});
    m.initialPaymentSaved=true;
   }
  }
  if(k==='leases'&&wasNew){
   m.data.id=saved.id;
   try{await generateInstallments(saved)}
   catch(e){toast('تم إنشاء العقد لكن بعض الأقساط لم تُنشأ: '+e.message,true)}
  }
  s.modal=null;
  if(s.demo){s.view=k;render()}else await load();
  toast('تم حفظ السجل وربطه بنجاح');
 }catch(e){toast(e.message||String(e),true)}
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

function exportCsv(k){
 const rows=s.data[k]||[];
 let headers=[],data=[];
 if(k==='customers'){
  headers=['الاسم','الهاتف','الهاتف البديل','رقم البطاقة الموحدة','عنوان الاستئجار','الحالة','الملاحظات'];
  data=rows.map(x=>[x.name,x.phone,x.alternate_phone,x.national_id,x.rental_address,labels[x.status]||x.status,x.notes]);
 }else if(k==='campaigns'){
  headers=['الحملة','العميل','الباقة','المواقع','الأشهر','السعر الأصلي','العملة','السعر بالدينار','السعر بالدولار','المدفوع','المتبقي'];
  data=rows.map(x=>[x.title,nameOf('customers',x.customer_id),nameOf('packages',x.package_id),linkedSites(x.id).map(s=>s.code+' '+s.name).join('، ')||x.locations,x.months,x.price,x.currency,roundAmount(convert(x.price,x.currency,'IQD')),roundAmount(convert(x.price,x.currency,'USD')),campaignPaid(x.id),campaignBalance(x)]);
 }else if(k==='lease_installments'){
  headers=['العقد','المالك','تاريخ الاستحقاق','القسط الأصلي','المدفوع','العملة','القسط بالدينار','القسط بالدولار','المتبقي'];
  data=rows.map(x=>{let lease=lookup('leases',x.lease_id),cur=lease?.currency||'IQD';return [lease?.contract_number,nameOf('landlords',lease?.landlord_id),x.due_date,x.amount,x.paid_amount,cur,roundAmount(convert(x.amount,cur,'IQD')),roundAmount(convert(x.amount,cur,'USD')),roundAmount(Number(x.amount)-Number(x.paid_amount))]});
 }else return;
 const escaped=(val)=>{
  let value=String(val??'');
  // Prevent spreadsheet formula evaluation if imported into a spreadsheet application.
  if(/^[\s]*[=+\-@]/.test(value))value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
 };
 const csv='\ufeff'+[headers,...data].map(row=>row.map(escaped).join(',')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='raafat-'+k+'-'+today()+'.csv';link.click();URL.revokeObjectURL(url);
}

function actions(a){
 if(a==='demo')return demo();
 if(a==='close'){s.modal=null;return render()}
 if(a==='logout'){if(s.client&&s.realtimeChannel)s.client.removeChannel(s.realtimeChannel);s.realtimeChannel=null;if(s.client)s.client.auth.signOut();s.session=null;s.staff=null;s.demo=false;s.modal=null;s.error='';return render()}
 if(a==='prevStep'){captureForm($('#recordForm'));s.formStep=Math.max(0,s.formStep-1);return render()}
 if(a==='print')return window.print();
 if(a==='exportCustomers')return exportCsv('customers');
 if(a==='exportCampaigns')return exportCsv('campaigns');
 if(a==='exportInstallments')return exportCsv('lease_installments');
}
bootstrap();
