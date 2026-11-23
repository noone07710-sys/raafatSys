/* Raafat Sys — canonical report datasets for Excel, PDF and on-screen totals.
 * All joins are by immutable IDs, never by names, and never manufacture unassigned sites.
 * Phone numbers, IDs, site codes and contract references remain strings in exported files.
 */
(function(scope){
 'use strict';
 const TABLES=Object.freeze({
  customers:['customers','campaigns','campaign_sites','ad_sites','packages','customer_contracts','campaign_payments','properties','landlords'],
  landlords:['landlords','properties','ad_sites','packages','leases','lease_installments'],
  finance:['customers','campaigns','campaign_payments','campaign_sites','ad_sites','packages','landlords','properties','leases','lease_installments','company_expenses']
 });
 const text=v=>v===null||v===undefined?'':String(v);
 const number=v=>v===null||v===undefined||v===''?0:Number(v);
 const money=v=>Math.round((number(v)+Number.EPSILON)*100)/100;
 const counter=(rows,key)=>{const m=new Map();for(const r of rows){const id=r?.[key];if(id)m.set(id,(m.get(id)||0)+1)}return m};
 function build(type,records,opts={}){
  if(!TABLES[type])throw Error('نوع التقرير غير مدعوم');
  if(!records||typeof records!=='object')throw Error('مصادر التقرير غير مكتملة');
  for(const table of TABLES[type])if(!Array.isArray(records[table]))throw Error('مصدر البيانات ناقص: '+table);
  const fx=Number(opts.exchangeRate),view=opts.currency==='USD'?'USD':'IQD';
  if(!Number.isFinite(fx)||fx<=0)throw Error('سعر الصرف غير صالح. صححه من إعدادات الشركة قبل التصدير.');
  const rows=k=>records[k]||[];
  const byId={};for(const table of TABLES[type])byId[table]=new Map(rows(table).map(r=>[r.id,r]));
  const get=(table,id)=>byId[table]?.get(id);
  const name=(table,id)=>get(table,id)?.name||get(table,id)?.title||'';
  const fmtCurrency=(n,from,to=view)=>{
   if(!['IQD','USD'].includes(from))throw Error('العملة المسجلة غير صالحة: '+text(from));
   return money(from===to?n:from==='USD'?number(n)*fx:number(n)/fx);
  };
  const cur=val=>val==='USD'?'USD':val==='IQD'?'IQD':null;
  const transfer=(amount,currency)=>fmtCurrency(amount,cur(currency));
  const ownerProperties=new Map(),propertySites=new Map(),customerCampaigns=new Map(),campaignLinks=new Map(),
   campaignPayments=new Map(),customerContracts=new Map(),leaseInstallments=new Map(),landlordLeases=new Map();
  const group=(map,id,value)=>{if(!id)return;(map.get(id)||map.set(id,[]).get(id)).push(value)};
  rows('properties').forEach(p=>group(ownerProperties,p.landlord_id,p));
  rows('ad_sites').forEach(site=>group(propertySites,site.rooftop_property_id,site));
  rows('campaigns').forEach(cam=>group(customerCampaigns,cam.customer_id,cam));
  rows('campaign_sites').forEach(link=>group(campaignLinks,link.campaign_id,link));
  rows('campaign_payments').forEach(p=>group(campaignPayments,p.campaign_id,p));
  rows('customer_contracts').forEach(c=>group(customerContracts,c.customer_id,c));
  rows('leases').forEach(c=>group(landlordLeases,c.landlord_id,c));
  rows('lease_installments').forEach(p=>group(leaseInstallments,p.lease_id,p));
  const groupRows=(m,id)=>m.get(id)||[];
  const packageForSite=(site,cam)=>get('packages',site?.package_id)||get('packages',cam?.package_id);
  const spec=(site,cam)=>{
   const p=packageForSite(site,cam);
   const roof=get('properties',site?.rooftop_property_id);
   const width=number(p?.width_m)>0?number(p.width_m):number(roof?.width_m)>0?number(roof.width_m):null;
   const height=number(p?.height_m)>0?number(p.height_m):number(roof?.height_m)>0?number(roof.height_m):null;
   return {packageName:p?.name||'',packageCode:p?.code||'',width,height,
    area:width&&height?money(width*height):number(roof?.area_m2)||null,
    roofName:roof?.title||'',ownerName:roof?name('landlords',roof.landlord_id):''};
  };
  const amountFromCampaign=cam=>{
   const currency=cur(cam.currency);if(!currency)throw Error('عملة الحملة '+text(cam.title)+' غير صحيحة');
   const payments=groupRows(campaignPayments,cam.id);
   const paid=money(payments.reduce((n,p)=>n+number(p.amount),0));
   const price=money(cam.price);
   return {price,paid,due:money(Math.max(0,price-paid)),overpaid:money(Math.max(0,paid-price)),
    currency};
  };
  const amountFromLease=lease=>{
   const currency=cur(lease.currency);if(!currency)throw Error('عملة عقد السطح '+text(lease.contract_number)+' غير صحيحة');
   const installments=groupRows(leaseInstallments,lease.id);
   const paidInst=money(installments.reduce((n,i)=>n+number(i.paid_amount),0));
   const advance=money(lease.advance_amount);
   const rent=money(lease.rent_total);
   return {rent,advance,paidInst,paid:money(advance+paidInst),due:money(Math.max(0,rent-advance-paidInst)),currency};
  };
  const countSitesForCampaign=cam=>[...new Set(groupRows(campaignLinks,cam.id).map(l=>l.site_id))].filter(id=>get('ad_sites',id));
  const sheet=(title,columns,records)=>({
   name:title,columns:columns.map(([key,label,kind])=>({key,label,kind:kind||'text'})),
   rows:records
  });
  const status=x=>({active:'فعّال',inactive:'غير فعّال',inquiry:'استفسار'})[x]||text(x);
  const dimension=x=>number(x?.width_m)>0&&number(x?.height_m)>0?
   text(x.width_m)+' × '+text(x.height_m)+' متر':text(x?.dimensions);
  const ownerBase=owner=>({
   ownerId:owner.id,ownerName:owner.name,phone:text(owner.phone),alternatePhone:text(owner.alternate_phone),
   nationalId:text(owner.national_id),governorate:owner.governorate||'',
   address:owner.residential_address||'',landmark:owner.landmark||'',ownerNotes:owner.notes||''
  });
  const customerBase=c=>({
   customerId:c.id,customerName:c.name,phone:text(c.phone),alternatePhone:text(c.alternate_phone),
   nationalId:text(c.national_id),status:status(c.status),customerNotes:c.notes||''
  });
  const S={};
  if(type==='landlords'){
   const owners=rows('landlords').map(o=>{
    const properties=groupRows(ownerProperties,o.id),leases=groupRows(landlordLeases,o.id);
    const uniqueSites=new Set(properties.flatMap(p=>groupRows(propertySites,p.id).map(site=>site.id)));
    return {...ownerBase(o),propertyCount:properties.length,siteCount:uniqueSites.size,leaseCount:leases.length};
   });
   const properties=rows('properties').map(p=>{
    const o=get('landlords',p.landlord_id),sites=groupRows(propertySites,p.id);
    return {...(o?ownerBase(o):{}),propertyId:p.id,propertyName:p.title||'',
     width:number(p.width_m)||null,height:number(p.height_m)||null,area:number(p.area_m2)||money(number(p.width_m)*number(p.height_m))||null,
     dimensions:dimension(p),quantity:number(p.quantity)||null,siteCount:sites.length,
     siteCodes:sites.map(s=>s.code||s.name).join('، '),propertyNotes:p.notes||''};
   });
   const sites=rows('ad_sites').filter(site=>site.rooftop_property_id&&get('properties',site.rooftop_property_id)).map(site=>{
    const p=get('properties',site.rooftop_property_id),o=get('landlords',p?.landlord_id),sp=spec(site,null);
    return {...(o?ownerBase(o):{}),propertyId:p.id,propertyName:p.title,
     propertyWidth:number(p.width_m)||null,propertyHeight:number(p.height_m)||null,
     propertyArea:number(p.area_m2)||money(number(p.width_m)*number(p.height_m))||null,
     propertyQuantity:number(p.quantity)||null,
     siteId:site.id,siteCode:text(site.code),siteName:site.name||'',siteType:site.site_type||'',
     siteAddress:site.address||'',siteGovernorate:site.governorate||'',
     packageCode:sp.packageCode,packageName:sp.packageName,adWidth:sp.width,adHeight:sp.height,
     adArea:sp.area,active:site.active===false?'غير متاح':site.active===true?'متاح':'',
     siteNotes:site.notes||''};
   });
   const leases=rows('leases').map(lease=>{
    const owner=get('landlords',lease.landlord_id),p=get('properties',lease.property_id),m=amountFromLease(lease);
    return {...(owner?ownerBase(owner):{}),leaseId:lease.id,contractNumber:text(lease.contract_number),
     propertyName:p?.title||'',width:number(p?.width_m)||null,height:number(p?.height_m)||null,
     startDate:lease.start_date||'',endDate:lease.end_date||'',frequency:lease.payment_frequency==='semiannual'?'نصف سنوي':'سنوي',
     rent:m.rent,advance:m.advance,paidInst:m.paidInst,paid:m.paid,due:m.due,currency:m.currency,
     notes:lease.notes||''};
   });
   const installments=rows('lease_installments').map(inst=>{
    const lease=get('leases',inst.lease_id),owner=get('landlords',lease?.landlord_id),
     p=get('properties',lease?.property_id);
    const currency=lease?.currency||'IQD';
    return {...(owner?ownerBase(owner):{}),contractNumber:text(lease?.contract_number),
     propertyName:p?.title||'',dueDate:inst.due_date||'',amount:money(inst.amount),
     paid:money(inst.paid_amount),remaining:money(Math.max(0,number(inst.amount)-number(inst.paid_amount))),
     currency,status:number(inst.amount)<=number(inst.paid_amount)?'مسدد':'غير مكتمل',notes:inst.notes||''};
   });
   const flat=[];
   for(const owner of rows('landlords')){
    const ps=groupRows(ownerProperties,owner.id);
    if(!ps.length){flat.push({...ownerBase(owner)});continue;}
    for(const p of ps){
     const ss=groupRows(propertySites,p.id);
     const prop={...ownerBase(owner),propertyName:p.title,dimensions:dimension(p),
      area:number(p.area_m2)||money(number(p.width_m)*number(p.height_m))||null,quantity:number(p.quantity)||null};
     if(!ss.length)flat.push(prop);
     else for(const site of ss)flat.push({...prop,siteCode:text(site.code),siteName:site.name,
      siteAddress:site.address,packageName:spec(site,null).packageName});
    }
   }
   S.title='كشف مالكي الأسطح والعقارات والقطع';
   S.sheets=[
    sheet('الكشف الشامل',[['ownerName','اسم المالك'],['phone','رقم الهاتف'],['alternatePhone','الهاتف البديل'],['nationalId','رقم البطاقة الموحدة'],['governorate','المحافظة'],['address','عنوان السكن'],['propertyName','اسم العقار'],['dimensions','قياس العقار'],['area','المساحة م²','number'],['quantity','عدد المساحات','number'],['siteCode','رمز القطعة'],['siteName','اسم القطعة'],['siteAddress','موقع القطعة'],['packageName','الباقة']],flat),
    sheet('المالكون',[['ownerName','اسم المالك'],['phone','الهاتف'],['alternatePhone','الهاتف البديل'],['nationalId','البطاقة الوطنية'],['governorate','المحافظة'],['address','عنوان السكن'],['landmark','نقطة دالة'],['propertyCount','عدد العقارات','number'],['siteCount','عدد القطع الفعلية','number'],['leaseCount','عدد العقود','number'],['ownerNotes','ملاحظات']],owners),
    sheet('العقارات',[['ownerName','المالك'],['phone','الهاتف'],['propertyName','اسم العقار'],['width','العرض م','number'],['height','الطول م','number'],['area','المساحة م²','number'],['quantity','عدد المساحات','number'],['siteCount','عدد القطع المرتبطة','number'],['siteCodes','أكواد القطع'],['propertyNotes','ملاحظات']],properties),
    sheet('القطع الإعلانية',[['ownerName','المالك'],['phone','هاتف المالك'],['propertyName','العقار'],['propertyWidth','عرض العقار م','number'],['propertyHeight','طول العقار م','number'],['propertyArea','مساحة العقار م²','number'],['propertyQuantity','عدد المساحات','number'],['siteCode','رمز القطعة'],['siteName','اسم القطعة'],['siteType','نوع القطعة'],['siteGovernorate','المحافظة'],['siteAddress','العنوان'],['packageCode','فئة الباقة'],['packageName','الباقة'],['adWidth','عرض الإعلان م','number'],['adHeight','طول الإعلان م','number'],['adArea','مساحة الإعلان م²','number'],['active','الحالة'],['siteNotes','الملاحظات']],sites),
    sheet('عقود الأسطح',[['ownerName','المالك'],['phone','رقم الهاتف'],['contractNumber','رقم العقد'],['propertyName','العقار'],['width','العرض م','number'],['height','الطول م','number'],['startDate','البداية'],['endDate','النهاية'],['rent','الإيجار الأصلي','number'],['advance','المقدم','number'],['paidInst','المدفوع من الأقساط','number'],['paid','إجمالي المدفوع','number'],['due','المتبقي','number'],['currency','العملة'],['notes','ملاحظات']],leases),
    sheet('أقساط الأسطح',[['ownerName','المالك'],['phone','الهاتف'],['contractNumber','العقد'],['propertyName','العقار'],['dueDate','تاريخ الاستحقاق'],['amount','القسط الأصلي','number'],['paid','المسدد','number'],['remaining','المتبقي','number'],['currency','العملة'],['status','الحالة']],installments)
   ];
   S.counts={owners:owners.length,properties:properties.length,sites:sites.length,leases:leases.length};
  }else if(type==='customers'){
   const customers=rows('customers').map(c=>{
    const cs=groupRows(customerCampaigns,c.id);
    const unique=new Set(cs.flatMap(cam=>countSitesForCampaign(cam)));
    return {...customerBase(c),campaignCount:cs.length,siteCount:unique.size,contractCount:groupRows(customerContracts,c.id).length};
   });
   const campaigns=rows('campaigns').map(cam=>{
    const customer=get('customers',cam.customer_id),a=amountFromCampaign(cam),sites=countSitesForCampaign(cam);
    return {...(customer?customerBase(customer):{}),campaignId:cam.id,campaignTitle:cam.title||'',
     packageName:name('packages',cam.package_id),startDate:cam.start_date||'',months:number(cam.months)||null,
     expectedCount:number(cam.quantity)||null,linkedCount:sites.length,siteCodes:sites.map(id=>text(get('ad_sites',id)?.code)).join('، '),
     locations:cam.locations||'',price:a.price,paid:a.paid,due:a.due,overpaid:a.overpaid,currency:a.currency,notes:cam.notes||''};
   });
   const campaignSites=[];
   for(const link of rows('campaign_sites')){
    const cam=get('campaigns',link.campaign_id),site=get('ad_sites',link.site_id);
    if(!cam||!site)continue;
    const customer=get('customers',cam.customer_id),sp=spec(site,cam);
    campaignSites.push({... (customer?customerBase(customer):{}),campaignTitle:cam.title||'',
     campaignId:cam.id,siteCode:text(site.code),siteName:site.name||'',siteAddress:site.address||'',
     governorate:site.governorate||'',siteType:site.site_type||'',packageCode:sp.packageCode,
     packageName:sp.packageName,width:sp.width,height:sp.height,area:sp.area,
     propertyName:sp.roofName,landlordName:sp.ownerName});
   }
   const contracts=rows('customer_contracts').map(contract=>{
    const customer=get('customers',contract.customer_id),snap=Array.isArray(contract.campaign_sites_snapshot)?contract.campaign_sites_snapshot:[],
     ids=snap.length?snap.map(site=>text(site.code)||text(get('ad_sites',site.id)?.code)):
      contract.site_id?[text(get('ad_sites',contract.site_id)?.code)]:[];
    return {...(customer?customerBase(customer):{}),contractNumber:text(contract.contract_number),
     campaignTitle:contract.campaign_title_snapshot||name('campaigns',contract.campaign_id),
     packageName:contract.package_name_snapshot||name('packages',contract.package_id),
     contractType:contract.contract_type||'',startDate:contract.start_date||'',endDate:contract.end_date||'',
     months:number(contract.duration_months)||null,expectedCount:number(contract.campaign_quantity_snapshot)||null,
     siteCodes:ids.filter(Boolean).join('، '),locations:contract.campaign_locations_snapshot||'',
     specs:contract.package_specifications_snapshot||'',
     amount:money(contract.amount),currency:contract.currency||'',notes:contract.notes||''};
   });
   const payments=rows('campaign_payments').map(payment=>{
    const cam=get('campaigns',payment.campaign_id),customer=get('customers',cam?.customer_id);
    const currency=cam?.currency||'';
    return {...(customer?customerBase(customer):{}),campaignTitle:cam?.title||'',
     receiptNumber:text(payment.receipt_number),paidAt:payment.paid_at||'',
     amount:money(payment.amount),currency,amountInView:currency?transfer(payment.amount,currency):null,
     viewCurrency:view,entryCurrency:payment.entry_currency||'',notes:payment.notes||''};
   });
   const flat=[];
   for(const c of rows('customers')){
    const cs=groupRows(customerCampaigns,c.id);
    if(!cs.length){flat.push({...customerBase(c)});continue;}
    for(const cam of cs){
     const a=amountFromCampaign(cam),sites=countSitesForCampaign(cam);
     const base={...customerBase(c),campaignTitle:cam.title,
      packageName:name('packages',cam.package_id),months:number(cam.months)||null,
      price:a.price,paid:a.paid,due:a.due,currency:a.currency,locations:cam.locations||''};
     if(!sites.length)flat.push(base);
     else for(const id of sites){
      const site=get('ad_sites',id),sp=spec(site,cam);
      flat.push({...base,siteCode:text(site.code),siteName:site.name,siteAddress:site.address,
       width:sp.width,height:sp.height,area:sp.area});
     }
    }
   }
   S.title='كشف الزبائن والحملات والقطع';
   S.sheets=[
    sheet('الكشف الشامل',[['customerName','اسم الزبون'],['phone','رقم الهاتف'],['alternatePhone','الهاتف البديل'],['nationalId','رقم البطاقة'],['status','الحالة'],['campaignTitle','الحملة'],['packageName','الباقة'],['months','الأشهر','number'],['siteCode','رمز القطعة'],['siteName','اسم القطعة'],['siteAddress','عنوان القطعة'],['width','العرض م','number'],['height','الطول م','number'],['area','المساحة م²','number'],['locations','مواقع مكتوبة إضافية'],['price','قيمة الحملة','number'],['paid','المسدد','number'],['due','المتبقي','number'],['currency','العملة']],flat),
    sheet('الزبائن',[['customerName','اسم الزبون'],['phone','الهاتف'],['alternatePhone','الهاتف البديل'],['nationalId','رقم البطاقة الموحدة'],['status','الحالة'],['campaignCount','عدد الحملات','number'],['siteCount','عدد القطع المرتبطة','number'],['contractCount','عدد العقود','number'],['customerNotes','ملاحظات']],customers),
    sheet('الحملات',[['customerName','الزبون'],['phone','الهاتف'],['campaignTitle','الحملة'],['packageName','الباقة'],['startDate','بداية الحملة'],['months','الأشهر','number'],['expectedCount','عدد القطع المتفق عليها','number'],['linkedCount','عدد القطع المسجلة فعلياً','number'],['siteCodes','أكواد القطع'],['locations','المواقع الإضافية'],['price','القيمة الأصلية','number'],['paid','المسدد','number'],['due','المتبقي','number'],['overpaid','المبلغ الزائد','number'],['currency','العملة'],['notes','ملاحظات']],campaigns),
    sheet('قطع الزبائن',[['customerName','الزبون'],['phone','الهاتف'],['campaignTitle','الحملة'],['siteCode','رمز القطعة'],['siteName','اسم القطعة'],['governorate','المحافظة'],['siteAddress','العنوان'],['siteType','النوع'],['packageCode','رمز الباقة'],['packageName','الباقة'],['width','العرض م','number'],['height','الطول م','number'],['area','المساحة م²','number'],['propertyName','العقار'],['landlordName','مالك العقار']],campaignSites),
    sheet('عقود الزبائن',[['customerName','الزبون'],['phone','الهاتف'],['contractNumber','رقم العقد'],['campaignTitle','الحملة'],['packageName','الباقة'],['contractType','نوع العقد'],['startDate','البداية'],['endDate','النهاية'],['months','المدة بالأشهر','number'],['expectedCount','عدد القطع المتفق عليها','number'],['siteCodes','رموز القطع المحفوظة'],['locations','المواقع الإضافية'],['specs','مواصفات العقد'],['amount','المبلغ الأصلي','number'],['currency','العملة'],['notes','ملاحظات']],contracts),
    sheet('دفعات الزبائن',[['customerName','الزبون'],['phone','الهاتف'],['campaignTitle','الحملة'],['receiptNumber','رقم الوصل'],['paidAt','التاريخ'],['amount','المبلغ بعملة الحملة','number'],['currency','عملة الحملة'],['amountInView','المبلغ بعملة العرض','number'],['viewCurrency','عملة العرض'],['entryCurrency','عملة الإدخال'],['notes','ملاحظات']],payments)
   ];
   S.counts={customers:customers.length,campaigns:campaigns.length,sites:campaignSites.length,contracts:contracts.length};
  }else{
   const campaigns=rows('campaigns').map(cam=>{
    const a=amountFromCampaign(cam);
    return {campaignTitle:cam.title||'',customerName:name('customers',cam.customer_id),
     packageName:name('packages',cam.package_id),siteCodes:countSitesForCampaign(cam).map(id=>text(get('ad_sites',id)?.code)).join('، '),
     startDate:cam.start_date||'',months:number(cam.months)||null,original:a.price,paid:a.paid,
     due:a.due,overpaid:a.overpaid,currency:a.currency,
     originalView:transfer(a.price,a.currency),paidView:transfer(a.paid,a.currency),
     dueView:transfer(a.due,a.currency),viewCurrency:view};
   });
   const payments=rows('campaign_payments').map(p=>{
    const cam=get('campaigns',p.campaign_id);
    return {campaignTitle:cam?.title||'',customerName:name('customers',cam?.customer_id),
     receiptNumber:text(p.receipt_number),paidAt:p.paid_at||'',amount:money(p.amount),
     currency:cam?.currency||'',amountView:cam?transfer(p.amount,cam.currency):null,
     viewCurrency:view,notes:p.notes||''};
   });
   const leases=rows('leases').map(lease=>{
    const p=get('properties',lease.property_id),a=amountFromLease(lease);
    return {contractNumber:text(lease.contract_number),ownerName:name('landlords',lease.landlord_id),
     propertyName:p?.title||'',startDate:lease.start_date||'',endDate:lease.end_date||'',
     rent:a.rent,advance:a.advance,paidInstallments:a.paidInst,paid:a.paid,due:a.due,
     currency:a.currency,rentView:transfer(a.rent,a.currency),dueView:transfer(a.due,a.currency),viewCurrency:view};
   });
   const installments=rows('lease_installments').map(inst=>{
    const lease=get('leases',inst.lease_id);
    const c=lease?.currency||'';
    return {contractNumber:text(lease?.contract_number),ownerName:name('landlords',lease?.landlord_id),
     dueDate:inst.due_date||'',amount:money(inst.amount),paid:money(inst.paid_amount),
     due:money(Math.max(0,number(inst.amount)-number(inst.paid_amount))),
     currency:c,dueView:c?transfer(Math.max(0,number(inst.amount)-number(inst.paid_amount)),c):null,viewCurrency:view};
   });
   const expenses=rows('company_expenses').map(exp=>{
    const c=cur(exp.currency);if(!c)throw Error('عملة الفاتورة غير صحيحة');
    return {receiptNumber:text(exp.receipt_number),expenseDate:exp.expense_date||'',title:exp.title||'',
     category:exp.category||'',amount:money(exp.amount),paid:money(exp.paid_amount),
     currency:c,amountView:transfer(exp.amount,c),viewCurrency:view,paidBy:exp.paid_by||'',notes:exp.notes||''};
   });
   const sumBy=(data,key)=>money(data.reduce((sum,r)=>sum+number(r[key]),0));
   const totals={
    received:sumBy(payments,'amountView'),
    outstanding:sumBy(campaigns,'dueView'),
    rentDue:sumBy(leases,'dueView'),
    expenses:sumBy(expenses,'amountView'),
    lateInstallments:installments.filter(x=>x.dueDate&&x.dueDate<=(opts.today||new Date().toISOString().slice(0,10))&&x.due>0).length
   };
   S.title='التقرير المالي المترابط';
   S.totals=totals;
   S.sheets=[
    sheet('الملخص المالي',[['item','المؤشر'],['value','القيمة','number'],['currency','العملة']],[
     {item:'الواصل من الحملات',value:totals.received,currency:view},
     {item:'الذمم المتبقية على الزبائن',value:totals.outstanding,currency:view},
     {item:'المتبقي من إيجار الأسطح',value:totals.rentDue,currency:view},
     {item:'إجمالي المصروفات',value:totals.expenses,currency:view},
     {item:'عدد الأقساط المستحقة غير المكتملة',value:totals.lateInstallments,currency:'عدد'}
    ]),
    sheet('الحملات والذمم',[['customerName','الزبون'],['campaignTitle','الحملة'],['packageName','الباقة'],['siteCodes','القطع'],['startDate','البداية'],['months','الأشهر','number'],['original','القيمة الأصلية','number'],['paid','المسدد الأصلي','number'],['due','المتبقي الأصلي','number'],['overpaid','الزيادة','number'],['currency','العملة الأصلية'],['originalView','القيمة بعملة العرض','number'],['paidView','المدفوع بعملة العرض','number'],['dueView','المتبقي بعملة العرض','number'],['viewCurrency','عملة العرض']],campaigns),
    sheet('دفعات الحملات',[['customerName','الزبون'],['campaignTitle','الحملة'],['receiptNumber','رقم الوصل'],['paidAt','تاريخ الاستلام'],['amount','المبلغ المسجّل','number'],['currency','عملة الحملة الأصلية'],['amountView','المبلغ بعملة العرض','number'],['viewCurrency','عملة العرض'],['notes','ملاحظات']],payments),
    sheet('عقود الإيجار',[['ownerName','المالك'],['propertyName','العقار'],['contractNumber','رقم العقد'],['startDate','بداية العقد'],['endDate','النهاية'],['rent','الإيجار الأصلي','number'],['advance','المقدم','number'],['paidInstallments','مسدّد الأقساط','number'],['paid','إجمالي المدفوع','number'],['due','المتبقي الأصلي','number'],['currency','العملة الأصلية'],['rentView','الإيجار بعملة العرض','number'],['dueView','المتبقي بعملة العرض','number'],['viewCurrency','عملة العرض']],leases),
    sheet('أقساط الإيجار',[['ownerName','المالك'],['contractNumber','العقد'],['dueDate','تاريخ القسط'],['amount','القسط','number'],['paid','المسدّد','number'],['due','المتبقي','number'],['currency','العملة'],['dueView','المتبقي بعملة العرض','number'],['viewCurrency','عملة العرض']],installments),
    sheet('المصروفات',[['receiptNumber','رقم الوصل'],['expenseDate','التاريخ'],['title','وصف الفاتورة'],['category','التصنيف'],['amount','المبلغ الأصلي','number'],['paid','المسدّد','number'],['currency','العملة الأصلية'],['amountView','المبلغ بعملة العرض','number'],['viewCurrency','عملة العرض'],['paidBy','المسؤول'],['notes','ملاحظات']],expenses)
   ];
   S.counts={campaigns:campaigns.length,payments:payments.length,leases:leases.length,installments:installments.length,expenses:expenses.length};
  }
  S.currency=view;
  S.exchangeRate=fx;
  S.generatedAt=opts.generatedAt||new Date().toISOString();
  S.companyName=opts.companyName||'شركة رأفت للدعاية والإعلان والتجارة العامة';
  S.source='قاعدة بيانات النظام — روابط حسب المعرّفات';
  return S;
 }
 scope.RaafatReportData=Object.freeze({build,requiredTables:TABLES});
})(window);
