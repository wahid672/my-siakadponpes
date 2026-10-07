grant select on public.invoices to anon;
grant select on public.profiles to anon;
grant insert on public.payments to anon;
grant update on public.invoices to anon;

create policy "public read invoice" on public.invoices for select to anon
  using (true);

create policy "public read invoice profile" on public.profiles for select to anon
  using (true);

create policy "public insert payment" on public.payments for insert to anon
  with check (true);

create policy "public update invoice" on public.invoices for update to anon
  using (true)
  with check (true);
