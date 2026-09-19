-- Stochează datele aplicației RCA (dosare + servicii) ca perechi cheie/valoare,
-- în același format JSON pe care aplicația îl salva anterior în localStorage.
-- Așa se păstrează toată logica existentă din site fără modificări.
create table if not exists public.app_storage (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_storage enable row level security;

-- Un singur cont partajat folosește site-ul, așa că orice utilizator autentificat
-- are voie să citească și să scrie toate cheile.
create policy "authenticated can read app_storage"
  on public.app_storage for select
  to authenticated
  using (true);

create policy "authenticated can insert app_storage"
  on public.app_storage for insert
  to authenticated
  with check (true);

create policy "authenticated can update app_storage"
  on public.app_storage for update
  to authenticated
  using (true)
  with check (true);
