
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gestora() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_professor_da_turma(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compartilha_turma(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestora() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_professor_da_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compartilha_turma(uuid) TO authenticated;
