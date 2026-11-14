-- Raafat Sys: official package rates copied from raafat-map-live/booking.js.
-- Non-destructive: preserve any existing package overrides and custom packages.
alter table public.packages
 add column if not exists pricing_mode text not null default 'fixed_term'
 check (pricing_mode in ('fixed_term','sqm_month'));

create table if not exists public.package_rates(
 id uuid primary key default gen_random_uuid(),
 package_id uuid not null references public.packages(id) on delete cascade,
 months integer not null check (months in (1,3,6,12)),
 usd_price numeric(16,2) not null check (usd_price>=0),
 created_at timestamptz not null default now(),
 unique(package_id,months)
);
create index if not exists raafat_package_rates_package_idx on public.package_rates(package_id);
alter table public.package_rates enable row level security;
create policy raafat_package_rates_read on public.package_rates
 for select to authenticated using (public.is_staff());
create policy raafat_package_rates_insert on public.package_rates
 for insert to authenticated with check (public.is_staff());
create policy raafat_package_rates_update on public.package_rates
 for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy raafat_package_rates_delete on public.package_rates
 for delete to authenticated using (public.is_admin());
revoke all on public.package_rates from public,anon;
grant select,insert,update,delete on public.package_rates to authenticated;

alter table public.campaigns
 add column if not exists requested_area_m2 numeric(12,4)
 check (requested_area_m2 is null or requested_area_m2 > 0),
 add column if not exists quantity integer not null default 1 check (quantity>0);

-- Existing rows are retained; A-E only inserted when a matching code does not exist.
insert into public.packages
 (code,name,package_type,pricing_mode,width_m,height_m,sides,default_months,price,currency,specifications,notes)
values
 ('A','الباقة A','cabin','fixed_term',1.2,2,2,3,280,'USD','لوحة مضيئة بوجهين؛ يشمل الإيجار والتصميم والطباعة والتبديل والصيانة','تعرفة A الأصلية من Raafat Map'),
 ('B','الباقة B','cabin','fixed_term',2,3,2,3,520,'USD','لوحة مضيئة بوجهين؛ يشمل الإيجار والتصميم والطباعة والتبديل والصيانة','تعرفة B الأصلية من Raafat Map'),
 ('C','الباقة C','cabin','fixed_term',2.5,3.5,2,3,760,'USD','لوحة مضيئة بوجهين؛ يشمل الإيجار والتصميم والطباعة والتبديل والصيانة','تعرفة C الأصلية من Raafat Map'),
 ('D','الباقة D','cabin','fixed_term',3,4,2,3,800,'USD','لوحة مضيئة بوجهين؛ يشمل الإيجار والتصميم والطباعة والتبديل والصيانة','تعرفة D الأصلية من Raafat Map'),
 ('E','الباقة E — إعلانات الأسطح','rooftop','sqm_month',null,null,1,3,12,'USD','التسعير للمتر المربع شهرياً بحسب مدة العقد. إجمالي السعر = مساحة الإعلان × السعر الشهري للمتر × عدد الأشهر','مساحات الأسطح بقياسات خاصة')
on conflict (code) do nothing;

-- Rates are stored in USD; the price meaning is controlled by the package's pricing_mode.
-- A-D: usd_price is per one site for the entire contract term.
-- E: usd_price is per 1 m² PER MONTH, multiplied by number of months.
with official(code,months,usd_price) as (
 values
 ('A',3,280),('A',6,430),('A',12,670),
 ('B',3,520),('B',6,760),('B',12,1120),
 ('C',3,760),('C',6,1100),('C',12,1800),
 ('D',3,800),('D',6,1300),('D',12,2100),
 ('E',1,15),('E',3,12),('E',6,9),('E',12,6)
)
insert into public.package_rates(package_id,months,usd_price)
select p.id,o.months,o.usd_price from official o
join public.packages p on p.code=o.code
on conflict(package_id,months) do nothing;
