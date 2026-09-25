import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { brl, dataBR } from "@/lib/format";
import {
  BotaoPrimario,
  CampoSelect,
  CampoTexto,
  ListRow,
  ListaPanel,
  Panel,
  Vazio,
} from "@/components/kit";

export const Route = createFileRoute("/torneios")({
  head: () => ({
    meta: [
      { title: "Torneios — VolleyOps" },
      {
        name: "description",
        content: "Agenda de torneios do time: data, local, taxa de inscrição, inscritos e resultados.",
      },
      { property: "og:title", content: "Torneios — VolleyOps" },
      { property: "og:description", content: "Agenda, inscrições e resultados dos torneios." },
    ],
  }),
  component: () => (
    <Protegido>
      <Torneios />
    </Protegido>
  ),
});

const formVazio = { nome: "", data: "", local: "", taxa_inscricao: "0", resultado: "" };

function Torneios() {
  const { papel } = useAuth();
  const qc = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["torneios"],
    queryFn: async () => {
      const [{ data: torneios }, { data: papeis }, { data: perfis }] = await Promise.all([
        supabase
          .from("torneios")
          .select("*, inscricoes_torneio(atleta_id, profiles(nome))")
          .order("data"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, nome"),
      ]);
      return { torneios: torneios ?? [], papeis: papeis ?? [], perfis: perfis ?? [] };
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("torneios").insert({
        nome: form.nome,
        data: form.data || null,
        local: form.local || null,
        taxa_inscricao: Number(form.taxa_inscricao || 0),
        resultado: form.resultado || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Torneio criado.");
      setForm(formVazio);
      setCriando(false);
      void qc.invalidateQueries({ queryKey: ["torneios"] });
    },
    onError: () => toast.error("Não foi possível criar o torneio."),
  });

  const inscrever = useMutation({
    mutationFn: async ({
      torneio_id,
      atleta_id,
      taxa,
      nomeTorneio,
    }: {
      torneio_id: string;
      atleta_id: string;
      taxa: number;
      nomeTorneio: string;
    }) => {
      const { error } = await supabase.from("inscricoes_torneio").insert({ torneio_id, atleta_id });
      if (error) throw error;
      if (taxa > 0) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 7);
        await supabase.from("cobrancas").insert({
          atleta_id,
          torneio_id,
          descricao: `Inscrição — ${nomeTorneio}`,
          valor: taxa,
          vencimento: vencimento.toISOString().slice(0, 10),
        });
      }
    },
    onSuccess: () => {
      toast.success("Atleta inscrito e cobrança gerada.");
      void qc.invalidateQueries({ queryKey: ["torneios"] });
    },
    onError: () => toast.error("Este atleta já está inscrito."),
  });

  const nomeDe = (id: string) => data?.perfis.find((p) => p.id === id)?.nome || "Atleta";
  const atletas = (data?.papeis ?? []).filter((r) => r.role === "atleta");

  return (
    <>
      <div className="rise flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Competições
          </p>
          <h1 className="font-display text-[26px] leading-none mt-1">Torneios</h1>
        </div>
        {papel === "gestora" ? (
          <button
            onClick={() => setCriando(!criando)}
            className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5"
          >
            {criando ? "Fechar" : "Novo torneio"}
          </button>
        ) : null}
      </div>

      {criando ? (
        <Panel className="space-y-3">
          <CampoTexto
            rotulo="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Copa Regional Sub-14"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <CampoTexto
              rotulo="Data"
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
            <CampoTexto
              rotulo="Taxa (R$)"
              type="number"
              value={form.taxa_inscricao}
              onChange={(e) => setForm({ ...form, taxa_inscricao: e.target.value })}
            />
          </div>
          <CampoTexto
            rotulo="Local"
            value={form.local}
            onChange={(e) => setForm({ ...form, local: e.target.value })}
            placeholder="Ginásio Municipal"
          />
          <BotaoPrimario onClick={() => criar.mutate()} disabled={!form.nome}>
            Criar torneio
          </BotaoPrimario>
        </Panel>
      ) : null}

      {data?.torneios.length ? (
        data.torneios.map((t) => {
          const inscritos = t.inscricoes_torneio ?? [];
          return (
            <section key={t.id}>
              <div className="panel p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">{t.nome}</p>
                  <span className="font-mono text-[10px] text-primary">{dataBR(t.data)}</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  {t.local || "local a definir"} · inscrição {brl(t.taxa_inscricao)} ·{" "}
                  {inscritos.length} inscritos
                </p>
                {t.resultado ? (
                  <p className="font-mono text-[10px] text-success mt-1">Resultado: {t.resultado}</p>
                ) : null}
                <button
                  onClick={() => setAberto(aberto === t.id ? null : t.id)}
                  className="mt-2 font-mono text-[10px] text-primary uppercase tracking-wide"
                >
                  {aberto === t.id ? "Ocultar inscritos" : "Ver inscritos"} →
                </button>
              </div>

              {aberto === t.id ? (
                <div className="mt-2 space-y-2">
                  <ListaPanel>
                    {inscritos.map((i) => (
                      <ListRow
                        key={i.atleta_id}
                        inicial={(i.profiles?.nome || "A").charAt(0).toUpperCase()}
                        titulo={i.profiles?.nome || "Atleta"}
                      />
                    ))}
                    {inscritos.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-muted-foreground">
                        Ninguém inscrito ainda.
                      </div>
                    ) : null}
                  </ListaPanel>
                  {papel === "gestora" ? (
                    <CampoSelect
                      rotulo="Inscrever atleta"
                      value=""
                      onChange={(e) =>
                        e.target.value &&
                        inscrever.mutate({
                          torneio_id: t.id,
                          atleta_id: e.target.value,
                          taxa: Number(t.taxa_inscricao),
                          nomeTorneio: t.nome,
                        })
                      }
                    >
                      <option value="">Escolher atleta…</option>
                      {atletas
                        .filter((a) => !inscritos.some((i) => i.atleta_id === a.user_id))
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
        <Vazio texto="Nenhum torneio cadastrado ainda." />
      )}
    </>
  );
}
