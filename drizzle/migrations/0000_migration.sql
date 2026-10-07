create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  organization text,
  address text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  user_id uuid not null,
  issue_date date not null default current_date,
  due_date date not null default current_date,
  status text not null default 'unpaid' check (status in ('unpaid','paid','cancelled')),
  items jsonb not null default '[]'::jsonb,
  tax_rate numeric not null default 0,
  discount numeric not null default 0,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null,
  amount numeric not null,
  method text not null default 'transfer',
  reference text,
  paid_at timestamptz not null default now()
);

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.profiles, public.user_roles, public.invoices, public.payments to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create policy "own or admin profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own or admin profile update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "invoice read" on public.invoices for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "invoice admin insert" on public.invoices for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create policy "invoice admin update" on public.invoices for update to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "invoice admin delete" on public.invoices for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "payment read" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "payment admin write" on public.payments for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();