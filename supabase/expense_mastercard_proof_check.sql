-- Require supporting evidence for recorded paid MasterCard transfers.
alter table public.company_expenses
 add constraint company_expenses_mastercard_proof_check
 check (payment_method<>'mastercard' or paid_amount=0
  or (transfer_proof_path is not null and length(btrim(transfer_proof_path))>0));
