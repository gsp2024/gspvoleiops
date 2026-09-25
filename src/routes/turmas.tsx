import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { brl } from "@/lib/format";
import {
  BotaoPrimario,
  CampoSelect,
  CampoTexto,
  ListRow,
  ListaPanel,
  Panel,
  Pill,
  SectionHeader,
  Vazio,
} from "@/components/kit";

export const Route = createFileRoute("/turmas")({
  head: () => ({
    meta: [
      { title: "Turmas — VolleyOps" },
      {
        name: "description",
        content: "Turmas do time: horário, local, professor responsável, mensalidade e alunos.",
      },
      { property: "og:title", content: "Turmas — VolleyOps" },
      { property: "og:description", content: "Organize horários, professores e alunos das turmas." },
    ],
  }),
  component: () => (
    <Protegido>
      <Turmas />
    </Protegido>
  ),
});

const formVazio = {
  nome: "",
  horario: "",
  local: "",
  professor_id: "",
  valor_mensalidade: "0",
  capacidade: "14",
};

function Turmas() {
  const { papel } = useAuth();
  const qc = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [aberta, setAberta] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["turmas"],
    queryFn: async () => {
      const [{ data: turmas }, { data: papeis }, { data: perfis }] = await Promise.all([
        supabase
          .from("turmas")
          .select("*, matriculas(atleta_id, profiles(nome, posicao))")
          .order("nome"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, nome"),
      ]);
      return { turmas: turmas ?? [], papeis: papeis ?? [], perfis: perfis ?? [] };
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("turmas").insert({
        nome: form.nome,
        horario: form.horario || null,
        local: form.local || null,
        professor_id: form.professor_id || null,
        valor_mensalidade: Number(form.valor_mensalidade || 0),
        capacidade: Number(form.capacidade || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Turma criada.");
      setForm(formVazio);
      setCriando(false);
      void qc.invalidateQueries({ queryKey: ["turmas"] });
    },
    onError: () => toast.error("Não foi possível criar a turma."),
  });

  const matricular = useMutation({
    mutationFn: async ({ turma_id, atleta_id }: { turma_id: string; atleta_id: string }) => {
      const { error } = await supabase.from("matriculas").insert({ turma_id, atleta_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atleta matriculado.");
      void qc.invalidateQueries({ queryKey: ["turmas"] });
    },
    onError: () => toast.error("Este atleta já está na turma."),
  });

  const nomeDe = (id: string | null) =>
    data?.perfis.find((p) => p.id === id)?.nome || "sem professor";
  const professores = (data?.papeis ?? []).filter((r) => r.role === "professor");
  const atletas = (data?.papeis ?? []).filter((r) => r.role === "atleta");

  return (
    <>
      <div className="rise flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Treinos
          </p>
          <h1 className="font-display text-[26px] leading-none mt-1">Turmas</h1>
        </div>
        {papel === "gestora" ? (
          <button
            onClick={() => setCriando(!criando)}
            className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5"
          >
            {criando ? "Fechar" : "Nova turma"}
          </button>
        ) : null}
      </div>

      {criando ? (
        <Panel className="space-y-3">
          <CampoTexto
            rotulo="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Sub-14"
          />
          <CampoTexto
            rotulo="Horário"
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
            placeholder="Ter/Qui 19h"
          />
          <CampoTexto
            rotulo="Local"
            value={form.local}
            onChange={(e) => setForm({ ...form, local: e.target.value })}
            placeholder="Ginásio Municipal"
          />
          <CampoSelect
            rotulo="Professor responsável"
            value={form.professor_id}
            onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
          >
            <option value="">Sem professor</option>
            {professores.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {nomeDe(p.user_id)}
              </option>
            ))}
          </CampoSelect>
          <div className="grid grid-cols-2 gap-2.5">
            <CampoTexto
              rotulo="Mensalidade (R$)"
              type="number"
              value={form.valor_mensalidade}
              onChange={(e) => setForm({ ...form, valor_mensalidade: e.target.value })}
            />
            <CampoTexto
              rotulo="Capacidade"
              type="number"
              value={form.capacidade}
              onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
            />
          </div>
          <BotaoPrimario onClick={() => criar.mutate()} disabled={!form.nome}>
            Criar turma
          </BotaoPrimario>
        </Panel>
      ) : null}

      {data?.turmas.length ? (
        data.turmas.map((t) => {
          const inscritos = t.matriculas ?? [];
          const pct = t.capacidade ? Math.min(100, (inscritos.length / t.capacidade) * 100) : 0;
          return (
            <section key={t.id}>
              <div className="panel p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">
                    {t.nome} {t.horario ? `· ${t.horario}` : ""}
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {inscritos.length}/{t.capacidade}
                  </span>
                </div>
                <div className="h-1.5 mt-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                  {nomeDe(t.professor_id)} · {t.local || "local a definir"} ·{" "}
                  {brl(t.valor_mensalidade)}/mês
                </p>
                <button
                  onClick={() => setAberta(aberta === t.id ? null : t.id)}
                  className="mt-2 font-mono text-[10px] text-primary uppercase tracking-wide"
                >
                  {aberta === t.id ? "Ocultar alunos" : "Ver alunos"} →
                </button>
              </div>

              {aberta === t.id ? (
                <div className="mt-2 space-y-2">
                  <ListaPanel>
                    {inscritos.map((m) => (
                      <ListRow
                        key={m.atleta_id}
                        inicial={(m.profiles?.nome || "A").charAt(0).toUpperCase()}
                        titulo={m.profiles?.nome || "Atleta"}
                        subtitulo={m.profiles?.posicao || "posição não informada"}
                      />
                    ))}
                    {inscritos.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-muted-foreground">
                        Sem alunos matriculados.
                      </div>
                    ) : null}
                  </ListaPanel>

                  {papel === "gestora" ? (
                    <CampoSelect
                      rotulo="Matricular atleta"
                      value=""
                      onChange={(e) =>
                        e.target.value &&
                        matricular.mutate({ turma_id: t.id, atleta_id: e.target.value })
                      }
                    >
                      <option value="">Escolher atleta…</option>
                      {atletas
                        .filter((a) => !inscritos.some((m) => m.atleta_id === a.user_id))
                        .map((a) => (
                          <option key={a.user_id} value={a.user_id}>
                            {nomeDe(a.user_id)}
                          </option>
                        ))}
                    </CampoSelect>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })
      ) : (
        <Vazio texto="Nenhuma turma cadastrada ainda." />
      )}

      {papel === "atleta" ? (
        <Pill>Você vê apenas as turmas em que está matriculado</Pill>
      ) : null}
    </>
  );
}
