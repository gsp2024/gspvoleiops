import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { brl, dataBR, hoje } from "@/lib/format";
import {
  BotaoPrimario,
  CampoSelect,
  CampoTexto,
  ListaPanel,
  ListRow,
  MetricCard,
  Panel,
  Pill,
  Vazio,
} from "@/components/kit";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — VolleyOps" },
      { name: "description", content: "Controle de cobranças, inadimplência, entradas, saídas e saldo do time." },
      { property: "og:title", content: "Financeiro — VolleyOps" },
      { property: "og:description", content: "Cobranças e fluxo de caixa do time de vôlei." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protegido>
      <Financeiro />
    </Protegido>
  ),
});

const cobrancaInicial = { atleta_id: "", descricao: "Mensalidade", valor: "", vencimento: hoje() };
const caixaInicial = { tipo: "saida", categoria: "Material", descricao: "", valor: "", data: hoje() };

function Financeiro() {
  const { papel, user } = useAuth();
  const qc = useQueryClient();
  const [modo, setModo] = useState<"cobranca" | "caixa" | null>(null);
  const [cobranca, setCobranca] = useState(cobrancaInicial);
  const [caixa, setCaixa] = useState(caixaInicial);

  const { data } = useQuery({
    queryKey: ["financeiro", user?.id, papel],
    queryFn: async () => {
      const [cobrancas, caixaResp, perfis, papeis] = await Promise.all([
        supabase.from("cobrancas").select("*").order("vencimento", { ascending: false }),
        papel === "gestora"
          ? supabase.from("movimentacoes_caixa").select("*").order("data", { ascending: false })
          : Promise.resolve({ data: [] }),
        papel === "gestora"
          ? supabase.from("profiles").select("id, nome")
          : Promise.resolve({ data: [] }),
        papel === "gestora"
          ? supabase.from("user_roles").select("user_id, role")
          : Promise.resolve({ data: [] }),
      ]);
      return {
        cobrancas: cobrancas.data ?? [],
        caixa: caixaResp.data ?? [],
        perfis: perfis.data ?? [],
        papeis: papeis.data ?? [],
      };
    },
    enabled: !!user,
  });

  const salvarCobranca = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cobrancas").insert({
        atleta_id: cobranca.atleta_id,
        descricao: cobranca.descricao,
        valor: Number(cobranca.valor),
        vencimento: cobranca.vencimento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cobrança registrada.");
      setCobranca(cobrancaInicial);
      setModo(null);
      void qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
    onError: () => toast.error("Não foi possível registrar a cobrança."),
  });

  const salvarCaixa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("movimentacoes_caixa").insert({
        ...caixa,
        valor: Number(caixa.valor),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada.");
      setCaixa(caixaInicial);
      setModo(null);
      void qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
    onError: () => toast.error("Não foi possível registrar a movimentação."),
  });

  const marcarPaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cobrancas")
        .update({ status: "paga", pago_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento confirmado.");
      void qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });

  const cobrancas = data?.cobrancas ?? [];
  const atrasadas = cobrancas.filter((c) => c.status !== "paga" && c.vencimento < hoje());
  const recebido = cobrancas.filter((c) => c.status === "paga").reduce((s, c) => s + Number(c.valor), 0);
  const pendente = cobrancas.filter((c) => c.status !== "paga").reduce((s, c) => s + Number(c.valor), 0);
  const saldoCaixa = (data?.caixa ?? []).reduce(
    (s, m) => s + (m.tipo === "entrada" ? Number(m.valor) : -Number(m.valor)),
    0,
  );
  const atletas = (data?.papeis ?? []).filter((r) => r.role === "atleta");
  const nomeDe = (id: string) => data?.perfis.find((p) => p.id === id)?.nome || "Atleta";

  return (
    <>
      <div className="rise flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Controle</p>
          <h1 className="font-display text-[26px] leading-none mt-1">Financeiro</h1>
        </div>
        {papel === "gestora" ? (
          <button
            onClick={() => setModo(modo ? null : "cobranca")}
            className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5"
          >
            {modo ? "Fechar" : "Novo registro"}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard rotulo="Recebido" valor={brl(recebido)} tom="sucesso" />
        <MetricCard rotulo="Em aberto" valor={brl(pendente)} tom={pendente ? "perigo" : "neutro"} />
        {papel === "gestora" ? (
          <>
            <MetricCard rotulo="Saldo caixa" valor={brl(saldoCaixa)} />
            <MetricCard rotulo="Atrasadas" valor={atrasadas.length} tom="perigo" />
          </>
        ) : null}
      </div>

      {modo ? (
        <Panel className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setModo("cobranca")}
              className={`rounded-[7px] py-2 text-[11px] font-semibold ${modo === "cobranca" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}
            >
              Cobrança
            </button>
            <button
              onClick={() => setModo("caixa")}
              className={`rounded-[7px] py-2 text-[11px] font-semibold ${modo === "caixa" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}
            >
              Entrada / saída
            </button>
          </div>
          {modo === "cobranca" ? (
            <>
              <CampoSelect rotulo="Atleta" value={cobranca.atleta_id} onChange={(e) => setCobranca({ ...cobranca, atleta_id: e.target.value })}>
                <option value="">Escolher atleta…</option>
                {atletas.map((a) => <option key={a.user_id} value={a.user_id}>{nomeDe(a.user_id)}</option>)}
              </CampoSelect>
              <CampoTexto rotulo="Descrição" value={cobranca.descricao} onChange={(e) => setCobranca({ ...cobranca, descricao: e.target.value })} />
              <div className="grid grid-cols-2 gap-2.5">
                <CampoTexto rotulo="Valor (R$)" type="number" value={cobranca.valor} onChange={(e) => setCobranca({ ...cobranca, valor: e.target.value })} />
                <CampoTexto rotulo="Vencimento" type="date" value={cobranca.vencimento} onChange={(e) => setCobranca({ ...cobranca, vencimento: e.target.value })} />
              </div>
              <BotaoPrimario onClick={() => salvarCobranca.mutate()} disabled={!cobranca.atleta_id || !cobranca.valor}>Gerar cobrança</BotaoPrimario>
            </>
          ) : (
            <>
              <CampoSelect rotulo="Tipo" value={caixa.tipo} onChange={(e) => setCaixa({ ...caixa, tipo: e.target.value })}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </CampoSelect>
              <CampoTexto rotulo="Descrição" value={caixa.descricao} onChange={(e) => setCaixa({ ...caixa, descricao: e.target.value })} />
              <div className="grid grid-cols-2 gap-2.5">
                <CampoTexto rotulo="Valor (R$)" type="number" value={caixa.valor} onChange={(e) => setCaixa({ ...caixa, valor: e.target.value })} />
                <CampoTexto rotulo="Data" type="date" value={caixa.data} onChange={(e) => setCaixa({ ...caixa, data: e.target.value })} />
              </div>
              <BotaoPrimario onClick={() => salvarCaixa.mutate()} disabled={!caixa.descricao || !caixa.valor}>Registrar</BotaoPrimario>
            </>
          )}
        </Panel>
      ) : null}

      <section>
        <h2 className="font-display text-[15px] tracking-wide mb-2">Cobranças</h2>
        {cobrancas.length ? (
          <ListaPanel>
            {cobrancas.map((c) => {
              const atrasada = c.status !== "paga" && c.vencimento < hoje();
              return (
                <ListRow
                  key={c.id}
                  titulo={papel === "gestora" ? `${nomeDe(c.atleta_id)} · ${c.descricao}` : c.descricao}
                  subtitulo={`${brl(c.valor)} · vence ${dataBR(c.vencimento)}`}
                  direita={papel === "gestora" && c.status !== "paga" ? (
                    <button onClick={() => marcarPaga.mutate(c.id)} className="shrink-0 font-mono text-[9px] uppercase px-2 py-1 rounded-full bg-success/15 text-success">Confirmar</button>
                  ) : (
                    <Pill tom={c.status === "paga" ? "sucesso" : atrasada ? "perigo" : "alerta"}>{c.status === "paga" ? "Paga" : atrasada ? "Atrasada" : "Pendente"}</Pill>
                  )}
                />
              );
            })}
          </ListaPanel>
        ) : <Vazio texto="Nenhuma cobrança registrada." />}
      </section>
    </>
  );
}
