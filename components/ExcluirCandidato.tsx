"use client";

import { excluirCandidato } from "@/app/painel/actions";

export default function ExcluirCandidato({ id, nome }: { id: string; nome: string }) {
  return (
    <form action={excluirCandidato} className="nao-imprimir"
      onSubmit={(e) => { if (!confirm(`Excluir ${nome} e todas as respostas? Esta ação não pode ser desfeita.`)) e.preventDefault(); }}>
      <input type="hidden" name="candidato_id" value={id} />
      <input type="hidden" name="voltar" value="1" />
      <button className="btn-link perigo">Excluir este candidato e todos os dados</button>
    </form>
  );
}
