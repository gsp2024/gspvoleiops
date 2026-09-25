
-- ROLES
CREATE TYPE public.app_role AS ENUM ('gestora','professor','atleta');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  documento TEXT,
  foto_url TEXT,
  data_nascimento DATE,
  posicao TEXT,
  onboarding_completo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_gestora()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'gestora');
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- new user handler: profile + role (first user = gestora)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_count INT;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.user_roles;
  IF v_count = 0 THEN
    v_role := 'gestora';
  ELSIF NEW.raw_user_meta_data->>'perfil' = 'professor' THEN
    v_role := 'professor';
  ELSE
    v_role := 'atleta';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TURMAS
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  horario TEXT,
  local TEXT,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacidade INT NOT NULL DEFAULT 20,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (turma_id, atleta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriculas TO authenticated;
GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_professor_da_turma(_turma_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = _turma_id AND t.professor_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.compartilha_turma(_atleta_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriculas m
    JOIN public.turmas t ON t.id = m.turma_id
    WHERE m.atleta_id = _atleta_id AND t.professor_id = auth.uid()
  );
$$;

-- TORNEIOS
CREATE TABLE public.torneios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE,
  local TEXT,
  taxa_inscricao NUMERIC(10,2) NOT NULL DEFAULT 0,
  resultado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torneios TO authenticated;
GRANT ALL ON public.torneios TO service_role;
ALTER TABLE public.torneios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inscricoes_torneio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneio_id UUID NOT NULL REFERENCES public.torneios(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (torneio_id, atleta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_torneio TO authenticated;
GRANT ALL ON public.inscricoes_torneio TO service_role;
ALTER TABLE public.inscricoes_torneio ENABLE ROW LEVEL SECURITY;

-- FINANCEIRO
CREATE TABLE public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  torneio_id UUID REFERENCES public.torneios(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  metodo TEXT,
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas TO authenticated;
GRANT ALL ON public.cobrancas TO service_role;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.movimentacoes_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_caixa TO authenticated;
GRANT ALL ON public.movimentacoes_caixa TO service_role;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

-- MATERIAIS
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade INT NOT NULL DEFAULT 0,
  minimo INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais TO authenticated;
GRANT ALL ON public.materiais TO service_role;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.movimentacoes_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_material TO authenticated;
GRANT ALL ON public.movimentacoes_material TO service_role;
ALTER TABLE public.movimentacoes_material ENABLE ROW LEVEL SECURITY;

-- UNIFORMES
CREATE TABLE public.pedidos_uniforme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  tamanho TEXT,
  quantidade INT NOT NULL DEFAULT 1,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'solicitado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_uniforme TO authenticated;
GRANT ALL ON public.pedidos_uniforme TO service_role;
ALTER TABLE public.pedidos_uniforme ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "perfil proprio leitura" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_gestora() OR public.compartilha_turma(id) OR public.has_role(auth.uid(),'professor') = false AND false);
CREATE POLICY "perfil proprio update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_gestora()) WITH CHECK (id = auth.uid() OR public.is_gestora());
CREATE POLICY "gestora cria perfis" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_gestora());
CREATE POLICY "gestora apaga perfis" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_gestora());

CREATE POLICY "ver papeis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gestora());

CREATE POLICY "turmas leitura" ON public.turmas FOR SELECT TO authenticated
  USING (public.is_gestora() OR professor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.matriculas m WHERE m.turma_id = turmas.id AND m.atleta_id = auth.uid()));
CREATE POLICY "turmas gestora escreve" ON public.turmas FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "matriculas leitura" ON public.matriculas FOR SELECT TO authenticated
  USING (public.is_gestora() OR atleta_id = auth.uid() OR public.is_professor_da_turma(turma_id));
CREATE POLICY "matriculas gestora escreve" ON public.matriculas FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "torneios leitura" ON public.torneios FOR SELECT TO authenticated USING (true);
CREATE POLICY "torneios gestora escreve" ON public.torneios FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "inscricoes leitura" ON public.inscricoes_torneio FOR SELECT TO authenticated
  USING (public.is_gestora() OR atleta_id = auth.uid() OR public.compartilha_turma(atleta_id));
CREATE POLICY "inscricoes gestora escreve" ON public.inscricoes_torneio FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "cobrancas leitura" ON public.cobrancas FOR SELECT TO authenticated
  USING (public.is_gestora() OR atleta_id = auth.uid());
CREATE POLICY "cobrancas gestora escreve" ON public.cobrancas FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "caixa gestora" ON public.movimentacoes_caixa FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "materiais leitura" ON public.materiais FOR SELECT TO authenticated
  USING (public.is_gestora() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "materiais gestora escreve" ON public.materiais FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "mov material leitura" ON public.movimentacoes_material FOR SELECT TO authenticated
  USING (public.is_gestora() OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "mov material gestora escreve" ON public.movimentacoes_material FOR ALL TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());

CREATE POLICY "uniformes leitura" ON public.pedidos_uniforme FOR SELECT TO authenticated
  USING (public.is_gestora() OR atleta_id = auth.uid());
CREATE POLICY "uniformes atleta cria" ON public.pedidos_uniforme FOR INSERT TO authenticated
  WITH CHECK (atleta_id = auth.uid() OR public.is_gestora());
CREATE POLICY "uniformes gestora atualiza" ON public.pedidos_uniforme FOR UPDATE TO authenticated
  USING (public.is_gestora()) WITH CHECK (public.is_gestora());
CREATE POLICY "uniformes gestora apaga" ON public.pedidos_uniforme FOR DELETE TO authenticated
  USING (public.is_gestora());
