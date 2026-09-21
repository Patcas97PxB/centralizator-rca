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
