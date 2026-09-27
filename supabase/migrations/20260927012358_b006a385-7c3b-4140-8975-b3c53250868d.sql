CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION app_private.is_professor_da_turma(_turma_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = _turma_id AND t.professor_id = auth.uid()) $$;
CREATE OR REPLACE FUNCTION app_private.compartilha_turma(_atleta_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.matriculas m JOIN public.turmas t ON t.id = m.turma_id WHERE m.atleta_id = _atleta_id AND t.professor_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role), app_private.is_professor_da_turma(uuid), app_private.compartilha_turma(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role), app_private.is_professor_da_turma(uuid), app_private.compartilha_turma(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT app_private.has_role(_user_id, _role) $$;
CREATE OR REPLACE FUNCTION public.is_gestora() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT app_private.has_role(auth.uid(), 'gestora') $$;
CREATE OR REPLACE FUNCTION public.is_professor_da_turma(_turma_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT app_private.is_professor_da_turma(_turma_id) $$;
CREATE OR REPLACE FUNCTION public.compartilha_turma(_atleta_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT app_private.compartilha_turma(_atleta_id) $$;
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.is_gestora() SECURITY INVOKER;
ALTER FUNCTION public.is_professor_da_turma(uuid) SECURITY INVOKER;
ALTER FUNCTION public.compartilha_turma(uuid) SECURITY INVOKER;