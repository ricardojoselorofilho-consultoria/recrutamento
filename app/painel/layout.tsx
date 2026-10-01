import { exigirRecrutador } from "@/lib/auth";
import { sair } from "./actions";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const user = await exigirRecrutador();
  return (
    <div className="painel">
      <header className="topo">
        <a className="marca" href="/painel">RJL Consultoria</a>
        <div className="usuario">
          <span>{user.email}</span>
          <form action={sair}><button className="btn-link">Sair</button></form>
        </div>
      </header>
      <main className="conteudo">{children}</main>
    </div>
  );
}
