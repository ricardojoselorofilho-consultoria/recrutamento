"use client";

import { useActionState } from "react";
import { criarCandidato, type EstadoLink } from "@/app/painel/actions";
import LinkGerado from "./LinkGerado";

export default function NovoCandidato() {
  const [estado, acao, pendente] = useActionState<EstadoLink, FormData>(criarCandidato, null);
  return (
    <section className="cartao">
      <h2>Convidar candidato</h2>
      <form action={acao} className="grade-form" key={estado?.link ?? "novo"}>
        <label className="campo largo"><span>Nome completo</span><input name="nome" required minLength={3} /></label>
        <label className="campo"><span>E-mail</span><input name="email" type="email" /></label>
        <label className="campo"><span>Cargo</span><input name="cargo" /></label>
        <label className="campo"><span>Empresa</span><input name="empresa" /></label>
        <label className="campo"><span>Cidade</span><input name="cidade" /></label>
        <label className="campo"><span>Validade do link</span>
          <select name="dias" defaultValue="7">
            <option value="3">3 dias</option><option value="7">7 dias</option>
            <option value="15">15 dias</option><option value="30">30 dias</option>
          </select>
        </label>
        <label className="marcar largo"><input type="checkbox" name="enviar" defaultChecked /> Enviar o convite por e-mail, se o e-mail estiver preenchido</label>
        <div className="largo"><button className="btn" disabled={pendente}>{pendente ? "Gerando" : "Gerar link"}</button></div>
      </form>
      {estado && <LinkGerado estado={estado} />}
    </section>
  );
}
