-- Raafat Sys: package measurements, per-roof dimensions, customer contracts.
-- Additive migration, existing landlord leases and Layali tables remain unchanged.
alter table public.packages
 add column if not exists package_type text not null default 'cabin'
   check (package_type in ('cabin','rooftop')),
 add column if not exists width_m numeric(10,2) check (width_m > 0),
 add column if not exists height_m numeric(10,2) check (height_m > 0),
 add column if not exists specifications text,
 add column if not exists sides integer not null default 1 check (sides between 1 and 10);
alter table public.packages
 add column if not exists area_m2 numeric(12,4) generated always as (width_m * height_m) stored;

alter table public.customers
 add column if not exists preferred_package_id uuid references public.packages(id) on delete set null;
create index if not exists raafat_customer_package_idx on public.customers(preferred_package_id);

alter table public.properties
 add column if not exists width_m numeric(10,2) check (width_m > 0),
 add column if not exists height_m numeric(10,2) check (height_m > 0);
alter table public.properties
 add column if not exists area_m2 numeric(12,4) generated always as (width_m * height_m) stored;

create sequence if not exists public.raafat_customer_contract_seq start with 1;
create table if not exists public.customer_contracts (
 id uuid primary key default gen_random_uuid(),
 contract_number text not null unique,
 customer_id uuid not null references public.customers(id) on delete restrict,
 campaign_id uuid references public.campaigns(id) on delete set null,
 package_id uuid not null references public.packages(id) on delete restrict,
 site_id uuid references public.ad_sites(id) on delete restrict,
 contract_type text not null check (contract_type in ('cabin','rooftop')),
 start_date date not null,
 end_date date not null,
 amount numeric(16,2) not null check (amount >= 0),
 currency text not null check (currency in ('IQD','USD')),
 company_representative text,
 customer_representative text,
 terms text,
 notes text,
 package_name_snapshot text not null,
 package_dimensions_snapshot text,
 package_specifications_snapshot text,
 site_name_snapshot text,
 customer_name_snapshot text not null,
 created_at timestamptz not null default now(),
 constraint valid_customer_contract_period check (end_date >= start_date)
);
create index if not exists raafat_customer_contract_customer on public.customer_contracts(customer_id);
create index if not exists raafat_customer_contract_package on public.customer_contracts(package_id);
create index if not exists raafat_customer_contract_campaign on public.customer_contracts(campaign_id);

create or replace function public.raafat_set_customer_contract()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
 pkg record;
 cust record;
 camp record;
 site record;
begin
 if tg_op = 'INSERT' then
   new.contract_number := 'RC-' || nextval('public.raafat_customer_contract_seq');
 elsif new.contract_number is distinct from old.contract_number then
   raise exception 'Contract number cannot be modified';
 end if;
 select name,package_type,width_m,height_m,specifications into pkg from public.packages where id = new.package_id;
 if not found then raise exception 'Package must exist'; end if;
 if new.contract_type is distinct from pkg.package_type then
   raise exception 'Customer contract type must match its selected package';
 end if;
 select name into cust from public.customers where id=new.customer_id;
 if not found then raise exception 'Customer must exist'; end if;
 if new.campaign_id is not null then
   select customer_id,package_id into camp from public.campaigns where id=new.campaign_id;
   if not found or camp.customer_id is distinct from new.customer_id then
     raise exception 'Campaign does not belong to the selected customer';
   end if;
   if camp.package_id is not null and camp.package_id is distinct from new.package_id then
     raise exception 'Contract package must match campaign package';
   end if;
 end if;
 if new.site_id is not null then
   select name into site from public.ad_sites where id=new.site_id;
   if not found then raise exception 'Advertising site does not exist'; end if;
 end if;
 if tg_op='INSERT' or
    (tg_op='UPDATE' and (new.package_id is distinct from old.package_id or new.customer_id is distinct from old.customer_id or new.site_id is distinct from old.site_id)) then
   new.package_name_snapshot := pkg.name;
   new.package_dimensions_snapshot := case when pkg.width_m is not null and pkg.height_m is not null
       then pkg.width_m::text || ' × ' || pkg.height_m::text || ' m'
       else 'Not recorded' end;
   new.package_specifications_snapshot := pkg.specifications;
   new.customer_name_snapshot := cust.name;
   new.site_name_snapshot := case when new.site_id is not null then site.name else null end;
 end if;
 return new;
end $$;
create trigger raafat_customer_contract_guard
before insert or update on public.customer_contracts
for each row execute function public.raafat_set_customer_contract();

alter table public.customer_contracts enable row level security;
create policy raafat_customer_contracts_read on public.customer_contracts
 for select to authenticated using (public.is_staff());
create policy raafat_customer_contracts_insert on public.customer_contracts
 for insert to authenticated with check (public.is_staff());
create policy raafat_customer_contracts_update on public.customer_contracts
 for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy raafat_customer_contracts_delete on public.customer_contracts
 for delete to authenticated using (public.is_admin());
revoke all on public.customer_contracts from public,anon;
grant select,insert,update,delete on public.customer_contracts to authenticated;
grant usage,select on sequence public.raafat_customer_contract_seq to authenticated;
revoke all on function public.raafat_set_customer_contract() from public,anon;
