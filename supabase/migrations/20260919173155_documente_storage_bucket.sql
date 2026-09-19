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
