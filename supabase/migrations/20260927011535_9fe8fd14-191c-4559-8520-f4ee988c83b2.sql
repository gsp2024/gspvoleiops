CREATE TABLE public.importacoes_atletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome text NOT NULL CHECK (char_length(arquivo_nome) <= 200),
  modo text NOT NULL CHECK (modo IN ('novas','atualizar')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  totais jsonb NOT NULL DEFAULT '{}'::jsonb,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.importacoes_atletas TO authenticated;
GRANT ALL ON public.importacoes_atletas TO service_role;
ALTER TABLE public.importacoes_atletas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestora consulta importacoes" ON public.importacoes_atletas FOR SELECT TO authenticated USING (public.is_gestora());
CREATE POLICY "gestora registra importacoes" ON public.importacoes_atletas FOR INSERT TO authenticated WITH CHECK (public.is_gestora() AND criado_por = auth.uid());