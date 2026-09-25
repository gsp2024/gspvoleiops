export const brl = (valor: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));

export const dataBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
};

export const hoje = () => new Date().toISOString().slice(0, 10);

export type StatusCobranca = "pendente" | "paga" | "atrasada";

export const statusCobranca = (status: string, vencimento: string): StatusCobranca => {
  if (status === "paga") return "paga";
  return vencimento < hoje() ? "atrasada" : "pendente";
};
