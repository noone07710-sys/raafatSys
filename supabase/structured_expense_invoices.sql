-- Structured company expense invoices, keeping all previously registered expenses.
alter table public.company_expenses
 add column if not exists expense_items jsonb not null default '[]'::jsonb,
 add column if not exists paid_amount numeric(16,2),
 add column if not exists payment_method text not null default 'cash',
 add column if not exists receipt_number text,
 add column if not exists transfer_proof_path text;
update public.company_expenses set paid_amount=amount where paid_amount is null;
alter table public.company_expenses alter column paid_amount set not null;
alter table public.company_expenses alter column paid_amount set default 0;
alter table public.company_expenses drop constraint if exists company_expenses_category_check;
alter table public.company_expenses add constraint company_expenses_category_check
 check(category in (
 'hospitality','office','transport','maintenance','supplies','utilities','other',
 'salaries','rent_services','hospitality_misc','design_subscriptions',
 'stationery','equipment_maintenance','local_transport','internet_telecom'
 ));
alter table public.company_expenses add constraint company_expenses_payment_method_check
 check(payment_method in ('cash','mastercard'));
alter table public.company_expenses add constraint company_expenses_paid_amount_check
 check(paid_amount>=0 and paid_amount<=amount);
alter table public.company_expenses add constraint company_expenses_items_array_check
 check(jsonb_typeof(expense_items)='array' and jsonb_array_length(expense_items)<=100);
alter table public.company_expenses add constraint company_expenses_receipt_number_length_check
 check(receipt_number is null or length(receipt_number)<=80);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('expense-transfers','expense-transfers',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy expense_transfers_staff_read on storage.objects
 for select to authenticated using(bucket_id='expense-transfers' and public.is_staff());
create policy expense_transfers_staff_upload on storage.objects
 for insert to authenticated with check(bucket_id='expense-transfers' and public.is_staff()
  and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy expense_transfers_admin_delete on storage.objects
 for delete to authenticated using(bucket_id='expense-transfers' and public.is_admin());
