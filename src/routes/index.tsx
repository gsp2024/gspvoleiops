import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { brl, dataBR, hoje } from "@/lib/format";
import { ListRow, ListaPanel, MetricCard, Pill, SectionHeader, Vazio } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — VolleyOps" },
      {
        name: "description",
        content:
          "Visão geral do time: fluxo de caixa, inadimplência, atletas, turmas, torneios e estoque.",
      },
      { property: "og:title", content: "Painel — VolleyOps" },
      {
        property: "og:description",
        content: "Visão geral do time de vôlei: finanças, atletas, turmas e torneios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protegido>
      <Painel />
    </Protegido>
  ),
});

function Saudacao({ papel }: { papel: string }) {
  const { perfil } = useAuth();
  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = (perfil?.nome || "").split(" ")[0];
  return (
    <div className="flex items-end justify-between rise">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Painel {papel === "gestora" ? "da gestora" : papel === "professor" ? "do professor" : "do atleta"}
        </p>
        <h1 className="font-display text-[26px] leading-none mt-1">
          {cumprimento}
          {primeiro ? `, ${primeiro}` : ""}
        </h1>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{dataBR(hoje())}</span>
    </div>
  );
}

function Painel() {
  const { papel } = useAuth();
  if (papel === "gestora") return <PainelGestora />;
  if (papel === "professor") return <PainelProfessor />;
  return <PainelAtleta />;
}

