-- Bootstrap: el dueño de un negocio recién creado necesita poder insertar
-- su propia fila de business_members (rol owner) antes de que exista
-- ninguna membresía — y luego poder leerla de vuelta (RETURNING).
drop policy "members_select_same_business" on public.business_members;
create policy "members_select_same_business" on public.business_members for select
  using (
    public.is_business_member(business_id)
    or public.is_super_admin()
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy "members_insert_admin" on public.business_members;
create policy "members_insert_admin" on public.business_members for insert
  with check (
    public.is_business_member(business_id, array['owner','admin']::public.member_role[])
    or (
      role = 'owner'
      and user_id = auth.uid()
      and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    )
  );
