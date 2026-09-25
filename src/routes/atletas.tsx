import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Protegido } from "@/lib/guard";
import { hoje } from "@/lib/format";
import {
  BotaoPrimario,
  CampoTexto,
  ListRow,
  ListaPanel,
  Panel,
  Pill,
  SectionHeader,
  Vazio,
} from "@/components/kit";

export const Route = createFileRoute("/atletas")({
  head: () => ({
    meta: [
      { title: "Atletas — VolleyOps" },
      {
        name: "description",
        content: "Cadastro de atletas do time: contato, documento, posição e situação financeira.",
      },
      { property: "og:title", content: "Atletas — VolleyOps" },
      { property: "og:description", content: "Cadastro e histórico dos atletas do time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Protegido papeis={["gestora"]}>
      <Atletas />
    </Protegido>
  ),
});

function Atletas() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", documento: "", posicao: "" });

  const { data } = useQuery({
    queryKey: ["atletas"],
    queryFn: async () => {
      const [{ data: papeis }, { data: perfis }, { data: cobrancas }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("cobrancas").select("atleta_id, status, vencimento"),
      ]);
      return { papeis: papeis ?? [], perfis: perfis ?? [], cobrancas: cobrancas ?? [] };
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!editando) return;
      const { error } = await supabase.from("profiles").update(form).eq("id", editando);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["atletas"] });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const atletas = (data?.perfis ?? []).filter((p) => {
    const papel = data?.papeis.find((r) => r.user_id === p.id)?.role;
    return papel === "atleta" && p.nome.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <>
      <div className="rise">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Cadastro
        </p>
        <h1 className="font-display text-[26px] leading-none mt-1">Atletas</h1>
      </div>

      <CampoTexto
        rotulo="Buscar"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome do atleta"
      />

      {editando ? (
        <Panel className="space-y-3">
          <SectionHeader titulo="Editar atleta" />
          <CampoTexto
            rotulo="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <CampoTexto
            rotulo="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <CampoTexto
            rotulo="Documento"
            value={form.documento}
            onChange={(e) => setForm({ ...form, documento: e.target.value })}
          />
          <CampoTexto
            rotulo="Posição"
            value={form.posicao}
            onChange={(e) => setForm({ ...form, posicao: e.target.value })}
          />
          <div className="flex gap-2">
            <BotaoPrimario onClick={() => salvar.mutate()}>Salvar</BotaoPrimario>
            <button
              onClick={() => setEditando(null)}
              className="w-full rounded-[8px] border border-line py-3 text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </Panel>
      ) : null}

      {atletas.length ? (
        <ListaPanel>
          {atletas.map((a) => {
            const atrasado = (data?.cobrancas ?? []).some(
              (c) => c.atleta_id === a.id && c.status !== "paga" && c.vencimento < hoje(),
            );
            return (
              <ListRow
                key={a.id}
                inicial={(a.nome || "A").charAt(0).toUpperCase()}
                titulo={a.nome || "Sem nome"}
                subtitulo={[a.posicao, a.telefone].filter(Boolean).join(" · ") || "sem dados de contato"}
                direita={<Pill tom={atrasado ? "perigo" : "sucesso"}>{atrasado ? "Atrasado" : "Em dia"}</Pill>}
                onClick={() => {
                  setEditando(a.id);
                  setForm({
                    nome: a.nome ?? "",
                    telefone: a.telefone ?? "",
                    documento: a.documento ?? "",
                    posicao: a.posicao ?? "",
                  });
                }}
              />
            );
          })}
        </ListaPanel>
      ) : (
        <Vazio texto="Nenhum atleta encontrado. Atletas aparecem aqui quando criam a conta no sistema." />
      )}
    </>
  );
}
