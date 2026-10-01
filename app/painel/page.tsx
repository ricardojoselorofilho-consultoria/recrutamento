import { admin } from "@/lib/supabase/admin";
import { ESPEC, NOME_INSTRUMENTO, listaInstrumentos } from "@/lib/instrumentos";
import NovoCandidato from "@/components/NovoCandidato";
import AcoesCandidato from "@/components/AcoesCandidato";

type Linha = {
  id: string; nome: string; email: string | null; cargo: string | null; criado_em: string;
  iniciado_em: string | null; concluido_em: string | null; instrumentos: unknown;
  respostas: { instrumento: string; respostas: (number | null)[] }[];
  convites: { expira_em: string; revogado: boolean; concluido_em: string | null }[];
};

const data = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function situacao(c: Linha) {
  if (c.concluido_em) return { rotulo: `Concluído em ${data(c.concluido_em)}`, classe: "ok" };
  const ativo = c.convites.some((v) => !v.revogado && !v.concluido_em && new Date(v.expira_em) > new Date());
  if (!ativo) return { rotulo: "Link expirado", classe: "alerta" };
  const lista = listaInstrumentos(c.instrumentos);
  const total = lista.reduce((s, k) => s + ESPEC[k].n, 0);
  const feitas = c.respostas
    .filter((r) => lista.includes(r.instrumento as never))
    .reduce((s, r) => s + r.respostas.filter((v) => v !== null).length, 0);
  if (!c.iniciado_em) return { rotulo: "Aguardando início", classe: "" };
  return { rotulo: `Em andamento: ${Math.round((feitas / total) * 100)}%`, classe: "" };
}

export default async function Painel() {
  const { data: lista, error } = await admin()
    .from("candidatos")
    .select("id, nome, email, cargo, criado_em, iniciado_em, concluido_em, instrumentos, respostas(instrumento, respostas), convites(expira_em, revogado, concluido_em)")
    .order("criado_em", { ascending: false })
    .limit(300);
  const candidatos = (lista ?? []) as Linha[];

  return (
    <>
      <NovoCandidato />
      <section className="cartao">
        <h2>Candidatos</h2>
        {error && <p className="erro">Não foi possível carregar a lista. Confira a configuração do Supabase.</p>}
        {!error && candidatos.length === 0 && <p className="vazio">Nenhum candidato ainda. Use o formulário acima para gerar o primeiro link.</p>}
        {candidatos.length > 0 && (
          <div className="rolagem">
            <table className="tabela">
              <thead><tr><th>Candidato</th><th>Cargo</th><th>Questionários</th><th>Convidado em</th><th>Situação</th><th><span className="sr">Ações</span></th></tr></thead>
              <tbody>
                {candidatos.map((c) => {
                  const s = situacao(c);
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.nome}</strong>{c.email && <small>{c.email}</small>}</td>
                      <td>{c.cargo ?? ""}</td>
                      <td className="lista-q">{listaInstrumentos(c.instrumentos).length === 4 ? "Todos" : listaInstrumentos(c.instrumentos).map((k) => NOME_INSTRUMENTO[k]).join(", ")}</td>
                      <td>{data(c.criado_em)}</td>
                      <td><span className={`situacao ${s.classe}`}>{s.rotulo}</span></td>
                      <td><AcoesCandidato id={c.id} nome={c.nome} concluido={!!c.concluido_em} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
