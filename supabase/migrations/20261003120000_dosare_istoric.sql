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
