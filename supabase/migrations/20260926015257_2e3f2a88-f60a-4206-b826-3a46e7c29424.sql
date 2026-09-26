CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
CREATE OR REPLACE FUNCTION app_private.atleta_professor(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.atleta_turmas at JOIN public.turmas t ON t.id=at.turma_id WHERE at.atleta_id=_id AND t.professor_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.atletas a JOIN public.matriculas m ON m.atleta_id=a.profile_id JOIN public.turmas t ON t.id=m.turma_id WHERE a.id=_id AND t.professor_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION app_private.atleta_professor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.atleta_professor(uuid) TO authenticated, service_role;
ALTER POLICY "atletas leitura autorizada" ON public.atletas USING (public.is_gestora() OR (deleted_at IS NULL AND (profile_id=auth.uid() OR app_private.atleta_professor(id))));
ALTER POLICY "fotos leitura" ON storage.objects USING (bucket_id='atletas-fotos' AND EXISTS (SELECT 1 FROM public.atletas a WHERE a.id::text=split_part(name,'/',1) AND a.deleted_at IS NULL AND (public.is_gestora() OR a.profile_id=auth.uid() OR app_private.atleta_professor(a.id))));
DROP FUNCTION public.atleta_professor(uuid);