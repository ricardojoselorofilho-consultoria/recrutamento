"use client";

import { useState } from "react";
import type { EstadoLink } from "@/app/painel/actions";

export default function LinkGerado({ estado }: { estado: NonNullable<EstadoLink> }) {
  const [copiado, setCopiado] = useState(false);
  if (estado.erro) return <p className="erro">{estado.erro}</p>;
  if (!estado.link) return null;
  const prazo = new Date(estado.expira!).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const copiar = async () => {
    await navigator.clipboard.writeText(estado.link!);
    setCopiado(true);
  };
  return (
    <div className="link-gerado" role="status">
      <p>
        <strong>Link de {estado.nome}</strong>, válido até {prazo}.{" "}
        {estado.emailEnviado ? "O convite foi enviado por e-mail." : "Copie e envie ao candidato."}
      </p>
      <div className="linha-link">
        <input readOnly value={estado.link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do candidato" />
        <button type="button" className="btn" onClick={copiar}>{copiado ? "Copiado" : "Copiar link"}</button>
      </div>
      <p className="nota">Este link aparece só agora. Se perder, gere um novo: o anterior deixa de funcionar.</p>
    </div>
  );
}
