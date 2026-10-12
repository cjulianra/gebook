-- La migración anterior creó un índice único PARCIAL (where booking_id is
-- not null), pero Postgres no puede usar un índice parcial como objetivo de
-- "on conflict (booking_id)" sin repetir el mismo WHERE ahí, algo que
-- supabase-js no genera. Un constraint único normal funciona igual de bien:
-- en SQL estándar múltiples NULL nunca chocan entre sí, así que las
-- anotaciones manuales (booking_id null) siguen sin verse afectadas.
drop index if exists public.notebook_entries_booking_id_key;
alter table public.notebook_entries
  add constraint notebook_entries_booking_id_key unique (booking_id);
