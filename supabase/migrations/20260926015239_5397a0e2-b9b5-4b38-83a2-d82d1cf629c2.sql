CREATE SEQUENCE public.atletas_numero_seq;
CREATE TABLE public.atletas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), numero bigint NOT NULL UNIQUE DEFAULT nextval('public.atletas_numero_seq'), profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
 nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 40), data_nascimento date, status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa')),
 posicoes text[] NOT NULL DEFAULT '{}', categorias text[] NOT NULL DEFAULT '{}', possui_camiseta boolean NOT NULL DEFAULT false,
 numero_camiseta integer CHECK (numero_camiseta BETWEEN 0 AND 999), formulario_status text NOT NULL DEFAULT 'pendente' CHECK (formulario_status IN ('pendente','preenchido','atualizacao_necessaria')),
 formulario_preenchido_em timestamptz, formulario_atualizado_em timestamptz,
 foto_path text, foto_nome text, deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT camiseta_condicional CHECK (possui_camiseta OR numero_camiseta IS NULL),
 CONSTRAINT nascimento_valido CHECK (data_nascimento IS NULL OR data_nascimento >= '1900-01-01'::date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atletas TO authenticated;
GRANT ALL ON public.atletas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.atletas_numero_seq TO authenticated, service_role;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX atletas_camiseta_ativa_unique ON public.atletas(numero_camiseta) WHERE status = 'ativa' AND deleted_at IS NULL AND numero_camiseta IS NOT NULL;
CREATE INDEX atletas_deleted_at_idx ON public.atletas(deleted_at);
CREATE TABLE public.atletas_privado (
 atleta_id uuid PRIMARY KEY REFERENCES public.atletas(id) ON DELETE CASCADE,
 rg text NOT NULL CHECK (char_length(rg) BETWEEN 1 AND 20), cpf text NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
 documento_path text, documento_nome text, documento_enviado_em timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atletas_privado TO authenticated;
GRANT ALL ON public.atletas_privado TO service_role;
ALTER TABLE public.atletas_privado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestora consulta dados privados" ON public.atletas_privado FOR SELECT TO authenticated USING (public.is_gestora());
CREATE POLICY "gestora gerencia dados privados" ON public.atletas_privado FOR ALL TO authenticated USING (public.is_gestora()) WITH CHECK (public.is_gestora());
CREATE TABLE public.atleta_turmas (
 atleta_id uuid NOT NULL REFERENCES public.atletas(id) ON DELETE CASCADE,
 turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (atleta_id,turma_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atleta_turmas TO authenticated;
GRANT ALL ON public.atleta_turmas TO service_role;
ALTER TABLE public.atleta_turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestora gerencia vinculos turmas" ON public.atleta_turmas FOR ALL TO authenticated USING (public.is_gestora()) WITH CHECK (public.is_gestora());
CREATE POLICY "turma ve vinculos" ON public.atleta_turmas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.atletas a WHERE a.id=atleta_id AND a.deleted_at IS NULL AND (a.profile_id=auth.uid() OR public.is_professor_da_turma(turma_id))));
CREATE TABLE public.atleta_torneios (
 atleta_id uuid NOT NULL REFERENCES public.atletas(id) ON DELETE CASCADE,
 torneio_id uuid NOT NULL REFERENCES public.torneios(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (atleta_id,torneio_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atleta_torneios TO authenticated;
GRANT ALL ON public.atleta_torneios TO service_role;
ALTER TABLE public.atleta_torneios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestora gerencia vinculos torneios" ON public.atleta_torneios FOR ALL TO authenticated USING (public.is_gestora()) WITH CHECK (public.is_gestora());
CREATE POLICY "atleta consulta seus torneios" ON public.atleta_torneios FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.atletas a WHERE a.id=atleta_id AND a.profile_id=auth.uid() AND a.deleted_at IS NULL));
CREATE TABLE public.atleta_opcoes (
 tipo text NOT NULL CHECK (tipo IN ('posicao','categoria')), nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 40), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tipo,nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atleta_opcoes TO authenticated;
GRANT ALL ON public.atleta_opcoes TO service_role;
ALTER TABLE public.atleta_opcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opcoes leitura" ON public.atleta_opcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestora gerencia opcoes" ON public.atleta_opcoes FOR ALL TO authenticated USING (public.is_gestora()) WITH CHECK (public.is_gestora());
INSERT INTO public.atleta_opcoes(tipo,nome) VALUES ('posicao','Central'),('posicao','Ponta'),('posicao','Oposta'),('posicao','Levantadora'),('posicao','Líbero'),('posicao','Técnico'),('posicao','Comissão Técnica'),('posicao','Professor de turma'),('categoria','Sub 10'),('categoria','Sub 12'),('categoria','Sub 15'),('categoria','Sub 17'),('categoria','Sub 19'),('categoria','Sub 21'),('categoria','Adulto'),('categoria','Master E1'),('categoria','Master E2'),('categoria','Master E'),('categoria','Master D'),('categoria','Master D2');
CREATE TABLE public.atleta_historico (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, atleta_id uuid NOT NULL REFERENCES public.atletas(id) ON DELETE CASCADE,
 responsavel_id uuid, campo text NOT NULL, anterior text, novo text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.atleta_historico TO authenticated;
GRANT ALL ON public.atleta_historico TO service_role;
ALTER TABLE public.atleta_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestora consulta historico" ON public.atleta_historico FOR SELECT TO authenticated USING (public.is_gestora());
CREATE OR REPLACE FUNCTION public.atleta_professor(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.atleta_turmas at JOIN public.turmas t ON t.id=at.turma_id WHERE at.atleta_id=_id AND t.professor_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.atletas a JOIN public.matriculas m ON m.atleta_id=a.profile_id JOIN public.turmas t ON t.id=m.turma_id WHERE a.id=_id AND t.professor_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.atleta_professor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atleta_professor(uuid) TO authenticated, service_role;
CREATE POLICY "atletas leitura autorizada" ON public.atletas FOR SELECT TO authenticated USING (public.is_gestora() OR (deleted_at IS NULL AND (profile_id=auth.uid() OR public.atleta_professor(id))));
CREATE POLICY "gestora cria atletas" ON public.atletas FOR INSERT TO authenticated WITH CHECK (public.is_gestora());
CREATE POLICY "gestora altera atletas" ON public.atletas FOR UPDATE TO authenticated USING (public.is_gestora()) WITH CHECK (public.is_gestora());
CREATE POLICY "gestora remove apos prazo" ON public.atletas FOR DELETE TO authenticated USING (public.is_gestora() AND deleted_at IS NOT NULL AND deleted_at <= now() - interval '30 days');
CREATE OR REPLACE FUNCTION public.cpf_atleta_valido(v text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE i int; soma int; d1 int; d2 int;
BEGIN
 IF v IS NULL OR v !~ '^[0-9]{11}$' OR v ~ '^([0-9])\1{10}$' THEN RETURN false; END IF;
 soma:=0; FOR i IN 1..9 LOOP soma:=soma+(substr(v,i,1)::int)*(11-i); END LOOP;
 d1:=(soma*10)%11; IF d1=10 THEN d1:=0; END IF;
 soma:=0; FOR i IN 1..10 LOOP soma:=soma+(substr(v,i,1)::int)*(12-i); END LOOP;
 d2:=(soma*10)%11; IF d2=10 THEN d2:=0; END IF;
 RETURN d1=substr(v,10,1)::int AND d2=substr(v,11,1)::int;
END $$;
ALTER TABLE public.atletas_privado ADD CONSTRAINT cpf_atleta_valido CHECK (public.cpf_atleta_valido(cpf));
CREATE OR REPLACE FUNCTION public.atleta_regras() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.data_nascimento > current_date THEN RAISE EXCEPTION 'Data de nascimento futura'; END IF;
 IF NEW.profile_id IS NULL AND (NEW.data_nascimento IS NULL OR cardinality(NEW.posicoes)=0 OR cardinality(NEW.categorias)=0) THEN RAISE EXCEPTION 'Dados obrigatorios ausentes'; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.numero IS DISTINCT FROM OLD.numero THEN RAISE EXCEPTION 'Numero da atleta nao pode mudar'; END IF;
   IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND OLD.deleted_at <= now()-interval '30 days' THEN RAISE EXCEPTION 'Prazo para restaurar encerrado'; END IF;
   IF NEW.formulario_status IS DISTINCT FROM OLD.formulario_status THEN
     NEW.formulario_atualizado_em:=now();
     IF NEW.formulario_status='preenchido' AND OLD.formulario_status<>'preenchido' THEN NEW.formulario_preenchido_em:=now(); END IF;
   END IF;
 ELSIF NEW.formulario_status='preenchido' THEN
   NEW.formulario_atualizado_em:=now(); NEW.formulario_preenchido_em:=now();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_atleta_regras BEFORE INSERT OR UPDATE ON public.atletas FOR EACH ROW EXECUTE FUNCTION public.atleta_regras();
CREATE TRIGGER trg_atletas_updated BEFORE UPDATE ON public.atletas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_atletas_privado_updated BEFORE UPDATE ON public.atletas_privado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_atleta_opcoes_updated BEFORE UPDATE ON public.atleta_opcoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.atleta_auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; old_val text; new_val text;
BEGIN
 IF TG_TABLE_NAME='atletas' THEN
   FOREACH k IN ARRAY ARRAY['nome','data_nascimento','status','posicoes','categorias','possui_camiseta','numero_camiseta','formulario_status','deleted_at','foto_nome'] LOOP
     old_val:=CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD)->>k END;
     new_val:=to_jsonb(NEW)->>k;
     IF old_val IS DISTINCT FROM new_val THEN INSERT INTO public.atleta_historico(atleta_id,responsavel_id,campo,anterior,novo) VALUES (NEW.id,auth.uid(),k,old_val,new_val); END IF;
   END LOOP;
 ELSIF TG_OP='UPDATE' THEN
   IF OLD.documento_nome IS DISTINCT FROM NEW.documento_nome THEN
     INSERT INTO public.atleta_historico(atleta_id,responsavel_id,campo,anterior,novo) VALUES (NEW.atleta_id,auth.uid(),'documento',OLD.documento_nome,NEW.documento_nome);
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_atleta_auditoria AFTER INSERT OR UPDATE ON public.atletas FOR EACH ROW EXECUTE FUNCTION public.atleta_auditar();
CREATE TRIGGER trg_atleta_documento_auditoria AFTER UPDATE ON public.atletas_privado FOR EACH ROW EXECUTE FUNCTION public.atleta_auditar();
INSERT INTO public.atletas(profile_id,nome,data_nascimento,posicoes) SELECT p.id,left(coalesce(nullif(p.nome,''),'Atleta'),40),p.data_nascimento,CASE WHEN nullif(p.posicao,'') IS NULL THEN '{}'::text[] ELSE ARRAY[p.posicao] END FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id AND r.role='atleta' ON CONFLICT (profile_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.atleta_criar_da_conta() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.role='atleta' THEN
   INSERT INTO public.atletas(profile_id,nome,data_nascimento,posicoes) SELECT p.id,left(coalesce(nullif(p.nome,''),'Atleta'),40),p.data_nascimento,CASE WHEN nullif(p.posicao,'') IS NULL THEN '{}'::text[] ELSE ARRAY[p.posicao] END FROM public.profiles p WHERE p.id=NEW.user_id ON CONFLICT (profile_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_atleta_conta AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.atleta_criar_da_conta();
CREATE POLICY "fotos leitura" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='atletas-fotos' AND EXISTS (SELECT 1 FROM public.atletas a WHERE a.id::text=split_part(name,'/',1) AND a.deleted_at IS NULL AND (public.is_gestora() OR a.profile_id=auth.uid() OR public.atleta_professor(a.id))));
CREATE POLICY "fotos gravacao gestora" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='atletas-fotos' AND public.is_gestora() AND EXISTS (SELECT 1 FROM public.atletas a WHERE a.id::text=split_part(name,'/',1)));
CREATE POLICY "fotos atualizacao gestora" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='atletas-fotos' AND public.is_gestora()) WITH CHECK (bucket_id='atletas-fotos' AND public.is_gestora());
CREATE POLICY "fotos remocao gestora" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='atletas-fotos' AND public.is_gestora());
CREATE POLICY "documentos leitura gestora" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='atletas-documentos' AND public.is_gestora());
CREATE POLICY "documentos envio gestora" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='atletas-documentos' AND public.is_gestora() AND EXISTS (SELECT 1 FROM public.atletas a WHERE a.id::text=split_part(name,'/',1)));
CREATE POLICY "documentos atualizacao gestora" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='atletas-documentos' AND public.is_gestora()) WITH CHECK (bucket_id='atletas-documentos' AND public.is_gestora());
CREATE POLICY "documentos remocao gestora" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='atletas-documentos' AND public.is_gestora());