import type { Tables } from "@/integrations/supabase/types";
import { idade } from "./atleta-validation";

type Atleta = Tables<"atletas"> & { atleta_turmas?: { turma_id: string }[]; atleta_torneios?: { torneio_id: string }[] };
export async function exportarAtletas(atletas: Atleta[], formato: "xlsx" | "pdf", turmas: { id: string; nome: string }[], torneios: { id: string; nome: string }[]) {
  const rows = atletas.map(a => ({
    ID: a.numero, Nome: a.nome, Idade: idade(a.data_nascimento) ?? "", Status: a.status,
    Posições: a.posicoes.join(", "), Categorias: a.categorias.join(", "),
    Turmas: (a.atleta_turmas ?? []).map(x => turmas.find(t => t.id === x.turma_id)?.nome).filter(Boolean).join(", "),
    Torneios: (a.atleta_torneios ?? []).map(x => torneios.find(t => t.id === x.torneio_id)?.nome).filter(Boolean).join(", "),
    Camiseta: a.possui_camiseta ? `Sim${a.numero_camiseta !== null ? ` (${a.numero_camiseta})` : ""}` : "Não",
    "Formulário médico": a.formulario_status === "preenchido" ? "Preenchido" : a.formulario_status === "pendente" ? "Pendente" : "Atualização necessária",
  }));
  const baixar = (blob: Blob, nome: string) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = nome; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (formato === "xlsx") {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Atletas");
    baixar(new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "atletas.xlsx");
  } else {
    const { jsPDF } = await import("jspdf"); const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.text("Cadastro de atletas", 14, 18); pdf.setFontSize(10);
    let y = 29;
    for (const row of rows) {
      const lines = pdf.splitTextToSize(`#${row.ID}  ${row.Nome}  |  ${row.Status}  |  ${row.Idade} anos\n${row.Posições}  •  ${row.Categorias}\nTurmas: ${row.Turmas || "—"}  |  Torneios: ${row.Torneios || "—"}  |  Médico: ${row["Formulário médico"]}`, 180);
      if (y + lines.length * 5 > 278) { pdf.addPage(); y = 18; }
      pdf.text(lines, 14, y); y += lines.length * 5 + 5;
    }
    pdf.save("atletas.pdf");
  }
}
