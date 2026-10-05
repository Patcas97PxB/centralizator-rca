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
-- Bucket privat pentru documentele dosarelor (deviz, contract, poze).
-- Privat inseamna ca fisierele nu sunt vizibile public direct pe internet —
-- se pot deschide doar prin linkuri temporare, generate cand utilizatorul autentificat le cere.
insert into storage.buckets (id, name, public)
values ('documente', 'documente', false)
on conflict (id) do nothing;

create policy "authenticated can upload documente"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documente');

create policy "authenticated can read documente"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documente');

create policy "authenticated can delete documente"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documente');
-- Inlocuieste blob-ul unic din app_storage cu cate un rand per dosar/serviciu.
-- Motiv: storageSet() rescria intregul array de dosare intr-un singur rand din app_storage —
-- daca doua sesiuni salvau aproape simultan, ultima scriere stergea silentios TOATE
-- modificarile celeilalte sesiuni, nu doar pe cele in conflict. Cu un rand per dosar,
-- doua sesiuni care editeaza dosare diferite nu se mai calca una pe alta; ramane risc de
-- suprascriere doar daca ambele editeaza EXACT acelasi dosar in acelasi timp.
-- app_storage nu se sterge — ramane ca plasa de siguranta si tine in continuare alte chei
-- mici (ex. modul de vizualizare).
create table if not exists public.dosare (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.servicii (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.dosare enable row level security;
alter table public.servicii enable row level security;

create policy "authenticated can read dosare"
  on public.dosare for select
  to authenticated
  using (true);

create policy "authenticated can insert dosare"
  on public.dosare for insert
  to authenticated
  with check (true);

create policy "authenticated can update dosare"
  on public.dosare for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can delete dosare"
  on public.dosare for delete
  to authenticated
  using (true);

create policy "authenticated can read servicii"
  on public.servicii for select
  to authenticated
  using (true);

create policy "authenticated can insert servicii"
  on public.servicii for insert
  to authenticated
  with check (true);

create policy "authenticated can update servicii"
  on public.servicii for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can delete servicii"
  on public.servicii for delete
  to authenticated
  using (true);
-- Istoric + "cos de gunoi" pentru dosare. Un trigger pastreaza automat vechea versiune a
-- randului la fiecare modificare/stergere, fara nicio schimbare in aplicatie la salvare.
--  - op = 'update': versiunea de DINAINTE de modificare (ultimele 20 per dosar)
--  - op = 'delete': ultima versiune a unui dosar sters (se pastreaza 180 de zile)
-- Aplicatia le citeste din "Recuperare" si poate restaura oricare versiune. Clientii pot
-- doar citi tabelul; scrie doar trigger-ul (security definer).
create table if not exists public.dosare_istoric (
  id bigint generated always as identity primary key,
  dosar_id text not null,
  op text not null check (op in ('update', 'delete')),
  data jsonb not null,
  version_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dosare_istoric_dosar_idx on public.dosare_istoric (dosar_id, id desc);
create index if not exists dosare_istoric_created_idx on public.dosare_istoric (created_at desc);

alter table public.dosare_istoric enable row level security;

create policy "authenticated can read dosare_istoric"
  on public.dosare_istoric for select
  to authenticated
  using (true);

create or replace function public.dosare_arhiveaza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.data is not distinct from new.data then
    return null;
  end if;

  insert into public.dosare_istoric (dosar_id, op, data, version_at)
  values (old.id, lower(tg_op), old.data, old.updated_at);

  delete from public.dosare_istoric
  where dosar_id = old.id
    and op = 'update'
    and id not in (
      select id from public.dosare_istoric
      where dosar_id = old.id and op = 'update'
      order by id desc
      limit 20
    );

  delete from public.dosare_istoric where created_at < now() - interval '180 days';
  return null;
end;
$$;

drop trigger if exists dosare_arhiveaza on public.dosare;
create trigger dosare_arhiveaza
  after update or delete on public.dosare
  for each row execute function public.dosare_arhiveaza();
-- Acces doar pentru conturile cu adresa @autonom.com. Inainte, orice utilizator autentificat avea
-- acces la tot (un singur cont partajat). Acum fiecare persoana are contul ei, creat de administrator
-- in Supabase (inregistrarea libera e oprita din Authentication -> Sign In / Providers), iar
-- regula de mai jos asigura ca un cont care nu e Autonom nu vede si nu modifica nimic, chiar daca
-- ar exista.

create or replace function public.e_utilizator_autonom()
returns boolean
language sql
stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@autonom.com', false)
$$;

-- dosare
drop policy if exists "authenticated can read dosare" on public.dosare;
drop policy if exists "authenticated can insert dosare" on public.dosare;
drop policy if exists "authenticated can update dosare" on public.dosare;
drop policy if exists "authenticated can delete dosare" on public.dosare;
create policy "autonom can read dosare" on public.dosare for select to authenticated using (public.e_utilizator_autonom());
create policy "autonom can insert dosare" on public.dosare for insert to authenticated with check (public.e_utilizator_autonom());
create policy "autonom can update dosare" on public.dosare for update to authenticated using (public.e_utilizator_autonom()) with check (public.e_utilizator_autonom());
create policy "autonom can delete dosare" on public.dosare for delete to authenticated using (public.e_utilizator_autonom());

-- servicii
drop policy if exists "authenticated can read servicii" on public.servicii;
drop policy if exists "authenticated can insert servicii" on public.servicii;
drop policy if exists "authenticated can update servicii" on public.servicii;
drop policy if exists "authenticated can delete servicii" on public.servicii;
create policy "autonom can read servicii" on public.servicii for select to authenticated using (public.e_utilizator_autonom());
create policy "autonom can insert servicii" on public.servicii for insert to authenticated with check (public.e_utilizator_autonom());
create policy "autonom can update servicii" on public.servicii for update to authenticated using (public.e_utilizator_autonom()) with check (public.e_utilizator_autonom());
create policy "autonom can delete servicii" on public.servicii for delete to authenticated using (public.e_utilizator_autonom());

-- istoric dosare (doar citire; scrie trigger-ul)
drop policy if exists "authenticated can read dosare_istoric" on public.dosare_istoric;
create policy "autonom can read dosare_istoric" on public.dosare_istoric for select to authenticated using (public.e_utilizator_autonom());

-- app_storage (blob-ul vechi, pastrat ca plasa de siguranta)
drop policy if exists "authenticated can read app_storage" on public.app_storage;
drop policy if exists "authenticated can insert app_storage" on public.app_storage;
drop policy if exists "authenticated can update app_storage" on public.app_storage;
create policy "autonom can read app_storage" on public.app_storage for select to authenticated using (public.e_utilizator_autonom());
create policy "autonom can insert app_storage" on public.app_storage for insert to authenticated with check (public.e_utilizator_autonom());
create policy "autonom can update app_storage" on public.app_storage for update to authenticated using (public.e_utilizator_autonom()) with check (public.e_utilizator_autonom());

-- documente (bucket privat)
drop policy if exists "authenticated can upload documente" on storage.objects;
drop policy if exists "authenticated can read documente" on storage.objects;
drop policy if exists "authenticated can delete documente" on storage.objects;
create policy "autonom can upload documente" on storage.objects for insert to authenticated with check (bucket_id = 'documente' and public.e_utilizator_autonom());
create policy "autonom can read documente" on storage.objects for select to authenticated using (bucket_id = 'documente' and public.e_utilizator_autonom());
create policy "autonom can delete documente" on storage.objects for delete to authenticated using (bucket_id = 'documente' and public.e_utilizator_autonom());
