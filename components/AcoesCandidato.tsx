"use client";

import { useActionState } from "react";
import { gerarNovoLink, excluirCandidato, type EstadoLink } from "@/app/painel/actions";
import LinkGerado from "./LinkGerado";

export default function AcoesCandidato({ id, nome, concluido }: { id: string; nome: string; concluido: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoLink, FormData>(gerarNovoLink, null);
  return (
    <div className="acoes">
      <div className="botoes">
        {concluido ? (
          <a className="btn" href={`/painel/candidato/${id}`}>Ver relatório</a>
        ) : (
          <form action={acao}>
            <input type="hidden" name="candidato_id" value={id} />
            <input type="hidden" name="dias" value="7" />
            <button className="btn-sec" disabled={pendente}>{pendente ? "Gerando" : "Novo link"}</button>
          </form>
        )}
        <form action={excluirCandidato} onSubmit={(e) => { if (!confirm(`Excluir ${nome} e todas as respostas? Esta ação não pode ser desfeita.`)) e.preventDefault(); }}>
          <input type="hidden" name="candidato_id" value={id} />
          <button className="btn-link perigo">Excluir</button>
        </form>
      </div>
      {estado && <LinkGerado estado={estado} />}
    </div>
  );
}
