create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.settings to authenticated;
grant select on public.settings to anon;
grant all on public.settings to service_role;

alter table public.settings enable row level security;

create policy "read settings" on public.settings for select to authenticated using (true);
create policy "public read settings" on public.settings for select to anon using (true);
create policy "admin write settings" on public.settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.settings (key, value) values (
  'tripay',
  '{
    "mode": "sandbox",
    "merchant_code": "T10469",
    "api_key": "DEV-WqLYW5qy3V6x6BAyZbb60xkJLmYXz0cPJAqwM6qj",
    "private_key": "LX5le-rAseG-TkHmJ-KWo8a-inGpR",
    "is_enabled": true
  }'::jsonb
) on conflict (key) do update set value = excluded.value;
