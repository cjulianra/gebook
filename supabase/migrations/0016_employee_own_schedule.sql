-- Un empleado puede editar su propio horario semanal (marcar días en los que
-- no puede trabajar, ajustar su hora de entrada/salida), sin tocar el de
-- nadie más. owner/admin conservan control total vía la política existente.
create policy "work_schedules_write_own" on public.work_schedules for all
  using (
    exists (
      select 1 from public.business_members bm
      where bm.id = business_member_id and bm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.id = business_member_id and bm.user_id = auth.uid()
    )
  );
