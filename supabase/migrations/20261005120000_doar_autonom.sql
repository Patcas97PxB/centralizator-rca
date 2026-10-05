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
