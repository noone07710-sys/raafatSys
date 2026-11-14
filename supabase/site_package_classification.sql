-- Classify each advertising site by its actual A-E package, independently of its road/roof location type.
-- Preserve existing sites and bookings; legacy A01 / A-01 / A_01 site codes are backfilled safely.
alter table public.ad_sites add column if not exists package_id uuid
 references public.packages(id) on delete set null;
create index if not exists raafat_ad_sites_package_idx on public.ad_sites(package_id);

update public.ad_sites s
set package_id=p.id
from public.packages p
where s.package_id is null
 and trim(s.code) ~* '^[A-E]($|[0-9._/[:space:]-])'
 and upper(left(trim(s.code),1))=upper(trim(p.code))
 and upper(trim(p.code)) in ('A','B','C','D','E');