function PainelGestora() {
  const { data } = useQuery({
    queryKey: ["painel-gestora"],
    queryFn: async () => {
      const inicioMes = `${new Date().toISOString().slice(0, 7)}-01`;
      const [cobrancas, caixa, atletas, turmas, torneios, materiais, pedidos, perfis] =
        await Promise.all([
          supabase.from("cobrancas").select("*").order("vencimento"),
          supabase.from("movimentacoes_caixa").select("*").gte("data", inicioMes),
          supabase.from("user_roles").select("user_id").eq("role", "atleta"),
          supabase.from("turmas").select("*, matriculas(count)").order("nome"),
          supabase.from("torneios").select("*").order("data"),
          supabase.from("materiais").select("*").order("nome"),
          supabase.from("pedidos_uniforme").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, nome, posicao"),
        ]);
      return {
        cobrancas: cobrancas.data ?? [],
        caixa: caixa.data ?? [],
        atletas: atletas.data ?? [],
        turmas: turmas.data ?? [],
        torneios: torneios.data ?? [],
        materiais: materiais.data ?? [],
        pedidos: pedidos.data ?? [],
        perfis: perfis.data ?? [],
      };
    },
  });

  const cobrancas = data?.cobrancas ?? [];
  const atrasadas = cobrancas.filter((c) => c.status !== "paga" && c.vencimento < hoje());
  const entradasMes =
    (data?.caixa ?? []).filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0) +
    cobrancas
      .filter((c) => c.status === "paga" && (c.pago_em ?? "").slice(0, 7) === hoje().slice(0, 7))
      .reduce((s, c) => s + Number(c.valor), 0);
  const saidasMes = (data?.caixa ?? [])
    .filter((m) => m.tipo === "saida")
    .reduce((s, m) => s + Number(m.valor), 0);
  const saldo = entradasMes - saidasMes;
  const inadimplencia = atrasadas.reduce((s, c) => s + Number(c.valor), 0);
  const vagas = (data?.turmas ?? []).reduce((s, t) => s + Number(t.capacidade ?? 0), 0);
  const matriculados = (data?.turmas ?? []).reduce(
    (s, t) => s + Number((t.matriculas as unknown as { count: number }[])?.[0]?.count ?? 0),
    0,
  );
  const proximoTorneio = (data?.torneios ?? []).find((t) => (t.data ?? "") >= hoje());
  const nome = (id: string) => data?.perfis.find((p) => p.id === id)?.nome || "Atleta";
  const materialBaixo = (data?.materiais ?? []).filter((m) => m.quantidade <= m.minimo);

  return (
    <>
      <Saudacao papel="gestora" />

      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          rotulo="Fluxo de caixa"
          valor={brl(saldo)}
          nota={`Entradas ${brl(entradasMes)}`}
          tom={saldo >= 0 ? "neutro" : "perigo"}
          atraso={40}
        />
        <MetricCard
          rotulo="Inadimplência"
          valor={brl(inadimplencia)}
          nota={`${atrasadas.length} cobranças em atraso`}
          tom="perigo"
          atraso={90}
        />
        <MetricCard
          rotulo="Ocupação"
          valor={
            <>
              {vagas ? Math.round((matriculados / vagas) * 100) : 0}
              <span className="text-[15px] text-muted-foreground">%</span>
            </>
          }
          nota={`${matriculados} / ${vagas} vagas`}
          atraso={140}
        />
        <MetricCard
          rotulo="Torneios"
          valor={data?.torneios.length ?? 0}
          nota={proximoTorneio ? `próx. ${dataBR(proximoTorneio.data)}` : "nenhum agendado"}
          atraso={190}
        />
      </div>

      {atrasadas.length > 0 ? (
        <div
          className="rise flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-[10px] p-3"
          style={{ animationDelay: "240ms" }}
        >
          <div className="size-8 shrink-0 grid place-items-center bg-danger/20 text-danger rounded-[7px] font-display text-sm">
            !
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">
              {atrasadas.length} {atrasadas.length === 1 ? "cobrança" : "cobranças"} em atraso
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {atrasadas[0]
                ? `${nome(atrasadas[0].atleta_id)} · vence ${dataBR(atrasadas[0].vencimento)}`
                : ""}
            </p>
          </div>
          <Link
            to="/financeiro"
            className="shrink-0 text-[11px] font-semibold text-danger border border-danger/40 rounded-[7px] px-2.5 py-1.5"
          >
            Ver
          </Link>
        </div>
      ) : null}

      <section className="rise" style={{ animationDelay: "300ms" }}>
        <SectionHeader titulo="Atletas" acao="Ver todos" para="/atletas" />
        {data?.atletas.length ? (
          <ListaPanel>
            {data.atletas.slice(0, 3).map((a) => {
              const emAtraso = atrasadas.some((c) => c.atleta_id === a.user_id);
              const perfil = data.perfis.find((p) => p.id === a.user_id);
              return (
                <ListRow
                  key={a.user_id}
                  inicial={(perfil?.nome || "A").charAt(0).toUpperCase()}
                  titulo={perfil?.nome || "Atleta sem nome"}
                  subtitulo={perfil?.posicao || "posição não informada"}
                  direita={
                    <Pill tom={emAtraso ? "perigo" : "sucesso"}>{emAtraso ? "Atrasado" : "Em dia"}</Pill>
                  }
                />
              );
            })}
          </ListaPanel>
        ) : (
          <Vazio texto="Nenhum atleta cadastrado ainda. Cadastre o primeiro em Atletas." />
        )}
      </section>

      <section className="rise" style={{ animationDelay: "360ms" }}>
        <SectionHeader titulo="Turmas" acao="Detalhe" para="/turmas" />
        {data?.turmas.length ? (
          <div className="space-y-2.5">
            {data.turmas.slice(0, 2).map((t) => {
              const inscritos = Number((t.matriculas as unknown as { count: number }[])?.[0]?.count ?? 0);
              const pct = t.capacidade ? Math.min(100, (inscritos / t.capacidade) * 100) : 0;
              return (
                <div key={t.id} className="panel p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold">
                      {t.nome} {t.horario ? `· ${t.horario}` : ""}
                    </p>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {inscritos}/{t.capacidade}
                    </span>
                  </div>
                  <div className="h-1.5 mt-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                    {t.local || "local a definir"} · {brl(t.valor_mensalidade)}/mês
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <Vazio texto="Crie a primeira turma para organizar os treinos." />
        )}
      </section>

      <section className="rise" style={{ animationDelay: "420ms" }}>
        <SectionHeader titulo="Torneios" acao="Agenda" para="/torneios" />
        {proximoTorneio ? (
          <div className="panel p-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">{proximoTorneio.nome}</p>
              <span className="font-mono text-[10px] text-primary">
                {dataBR(proximoTorneio.data)}
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              {proximoTorneio.local || "local a definir"} · inscrição{" "}
              {brl(proximoTorneio.taxa_inscricao)}
            </p>
          </div>
        ) : (
          <Vazio texto="Nenhum torneio agendado." />
        )}
      </section>

      <section className="rise" style={{ animationDelay: "480ms" }}>
        <SectionHeader titulo="Materiais & Uniformes" acao="Pedidos" para="/uniformes" />
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/materiais" className="panel p-3 block">
            <p className="label-mono">Estoque</p>
            <p className="text-[13px] font-semibold mt-1">
              {data?.materiais.length ?? 0} {data?.materiais.length === 1 ? "item" : "itens"}
            </p>
            <p
              className={`font-mono text-[10px] mt-0.5 ${materialBaixo.length ? "text-danger" : "text-success"}`}
            >
              {materialBaixo.length ? `${materialBaixo.length} em nível baixo` : "estoque ok"}
            </p>
          </Link>
          <Link to="/uniformes" className="panel p-3 block">
            <p className="label-mono">Pedidos</p>
            <p className="text-[13px] font-semibold mt-1">
              {data?.pedidos.filter((p) => p.status !== "entregue").length ?? 0} em aberto
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {data?.pedidos.length ?? 0} no total
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}

function PainelProfessor() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["painel-professor", user?.id],
    queryFn: async () => {
      const { data: turmas } = await supabase
        .from("turmas")
        .select("*, matriculas(atleta_id, profiles(nome, posicao))")
        .eq("professor_id", user!.id);
      return turmas ?? [];
    },
    enabled: !!user,
  });

  const totalAlunos = (data ?? []).reduce((s, t) => s + (t.matriculas?.length ?? 0), 0);

  return (
    <>
      <Saudacao papel="professor" />
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard rotulo="Minhas turmas" valor={data?.length ?? 0} atraso={40} />
        <MetricCard rotulo="Alunos" valor={totalAlunos} atraso={90} />
      </div>

      {data?.length ? (
        data.map((t) => (
          <section key={t.id} className="rise">
            <SectionHeader titulo={t.nome} />
            <div className="panel p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                {t.horario || "horário a definir"} · {t.local || "local a definir"}
              </p>
            </div>
            <div className="mt-2">
              <ListaPanel>
                {(t.matriculas ?? []).map((m) => (
                  <ListRow
                    key={m.atleta_id}
                    inicial={(m.profiles?.nome || "A").charAt(0).toUpperCase()}
                    titulo={m.profiles?.nome || "Atleta"}
                    subtitulo={m.profiles?.posicao || "posição não informada"}
                  />
                ))}
                {(t.matriculas ?? []).length === 0 ? (
                  <div className="p-4 text-center text-[13px] text-muted-foreground">
                    Ainda sem alunos matriculados.
                  </div>
                ) : null}
              </ListaPanel>
            </div>
          </section>
        ))
      ) : (
        <Vazio texto="Você ainda não é responsável por nenhuma turma. Fale com a gestora." />
      )}
    </>
  );
}

function PainelAtleta() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["painel-atleta", user?.id],
    queryFn: async () => {
      const [cobrancas, turmas, inscricoes, pedidos] = await Promise.all([
        supabase.from("cobrancas").select("*").eq("atleta_id", user!.id).order("vencimento"),
        supabase.from("matriculas").select("turmas(*)").eq("atleta_id", user!.id),
        supabase.from("inscricoes_torneio").select("torneios(*)").eq("atleta_id", user!.id),
        supabase.from("pedidos_uniforme").select("*").eq("atleta_id", user!.id),
      ]);
      return {
        cobrancas: cobrancas.data ?? [],
        turmas: turmas.data ?? [],
        inscricoes: inscricoes.data ?? [],
        pedidos: pedidos.data ?? [],
      };
    },
    enabled: !!user,
  });

  const abertas = (data?.cobrancas ?? []).filter((c) => c.status !== "paga");
  const emAberto = abertas.reduce((s, c) => s + Number(c.valor), 0);
  const pago = (data?.cobrancas ?? [])
    .filter((c) => c.status === "paga")
    .reduce((s, c) => s + Number(c.valor), 0);

  return (
    <>
      <Saudacao papel="atleta" />
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          rotulo="Em aberto"
          valor={brl(emAberto)}
          nota={`${abertas.length} cobranças`}
          tom={emAberto > 0 ? "perigo" : "sucesso"}
          atraso={40}
        />
        <MetricCard rotulo="Já pago" valor={brl(pago)} nota="histórico total" atraso={90} />
      </div>

      <section className="rise" style={{ animationDelay: "160ms" }}>
        <SectionHeader titulo="Minhas turmas" />
        {data?.turmas.length ? (
          <ListaPanel>
            {data.turmas.map((m, i) => (
              <ListRow
                key={i}
                titulo={m.turmas?.nome ?? "Turma"}
                subtitulo={`${m.turmas?.horario ?? ""} ${m.turmas?.local ? `· ${m.turmas.local}` : ""}`}
                direita={<Pill>{brl(m.turmas?.valor_mensalidade)}</Pill>}
              />
            ))}
          </ListaPanel>
        ) : (
          <Vazio texto="Você ainda não está matriculado em uma turma." />
        )}
      </section>

      <section className="rise" style={{ animationDelay: "220ms" }}>
        <SectionHeader titulo="Meus torneios" />
        {data?.inscricoes.length ? (
          <ListaPanel>
            {data.inscricoes.map((i, idx) => (
              <ListRow
                key={idx}
                titulo={i.torneios?.nome ?? "Torneio"}
                subtitulo={`${dataBR(i.torneios?.data)} · ${i.torneios?.local ?? "local a definir"}`}
              />
            ))}
          </ListaPanel>
        ) : (
          <Vazio texto="Nenhuma inscrição em torneios por enquanto." />
        )}
      </section>

      <section className="rise" style={{ animationDelay: "280ms" }}>
        <SectionHeader titulo="Extrato financeiro" acao="Uniformes" para="/uniformes" />
        {data?.cobrancas.length ? (
          <ListaPanel>
            {data.cobrancas.map((c) => {
              const atrasada = c.status !== "paga" && c.vencimento < hoje();
              return (
                <ListRow
                  key={c.id}
                  titulo={c.descricao}
                  subtitulo={`vence ${dataBR(c.vencimento)} · ${brl(c.valor)}`}
                  direita={
                    <Pill tom={c.status === "paga" ? "sucesso" : atrasada ? "perigo" : "alerta"}>
                      {c.status === "paga" ? "Paga" : atrasada ? "Atrasada" : "Pendente"}
                    </Pill>
                  }
                />
              );
            })}
          </ListaPanel>
        ) : (
          <Vazio texto="Nenhuma cobrança registrada." />
        )}
      </section>
    </>
  );
}
