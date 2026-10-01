"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(params.get("erro") === "acesso" ? "Este usuário não tem acesso ao painel. Peça a liberação ao administrador." : "");
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErro("");
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email, password: senha });
    setEntrando(false);
    if (error) return setErro("E-mail ou senha incorretos.");
    router.replace("/painel");
    router.refresh();
  };

  return (
    <form className="cartao estreito" onSubmit={entrar}>
      <h1>Painel do recrutador</h1>
      <label className="campo">
        <span>E-mail</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="campo">
        <span>Senha</span>
        <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </label>
      {erro && <p className="erro">{erro}</p>}
      <button className="btn" disabled={entrando}>{entrando ? "Entrando" : "Entrar"}</button>
    </form>
  );
}

export default function Login() {
  return (
    <div className="jornada">
      <header className="topo"><span className="marca">RJL Consultoria</span></header>
      <main className="palco">
        <Suspense><Formulario /></Suspense>
      </main>
    </div>
  );
}
