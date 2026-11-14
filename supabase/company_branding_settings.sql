-- Raafat Sys company identity settings. Do not modify Layali project data.
alter table public.settings
 add column if not exists company_name text not null default 'شركة رأفت للدعاية والإعلان والتجارة العامة',
 add column if not exists company_short_name text not null default 'رأفت',
 add column if not exists company_tagline text not null default 'للدعاية والإعلان والتجارة العامة',
 add column if not exists company_phone text,
 add column if not exists company_whatsapp text,
 add column if not exists company_email text,
 add column if not exists company_website text,
 add column if not exists company_address text,
 add column if not exists company_governorate text,
 add column if not exists company_city text,
 add column if not exists company_registration text,
 add column if not exists logo_path text;

-- Company logos are intentionally public media; only authorized Raafat admins can modify them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('raafat-branding','raafat-branding',true,4194304,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update
 set public=true,file_size_limit=4194304,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

create policy raafat_branding_admin_insert on storage.objects
 for insert to authenticated
 with check(bucket_id='raafat-branding' and public.is_admin());

create policy raafat_branding_admin_update on storage.objects
 for update to authenticated
 using(bucket_id='raafat-branding' and public.is_admin())
 with check(bucket_id='raafat-branding' and public.is_admin());

create policy raafat_branding_admin_delete on storage.objects
 for delete to authenticated
 using(bucket_id='raafat-branding' and public.is_admin());
