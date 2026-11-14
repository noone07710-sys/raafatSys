-- Raafat Sys: financial relationship integrity + live exchange-rate subscription.
-- Scoped exclusively to Raafat tables; Layali tables are unaffected.
alter table public.lease_installments add constraint raafat_installment_paid_le_total check (paid_amount <= amount);
alter table public.ad_sites add constraint raafat_rooftop_requires_property check (site_type <> 'rooftop' or rooftop_property_id is not null);

create or replace function public.raafat_validate_campaign_payment()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  allowed_total numeric(16,2);
  previous_payments numeric(16,2);
begin
  select price into allowed_total from public.campaigns where id=new.campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  select coalesce(sum(amount),0) into previous_payments
    from public.campaign_payments
    where campaign_id=new.campaign_id and id is distinct from new.id;
  if previous_payments+new.amount > allowed_total then
    raise exception 'Campaign payment exceeds outstanding balance';
  end if;
  return new;
end $$;
create trigger raafat_campaign_payment_guard
before insert or update of campaign_id,amount on public.campaign_payments
for each row execute function public.raafat_validate_campaign_payment();

create or replace function public.raafat_validate_campaign_terms()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  payments_total numeric(16,2);
begin
  select coalesce(sum(amount),0) into payments_total
    from public.campaign_payments where campaign_id=new.id;
  if new.price < payments_total then
    raise exception 'Campaign price cannot be less than recorded payments';
  end if;
  if new.currency is distinct from old.currency and payments_total > 0 then
    raise exception 'Campaign currency cannot change after payments are recorded';
  end if;
  return new;
end $$;
create trigger raafat_campaign_terms_guard
before update of price,currency on public.campaigns
for each row execute function public.raafat_validate_campaign_terms();

do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='settings')
 then execute 'alter publication supabase_realtime add table public.settings'; end if;
end $$;
revoke all on function public.raafat_validate_campaign_payment() from public,anon;
revoke all on function public.raafat_validate_campaign_terms() from public,anon;
