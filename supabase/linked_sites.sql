-- Raafat Sys: linked advertising site inventory and campaign selections.
-- Additive only; existing records and Layali tables untouched.
create table if not exists public.ad_sites (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 site_type text not null default 'roadside' check(site_type in ('roadside','rooftop','building','other')),
 governorate text not null,
 address text not null,
 rooftop_property_id uuid references public.properties(id) on delete restrict,
 active boolean not null default true,
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.campaign_sites (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 site_id uuid not null references public.ad_sites(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(campaign_id,site_id)
);
create index if not exists idx_ad_sites_rooftop_property on public.ad_sites(rooftop_property_id);
create index if not exists idx_campaign_sites_campaign on public.campaign_sites(campaign_id);
create index if not exists idx_campaign_sites_site on public.campaign_sites(site_id);
alter table public.ad_sites enable row level security;
alter table public.campaign_sites enable row level security;
create policy raafat_sites_read on public.ad_sites for select to authenticated using (public.is_staff());
create policy raafat_sites_write on public.ad_sites for insert to authenticated with check (public.is_staff());
create policy raafat_sites_edit on public.ad_sites for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy raafat_sites_delete on public.ad_sites for delete to authenticated using (public.is_admin());
create policy raafat_campaign_sites_read on public.campaign_sites for select to authenticated using (public.is_staff());
create policy raafat_campaign_sites_write on public.campaign_sites for insert to authenticated with check (public.is_staff());
create policy raafat_campaign_sites_edit on public.campaign_sites for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy raafat_campaign_sites_delete on public.campaign_sites for delete to authenticated using (public.is_staff());
revoke all on public.ad_sites,public.campaign_sites from anon;
revoke all on public.ad_sites,public.campaign_sites from public;
grant select,insert,update,delete on public.ad_sites,public.campaign_sites to authenticated;
