-- Raafat Sys: secure initial schema. Execute on a NEW dedicated Supabase project.
create extension if not exists pgcrypto;
create table if not exists public.staff_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'staff' check(role in ('admin','staff')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create or replace function public.is_staff() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active)
$$;
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active and role='admin')
$$;
-- staff_members has a narrowly scoped SELECT policy; a user can read only their own membership.
alter table public.staff_members enable row level security;
create policy staff_self_read on public.staff_members for select to authenticated using (user_id=(select auth.uid()));
-- Manage staff through SQL editor initially; no unrestricted client-side grants.
create table if not exists public.settings (
 id integer primary key default 1 check(id=1),
 usd_iqd numeric(14,4) not null default 1500 check(usd_iqd>0),
 updated_at timestamptz not null default now()
);
insert into public.settings(id,usd_iqd) values(1,1500) on conflict(id) do nothing;
create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 phone text not null check(phone ~ '^[0-9]{11}$'),
 alternate_phone text check(alternate_phone is null or alternate_phone='' or alternate_phone ~ '^[0-9]{11}$'),
 national_id text not null check(national_id ~ '^[0-9]{12}$'),
 rental_address text not null,
 status text not null default 'inquiry' check(status in ('active','inactive','inquiry')),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.packages(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 code text not null unique,
 default_months integer not null default 3 check(default_months>0),
 price numeric(16,2) not null default 0 check(price>=0),
 currency text not null default 'IQD' check(currency in ('IQD','USD')),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.landlords(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 phone text not null check(phone ~ '^[0-9]{11}$'),
 alternate_phone text check(alternate_phone is null or alternate_phone='' or alternate_phone ~ '^[0-9]{11}$'),
 national_id text,
 governorate text not null,
 residential_address text not null,
 landmark text,
 card_image_path text,
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.properties(
 id uuid primary key default gen_random_uuid(),
 landlord_id uuid not null references public.landlords(id) on delete restrict,
 title text not null,
 location_type text not null default 'rooftop' check(location_type='rooftop'),
 dimensions text not null,
 quantity integer not null default 1 check(quantity>0),
 notes text,
 created_at timestamptz not null default now()
);
create sequence if not exists public.lease_number_sequence start 1;
create table if not exists public.leases(
 id uuid primary key default gen_random_uuid(),
 contract_number text not null unique,
 landlord_id uuid not null references public.landlords(id) on delete restrict,
 property_id uuid not null references public.properties(id) on delete restrict,
 rent_total numeric(16,2) not null check(rent_total>=0),
 currency text not null check(currency in ('IQD','USD')),
 start_date date not null,
 end_date date not null,
 grace_days integer not null default 0 check(grace_days>=0),
 payment_frequency text not null check(payment_frequency in ('annual','semiannual')),
 company_representative text,
 landlord_representative text,
 notes text,
 renewed_from uuid references public.leases(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint valid_lease_dates check(end_date>=start_date)
);
create or replace function public.assign_lease_number() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.contract_number is null or new.contract_number='' then
   new.contract_number := 'RA-' || nextval('public.lease_number_sequence');
 end if;
 if not exists(select 1 from public.properties where id=new.property_id and landlord_id=new.landlord_id) then
   raise exception 'Property does not belong to the selected landlord';
 end if;
 return new;
end $$;
drop trigger if exists lease_number_trigger on public.leases;
create trigger lease_number_trigger before insert or update of landlord_id,property_id on public.leases
for each row execute function public.assign_lease_number();
create table if not exists public.lease_installments(
 id uuid primary key default gen_random_uuid(),
 lease_id uuid not null references public.leases(id) on delete cascade,
 due_date date not null,
 amount numeric(16,2) not null check(amount>=0),
 paid_amount numeric(16,2) not null default 0 check(paid_amount>=0),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.campaigns(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete restrict,
 title text not null,
 package_id uuid references public.packages(id) on delete set null,
 months integer not null default 3 check(months>0),
 locations text,
 price numeric(16,2) not null default 0 check(price>=0),
 currency text not null default 'IQD' check(currency in ('IQD','USD')),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.campaign_payments(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 paid_at date not null,
 amount numeric(16,2) not null check(amount>=0),
 notes text,
 created_at timestamptz not null default now()
);
create index if not exists idx_properties_landlord on public.properties(landlord_id);
create index if not exists idx_leases_landlord on public.leases(landlord_id);
create index if not exists idx_installments_lease on public.lease_installments(lease_id);
create index if not exists idx_campaigns_customer on public.campaigns(customer_id);
create index if not exists idx_campaign_payments_campaign on public.campaign_payments(campaign_id);
-- Restrict every data table to explicitly registered active staff members.
do $$
declare t text;
begin
 foreach t in array array['settings','customers','packages','landlords','properties','leases','lease_installments','campaigns','campaign_payments'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())','staff_read_'||t,t);
   execute format('create policy %I on public.%I for insert to authenticated with check (public.is_staff())','staff_add_'||t,t);
   execute format('create policy %I on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())','staff_edit_'||t,t);
   execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())','admin_delete_'||t,t);
 end loop;
end $$;
-- Browser can use publishable/anon key with RLS enforcing auth and staff authorization.
grant usage on schema public to authenticated;
grant select on public.staff_members to authenticated;
grant select,insert,update,delete on public.settings,public.customers,public.packages,public.landlords,public.properties,public.leases,public.lease_installments,public.campaigns,public.campaign_payments to authenticated;
grant usage on sequence public.lease_number_sequence to authenticated;
-- Make identity images strictly private; signed-in registered staff only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('identity-cards','identity-cards',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false;
create policy staff_cards_read on storage.objects for select to authenticated
using(bucket_id='identity-cards' and public.is_staff());
create policy staff_cards_insert on storage.objects for insert to authenticated
with check(bucket_id='identity-cards' and public.is_staff());
create policy staff_cards_update on storage.objects for update to authenticated
using(bucket_id='identity-cards' and public.is_staff())
with check(bucket_id='identity-cards' and public.is_staff());
