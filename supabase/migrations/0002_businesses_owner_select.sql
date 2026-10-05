-- El owner debe poder ver su negocio recién creado antes de que exista su fila
-- en business_members (el RETURNING del INSERT depende de la política SELECT).
drop policy "businesses_select_member" on public.businesses;
create policy "businesses_select_member" on public.businesses for select
  using (owner_id = auth.uid() or public.is_business_member(id) or public.is_super_admin());
