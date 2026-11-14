-- Raafat accounting UX: prepayments, canonical four-digit contract numbers,
-- and permanent unique receipt numbers. No existing rent or payment is deleted.
alter table public.leases
 add column if not exists advance_amount numeric not null default 0;

do $block$
begin
 if not exists (select 1 from pg_constraint where conrelid='public.leases'::regclass
   and conname='raafat_lease_advance_in_range') then
  alter table public.leases add constraint raafat_lease_advance_in_range
   check (advance_amount >= 0 and advance_amount <= rent_total);
 end if;
end $block$;

alter table public.campaign_payments
 add column if not exists receipt_number text;

create sequence if not exists public.raafat_receipt_number_seq start with 1;

-- Number pre-existing receipts deterministically by their creation time.
with older as (
 select id,row_number() over(order by created_at,id) as rn
 from public.campaign_payments where receipt_number is null
), maximum as (
 select coalesce(max((substring(receipt_number from '([0-9]+)$'))::bigint),0) as n
 from public.campaign_payments where receipt_number ~ '[0-9]+$'
)
update public.campaign_payments p
 set receipt_number=lpad((older.rn+(select n from maximum))::text,4,'0')
 from older where p.id=older.id;

select setval('public.raafat_receipt_number_seq',
 greatest(1,(select coalesce(max(receipt_number::bigint),0)
             from public.campaign_payments where receipt_number ~ '^[0-9]+$')),
 (select exists(select 1 from public.campaign_payments where receipt_number ~ '^[0-9]+$')));

create unique index if not exists raafat_campaign_receipt_number_unique
 on public.campaign_payments(receipt_number);

create or replace function public.raafat_assign_receipt_number()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.receipt_number:=lpad(nextval('public.raafat_receipt_number_seq')::text,4,'0');
 elsif new.receipt_number is distinct from old.receipt_number then
  raise exception 'Receipt number cannot be changed';
 end if;
 return new;
end
$$;

drop trigger if exists raafat_campaign_receipt_number on public.campaign_payments;
create trigger raafat_campaign_receipt_number
 before insert or update on public.campaign_payments
 for each row execute function public.raafat_assign_receipt_number();

-- Preserve the original contract validation and sequence logic, modifying
-- only the presentation of the newly assigned number to padded digits.
do $block$
declare source text;
begin
 select pg_get_functiondef('public.raafat_set_customer_contract()'::regprocedure) into source;
 if position('new.contract_number := ''RC-'' || nextval(''public.raafat_customer_contract_seq'');' in source)=0 then
  raise exception 'Unexpected customer contract trigger body; refusing automatic rewrite';
 end if;
 execute replace(source,
  'new.contract_number := ''RC-'' || nextval(''public.raafat_customer_contract_seq'');',
  'new.contract_number := ''RC-'' || lpad(nextval(''public.raafat_customer_contract_seq'')::text,4,''0'');');

 select pg_get_functiondef('public.assign_lease_number()'::regprocedure) into source;
 if position('new.contract_number := ''RA-'' || nextval(''public.lease_number_sequence'');' in source)=0 then
  raise exception 'Unexpected lease contract trigger body; refusing automatic rewrite';
 end if;
 execute replace(source,
  'new.contract_number := ''RA-'' || nextval(''public.lease_number_sequence'');',
  'new.contract_number := ''RA-'' || lpad(nextval(''public.lease_number_sequence'')::text,4,''0'');');
end $block$;

comment on column public.leases.advance_amount is
 'Already-paid up-front portion of total rent; generated future installments sum to rent_total - advance_amount.';
comment on column public.campaign_payments.receipt_number is
 'Unique sequential receipt number (0001 onward), stable across edits and independent of UUID.';
