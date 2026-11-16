
create sequence if not exists public.inventory_document_serial;

create table if not exists public.inventory_items(
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (length(trim(code)) between 1 and 45),
 name text not null check (length(trim(name)) between 1 and 180),
 description text not null default '',
 unit text not null check (unit in ('piece','carton','meter','kg')),
 pieces_per_carton integer,
 item_kind text not null check (item_kind in ('consumable','returnable')),
 stock_qty numeric(17,3) not null default 0 check (stock_qty>=0),
 min_stock_qty numeric(17,3) not null default 0 check (min_stock_qty>=0),
 price numeric(17,2) not null default 0 check (price>=0),
 currency text not null default 'IQD' check (currency in ('IQD','USD')),
 active boolean not null default true,
 created_by uuid,
 created_by_name text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint inventory_carton_factor check (
  (unit='carton' and pieces_per_carton is not null and pieces_per_carton>0)
  or (unit<>'carton' and pieces_per_carton is null)
 )
);
create table if not exists public.inventory_documents(
 id uuid primary key default gen_random_uuid(),
 doc_number text not null unique,
 document_type text not null check (document_type in ('in','out','return')),
 status text not null check (status in ('posted','pending','approved','rejected','issued')),
 receipt_number text not null default '',
 details text not null default '',
 requested_by uuid not null,
 requested_by_name text not null,
 recipient_name text not null default '',
 created_at timestamptz not null default now(),
 document_date date not null default current_date,
 return_due_date date,
 approved_by uuid,
 approved_by_name text,
 approved_at timestamptz,
 approval_note text,
 issued_by uuid,
 issued_by_name text,
 issued_at timestamptz
);
create table if not exists public.inventory_document_lines(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.inventory_documents(id) on delete restrict,
 item_id uuid not null references public.inventory_items(id) on delete restrict,
 item_name text not null,
 quantity numeric(17,3) not null check(quantity>0),
 unit text not null check(unit in ('piece','carton','meter','kg')),
 factor integer not null default 1 check(factor>0),
 base_qty numeric(17,3) not null check(base_qty>0),
 unit_price numeric(17,2) not null check(unit_price>=0),
 description text not null default '',
 source_line_id uuid references public.inventory_document_lines(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table if not exists public.inventory_movements(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.inventory_documents(id),
 line_id uuid not null references public.inventory_document_lines(id),
 item_id uuid not null references public.inventory_items(id),
 delta_qty numeric(17,3) not null check(delta_qty<>0),
 event text not null check(event in ('received','issued','returned')),
 actor_id uuid not null,
 actor_name text not null,
 created_at timestamptz not null default now(),
 unique(line_id)
);
create table if not exists public.inventory_notifications(
 id uuid primary key default gen_random_uuid(),
 event_type text not null,
 document_id uuid references public.inventory_documents(id),
 item_id uuid references public.inventory_items(id),
 recipient_id uuid,
 message text not null,
 created_at timestamptz not null default now()
);
create index if not exists inventory_lines_doc_idx on public.inventory_document_lines(document_id);
create index if not exists inventory_lines_item_idx on public.inventory_document_lines(item_id);
create index if not exists inventory_lines_source_idx on public.inventory_document_lines(source_line_id);
create index if not exists inventory_docs_status_idx on public.inventory_documents(status,created_at desc);
create index if not exists inventory_notices_created_idx on public.inventory_notifications(created_at desc);
create index if not exists inventory_notices_recipient_idx on public.inventory_notifications(recipient_id,created_at desc);
create index if not exists inventory_moves_item_idx on public.inventory_movements(item_id,created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_documents enable row level security;
alter table public.inventory_document_lines enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_notifications enable row level security;
grant select on public.inventory_items,public.inventory_documents,public.inventory_document_lines,public.inventory_movements,public.inventory_notifications to authenticated;
revoke insert,update,delete on public.inventory_items,public.inventory_documents,public.inventory_document_lines,public.inventory_movements,public.inventory_notifications from anon,authenticated;
revoke all on sequence public.inventory_document_serial from anon,authenticated;
create policy inventory_items_select on public.inventory_items for select to authenticated using ((select public.raafat_can('inventory','read')));
create policy inventory_docs_select on public.inventory_documents for select to authenticated using ((select public.raafat_can('inventory','read')));
create policy inventory_lines_select on public.inventory_document_lines for select to authenticated using ((select public.raafat_can('inventory','read')));
create policy inventory_movements_select on public.inventory_movements for select to authenticated using ((select public.raafat_can('inventory','read')));
create policy inventory_notifications_select on public.inventory_notifications for select to authenticated using (
 (select public.is_admin()) or (recipient_id = (select auth.uid()) and (select public.raafat_can('inventory','read')))
);

create or replace function raafat_internal.inventory_action(p_action text,p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path=''
as $func$
declare
 v_user uuid := auth.uid();
 v_role text;
 v_permissions text[];
 v_actor text;
 v_can_read boolean;
 v_can_create boolean;
 v_doc public.inventory_documents%rowtype;
 v_item public.inventory_items%rowtype;
 v_source public.inventory_document_lines%rowtype;
 v_id uuid;
 v_item_id uuid;
 v_line jsonb;
 v_lines jsonb;
 v_qty numeric;
 v_base numeric;
 v_price numeric;
 v_unit text;
 v_factor int;
 v_source_returned numeric;
 v_reserved numeric;
 v_total numeric;
 v_now timestamptz := now();
 v_number text;
 v_kind text;
 v_due date;
 v_stock_min numeric;
 v_note text;
begin
 if v_user is null then raise exception 'سجل الدخول أولاً.' using errcode='42501';end if;
 select m.role,m.permissions,
  coalesce(nullif(trim(m.display_name),''),nullif(trim(m.email),''),'موظف')
 into v_role,v_permissions,v_actor
 from public.staff_members m where m.user_id=v_user and m.active;
 if v_role is null then raise exception 'حسابك غير مفعل.' using errcode='42501';end if;
 v_can_read := v_role in ('admin','staff') or 'inventory.read'=any(v_permissions) or 'inventory.edit'=any(v_permissions);
 v_can_create := v_role in ('admin','staff') or 'inventory.edit'=any(v_permissions);
 if not v_can_read then raise exception 'ما عندك صلاحية لقسم المخازن.' using errcode='42501';end if;
 if p_action not in ('save_item','receive','request_out','approve','reject','issue','return') then
  raise exception 'إجراء مخزني غير معروف.';
 end if;
 if p_action in ('save_item','receive','request_out','issue','return') and not v_can_create then
  raise exception 'لا تملك صلاحية إجراء حركات المخزن.' using errcode='42501';
 end if;
 if p_action in ('approve','reject') and v_role<>'admin' then
  raise exception 'الموافقة أو الرفض للمدير الرئيسي حصراً.' using errcode='42501';
 end if;

 if p_action='save_item' then
  v_id := nullif(p_payload->>'id','')::uuid;
  v_unit:=p_payload->>'unit';
  if v_unit not in ('piece','carton','meter','kg') then raise exception 'وحدة قياس المادة غير صالحة.';end if;
  v_kind:=p_payload->>'item_kind';
  if v_kind not in ('consumable','returnable') then raise exception 'اختر استهلاكي أو دائمي قابل للإرجاع.';end if;
  v_factor:=case when v_unit='carton' then nullif(p_payload->>'pieces_per_carton','')::integer else null end;
  if v_unit='carton' and coalesce(v_factor,0)<=0 then raise exception 'حدد عدد القطع داخل الكارتون.';end if;
  v_qty:=coalesce(nullif(p_payload->>'min_qty','')::numeric,0);
  v_stock_min:=v_qty*case when v_unit='carton' then v_factor else 1 end;
  if v_qty<0 or v_qty>100000000 then raise exception 'الحد الأدنى للمخزون غير صالح.';end if;
  v_price:=coalesce(nullif(p_payload->>'price','')::numeric,0);
  if v_price<0 then raise exception 'سعر المادة غير صالح.';end if;
  if nullif(trim(p_payload->>'code'),'') is null or nullif(trim(p_payload->>'name'),'') is null then
   raise exception 'أدخل رمز المادة واسمها.';
  end if;
  if v_id is not null then
   select * into v_item from public.inventory_items where id=v_id for update;
   if not found then raise exception 'المادة غير موجودة.';end if;
   if (v_item.unit is distinct from v_unit or v_item.pieces_per_carton is distinct from v_factor or v_item.item_kind is distinct from v_kind)
      and exists(select 1 from public.inventory_document_lines where item_id=v_id) then
    raise exception 'لا يمكن تغيير الوحدة أو عدد قطع الكارتون أو نوع المادة بعد تسجيل حركات عليها. أنشئ مادة جديدة.';
   end if;
   update public.inventory_items
    set code=trim(p_payload->>'code'),name=trim(p_payload->>'name'),
     description=left(coalesce(p_payload->>'description',''),2000),
     unit=v_unit,pieces_per_carton=v_factor,item_kind=v_kind,min_stock_qty=v_stock_min,
     price=v_price,currency=coalesce(nullif(p_payload->>'currency',''),'IQD'),
     active=coalesce((p_payload->>'active')::boolean,true),updated_at=v_now
    where id=v_id;
  else
   insert into public.inventory_items(code,name,description,unit,pieces_per_carton,item_kind,min_stock_qty,price,currency,created_by,created_by_name)
   values(trim(p_payload->>'code'),trim(p_payload->>'name'),
    left(coalesce(p_payload->>'description',''),2000),v_unit,v_factor,v_kind,v_stock_min,v_price,
    coalesce(nullif(p_payload->>'currency',''),'IQD'),v_user,v_actor)
   returning id into v_id;
  end if;
  return jsonb_build_object('id',v_id,'action',p_action);
 end if;

 if p_action in ('receive','request_out','return') then
  v_lines:=p_payload->'lines';
  if jsonb_typeof(v_lines) is distinct from 'array' or jsonb_array_length(v_lines) not between 1 and 60 then
   raise exception 'حدد مادة واحدة على الأقل (حتى 60 مادة بنفس الوصل).';
  end if;
  v_kind:=case p_action when 'receive' then 'in' when 'return' then 'return' else 'out' end;
  if p_action='receive' and nullif(trim(p_payload->>'receipt_number'),'') is null then
    raise exception 'رقم الوصل مطلوب للإدخال المخزني.';
  end if;
  if p_action='request_out' then
   if nullif(trim(p_payload->>'recipient_name'),'') is null then
    raise exception 'أدخل اسم الموظف طالب المواد.';
   end if;
   v_due:=nullif(p_payload->>'return_due_date','')::date;
  end if;
  v_number:=case v_kind when 'in' then 'IN-' when 'out' then 'OUT-' else 'RET-' end||
   lpad(nextval('public.inventory_document_serial')::text,6,'0');
  insert into public.inventory_documents(doc_number,document_type,status,receipt_number,details,requested_by,requested_by_name,
   recipient_name,return_due_date,document_date)
  values(v_number,v_kind,case when v_kind='out' then 'pending' else 'posted' end,
   left(coalesce(p_payload->>'receipt_number',''),100),
   left(coalesce(p_payload->>'details',''),2000),v_user,v_actor,
   left(coalesce(p_payload->>'recipient_name',''),160),v_due,
   coalesce(nullif(p_payload->>'document_date','')::date,current_date))
  returning * into v_doc;
  for v_line in select value from jsonb_array_elements(v_lines) loop
   v_qty:=(v_line->>'quantity')::numeric;
   if v_qty is null or v_qty<=0 or v_qty>100000000 then raise exception 'كمية المادة يجب أن تكون أكبر من صفر.';end if;
   if v_kind='return' then
    v_id:=(v_line->>'source_line_id')::uuid;
    select * into v_source from public.inventory_document_lines where id=v_id for update;
    if not found then raise exception 'اختر مادة من إخراج سابق.';end if;
    if not exists(select 1 from public.inventory_documents where id=v_source.document_id and document_type='out' and status='issued') then
     raise exception 'الاسترجاع مرتبط بإخراج غير مسلّم.';
    end if;
    select * into v_item from public.inventory_items where id=v_source.item_id for update;
    if v_item.item_kind<>'returnable' then raise exception 'المادة استهلاكية ولا يجوز استرجاعها عبر سجل العهد.';end if;
    v_unit:=v_source.unit; v_factor:=v_source.factor;
    if v_unit in ('piece','carton') and v_qty<>trunc(v_qty) then raise exception 'عدد القطع والكارتونات المسترجعة لازم يكون عدداً صحيحاً.';end if;
    v_base:=v_qty*v_factor;
    select coalesce(sum(base_qty),0) into v_source_returned
     from public.inventory_document_lines rl
     join public.inventory_documents rd on rd.id=rl.document_id
     where rl.source_line_id=v_source.id and rd.document_type='return' and rd.status='posted';
    if v_base>v_source.base_qty-v_source_returned then
     raise exception 'كمية الاسترجاع أكبر من المتبقي خارج المخزن للمادة %.',v_item.name;
    end if;
    v_price:=v_source.unit_price;
   else
    v_item_id:=(v_line->>'item_id')::uuid;
    select * into v_item from public.inventory_items where id=v_item_id for update;
    if not found or not v_item.active then raise exception 'المادة غير موجودة أو غير مفعلة.';end if;
    v_unit:=coalesce(nullif(v_line->>'unit',''),v_item.unit);
    if v_unit<>v_item.unit and not (v_item.unit='carton' and v_unit='piece') then
     raise exception 'وحدة الإخراج/الإدخال لا تتطابق مع تعريف المادة: %.',v_item.name;
    end if;
    v_factor:=case when v_unit='carton' then v_item.pieces_per_carton else 1 end;
    if v_unit in ('piece','carton') and v_qty<>trunc(v_qty) then
     raise exception 'عدد القطع والكارتونات لازم يكون عدداً صحيحاً.';
    end if;
    v_base:=v_qty*v_factor;
    v_price:=coalesce(nullif(v_line->>'unit_price','')::numeric,v_item.price);
    if v_price<0 then raise exception 'سعر المادة غير صالح.';end if;
    if v_kind='out' then
     select coalesce(sum(ln.base_qty),0) into v_reserved
      from public.inventory_document_lines ln
      join public.inventory_documents d on d.id=ln.document_id
      where ln.item_id=v_item.id and d.document_type='out' and d.status='approved';
     if v_base>v_item.stock_qty-v_reserved then
      raise exception 'المتوفر من المادة % لا يكفي (المتاح: %).',v_item.name,v_item.stock_qty-v_reserved;
     end if;
     if v_item.item_kind='returnable' and v_due is null then
      raise exception 'حدد موعد إرجاع المادة الدائمية: %.',v_item.name;
     end if;
    end if;
   end if;
   insert into public.inventory_document_lines(document_id,item_id,item_name,quantity,unit,factor,base_qty,unit_price,description,source_line_id)
   values(v_doc.id,v_item.id,v_item.name,v_qty,v_unit,v_factor,v_base,v_price,
    left(coalesce(v_line->>'description',''),1500),case when v_kind='return' then v_source.id else null end)
   returning id into v_id;
   if v_kind in ('in','return') then
    update public.inventory_items set stock_qty=stock_qty+v_base,updated_at=v_now where id=v_item.id;
    insert into public.inventory_movements(document_id,line_id,item_id,delta_qty,event,actor_id,actor_name)
     values(v_doc.id,v_id,v_item.id,v_base,case when v_kind='in' then 'received' else 'returned' end,v_user,v_actor);
   end if;
  end loop;
  if v_kind='out' then
   -- A request containing the same material more than once must not be able
   -- to exceed the free quantity when its lines are added together.
   for v_item in
    select i.* from public.inventory_items i
    where i.id in(select item_id from public.inventory_document_lines where document_id=v_doc.id)
    order by i.id for update
   loop
    select coalesce(sum(base_qty),0) into v_total
      from public.inventory_document_lines where document_id=v_doc.id and item_id=v_item.id;
    select coalesce(sum(l.base_qty),0) into v_reserved
      from public.inventory_document_lines l
      join public.inventory_documents d on d.id=l.document_id
      where l.item_id=v_item.id and d.document_type='out' and d.status='approved';
    if v_total>v_item.stock_qty-v_reserved then
      raise exception 'مجموع الكمية المطلوبة من % أكبر من المخزون المتاح.',v_item.name;
    end if;
   end loop;
  end if;
  insert into public.inventory_notifications(event_type,document_id,message)
   values(case when v_kind='in' then 'received' when v_kind='out' then 'issue_requested' else 'returned' end,
   v_doc.id,case when v_kind='in' then 'إدخال مخزني '+v_number+' بواسطة '+v_actor
      when v_kind='out' then 'طلب إخراج '+v_number+' من '+v_actor+' ينتظر موافقة المدير'
      else 'استرجاع مواد للمخزن '+v_number+' بواسطة '+v_actor end);
  return jsonb_build_object('id',v_doc.id,'doc_number',v_number,'status',v_doc.status);
 end if;

 v_id:=(p_payload->>'id')::uuid;
 select * into v_doc from public.inventory_documents where id=v_id for update;
 if not found or v_doc.document_type<>'out' then raise exception 'مستند الإخراج غير موجود.';end if;
 if p_action in ('approve','reject') then
  if v_doc.status<>'pending' then raise exception 'هذا الطلب سبق اتخاذ قرار بشأنه.';end if;
  if p_action='approve' then
   -- Lock all affected items in a stable order before reserving stock.
   for v_item in
    select i.* from public.inventory_items i
    where i.id in(select item_id from public.inventory_document_lines where document_id=v_id)
    order by i.id for update
   loop
    select coalesce(sum(base_qty),0) into v_total from public.inventory_document_lines
     where document_id=v_id and item_id=v_item.id;
    select coalesce(sum(l.base_qty),0) into v_reserved
     from public.inventory_document_lines l join public.inventory_documents d on d.id=l.document_id
     where l.item_id=v_item.id and d.document_type='out' and d.status='approved';
    if v_total>v_item.stock_qty-v_reserved then
      raise exception 'لا يمكن الموافقة؛ الكمية المتوفرة من % أقل من المطلوب.',v_item.name;
    end if;
   end loop;
   update public.inventory_documents set status='approved',approved_by=v_user,approved_by_name=v_actor,
    approved_at=v_now,approval_note=left(coalesce(p_payload->>'note',''),1000) where id=v_id;
   insert into public.inventory_notifications(event_type,document_id,recipient_id,message)
    values('issue_approved',v_id,v_doc.requested_by,'تمت الموافقة على الإخراج '+v_doc.doc_number+' من المدير '+v_actor);
  else
   update public.inventory_documents set status='rejected',approved_by=v_user,approved_by_name=v_actor,
    approved_at=v_now,approval_note=left(coalesce(p_payload->>'note',''),1000) where id=v_id;
   insert into public.inventory_notifications(event_type,document_id,recipient_id,message)
    values('issue_rejected',v_id,v_doc.requested_by,'تم رفض طلب الإخراج '+v_doc.doc_number+' من المدير '+v_actor);
  end if;
  return jsonb_build_object('id',v_id,'status',p_action);
 end if;
 if p_action='issue' then
  if v_doc.status<>'approved' then raise exception 'لا يجوز تسليم المواد قبل موافقة المدير.';end if;
  for v_item in
    select i.* from public.inventory_items i
    where i.id in(select item_id from public.inventory_document_lines where document_id=v_id)
    order by i.id for update
  loop
   select coalesce(sum(base_qty),0) into v_total from public.inventory_document_lines
    where document_id=v_id and item_id=v_item.id;
   if v_total>v_item.stock_qty then raise exception 'المخزون الفعلي من % لا يكفي للتسليم.',v_item.name;end if;
   update public.inventory_items set stock_qty=stock_qty-v_total,updated_at=v_now where id=v_item.id;
  end loop;
  insert into public.inventory_movements(document_id,line_id,item_id,delta_qty,event,actor_id,actor_name)
   select v_id,l.id,l.item_id,-l.base_qty,'issued',v_user,v_actor
   from public.inventory_document_lines l where l.document_id=v_id;
  update public.inventory_documents set status='issued',issued_by=v_user,issued_by_name=v_actor,
    issued_at=v_now where id=v_id;
  insert into public.inventory_notifications(event_type,document_id,message)
   values('issued',v_id,'خرجت المواد فعلياً من المخزن بموجب '+v_doc.doc_number+' بواسطة '+v_actor);
  return jsonb_build_object('id',v_id,'status','issued');
 end if;
 raise exception 'لا يمكن تنفيذ العملية المطلوبة.';
end;
$func$;

-- Only a thin invoker bridge is exposed via PostgREST. The privileged implementation
-- lives in an unexposed schema and verifies the authenticated staff identity.
create or replace function public.inventory_action(p_action text,p_payload jsonb)
 returns jsonb language sql security definer set search_path=''
 as $$select raafat_internal.inventory_action(p_action,p_payload)$$;
revoke all on function raafat_internal.inventory_action(text,jsonb) from public,anon,authenticated;
revoke usage on schema raafat_internal from authenticated;
revoke all on function public.inventory_action(text,jsonb) from public,anon;
grant execute on function public.inventory_action(text,jsonb) to authenticated;
