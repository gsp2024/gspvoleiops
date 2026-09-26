CREATE OR REPLACE FUNCTION public.salvar_cadastro_atleta(_id uuid, _dados jsonb, _rg text, _cpf text, _turmas uuid[], _torneios uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid; v_pos text[]; v_cat text[];
BEGIN
 IF NOT public.is_gestora() THEN RAISE EXCEPTION 'Acesso nao permitido'; END IF;
 v_pos:=ARRAY(SELECT jsonb_array_elements_text(_dados->'posicoes'));
 v_cat:=ARRAY(SELECT jsonb_array_elements_text(_dados->'categorias'));
 IF EXISTS (SELECT 1 FROM unnest(v_pos) x WHERE NOT EXISTS (SELECT 1 FROM public.atleta_opcoes o WHERE o.tipo='posicao' AND o.nome=x)) OR EXISTS (SELECT 1 FROM unnest(v_cat) x WHERE NOT EXISTS (SELECT 1 FROM public.atleta_opcoes o WHERE o.tipo='categoria' AND o.nome=x)) THEN RAISE EXCEPTION 'Opcao esportiva indisponivel'; END IF;
 IF _id IS NULL THEN
   INSERT INTO public.atletas(nome,data_nascimento,status,posicoes,categorias,possui_camiseta,numero_camiseta,formulario_status)
   VALUES (_dados->>'nome',(_dados->>'data_nascimento')::date,_dados->>'status',v_pos,v_cat,(_dados->>'possui_camiseta')::boolean,(_dados->>'numero_camiseta')::int,_dados->>'formulario_status') RETURNING id INTO v_id;
 ELSE
   UPDATE public.atletas SET nome=_dados->>'nome',data_nascimento=(_dados->>'data_nascimento')::date,status=_dados->>'status',posicoes=v_pos,categorias=v_cat,possui_camiseta=(_dados->>'possui_camiseta')::boolean,numero_camiseta=(_dados->>'numero_camiseta')::int,formulario_status=_dados->>'formulario_status' WHERE id=_id AND deleted_at IS NULL RETURNING id INTO v_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'Atleta indisponivel'; END IF;
 END IF;
 INSERT INTO public.atletas_privado(atleta_id,rg,cpf) VALUES(v_id,_rg,_cpf) ON CONFLICT (atleta_id) DO UPDATE SET rg=EXCLUDED.rg,cpf=EXCLUDED.cpf;
 DELETE FROM public.atleta_turmas WHERE atleta_id=v_id AND turma_id <> ALL(coalesce(_turmas,'{}'::uuid[]));
 INSERT INTO public.atleta_turmas(atleta_id,turma_id) SELECT v_id,t FROM unnest(coalesce(_turmas,'{}'::uuid[])) t ON CONFLICT DO NOTHING;
 DELETE FROM public.atleta_torneios WHERE atleta_id=v_id AND torneio_id <> ALL(coalesce(_torneios,'{}'::uuid[]));
 INSERT INTO public.atleta_torneios(atleta_id,torneio_id) SELECT v_id,t FROM unnest(coalesce(_torneios,'{}'::uuid[])) t ON CONFLICT DO NOTHING;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.salvar_cadastro_atleta(uuid,jsonb,text,text,uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_cadastro_atleta(uuid,jsonb,text,text,uuid[],uuid[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.atleta_regras() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.data_nascimento > current_date THEN RAISE EXCEPTION 'Data de nascimento futura'; END IF;
 IF NEW.profile_id IS NULL AND (NEW.data_nascimento IS NULL OR cardinality(NEW.posicoes)=0 OR cardinality(NEW.categorias)=0) THEN RAISE EXCEPTION 'Dados obrigatorios ausentes'; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.numero IS DISTINCT FROM OLD.numero THEN RAISE EXCEPTION 'Numero da atleta nao pode mudar'; END IF;
   IF OLD.deleted_at IS NOT NULL AND (NEW.deleted_at IS NOT NULL OR OLD.deleted_at <= now()-interval '30 days') THEN RAISE EXCEPTION 'Atleta na lixeira'; END IF;
   NEW.formulario_preenchido_em:=OLD.formulario_preenchido_em;
   NEW.formulario_atualizado_em:=OLD.formulario_atualizado_em;
   IF NEW.formulario_status IS DISTINCT FROM OLD.formulario_status THEN
     NEW.formulario_atualizado_em:=now();
     IF NEW.formulario_status='preenchido' AND OLD.formulario_status<>'preenchido' THEN NEW.formulario_preenchido_em:=now(); END IF;
   END IF;
 ELSE
   NEW.formulario_atualizado_em:=CASE WHEN NEW.formulario_status='preenchido' THEN now() ELSE NULL END;
   NEW.formulario_preenchido_em:=NEW.formulario_atualizado_em;
 END IF;
 RETURN NEW;
END $$;