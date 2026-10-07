grant select on public.payments to anon;

create policy "public read payment" on public.payments for select to anon
  using (true);
