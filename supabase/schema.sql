-- =============================================================
-- RJL Avaliação de Candidatos - estrutura do banco (Supabase)
-- Rode este script inteiro no SQL Editor do Supabase.
-- =============================================================

create extension if not exists pgcrypto;

-- Quem pode entrar no painel. Depois de criar o usuário em
-- Authentication > Users, insira o id dele aqui (veja o GUIA).
create table if not exists recrutadores (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  criado_em  timestamptz not null default now()
);

create table if not exists candidatos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text,
  cargo         text,
  empresa       text,
  cidade        text,
  -- questionários enviados a este candidato
  instrumentos  text[] not null default array['indicador','locus','motivograma','bases'],
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  iniciado_em   timestamptz,
  concluido_em  timestamptz
);

-- Cada link enviado. Guardamos só o hash do token, nunca o token.
create table if not exists convites (
  id                uuid primary key default gen_random_uuid(),
  candidato_id      uuid not null references candidatos(id) on delete cascade,
  token_hash        text not null unique,
  expira_em         timestamptz not null,
  consentimento_em  timestamptz,
  concluido_em      timestamptz,
  revogado          boolean not null default false,
  criado_em         timestamptz not null default now()
);
create index if not exists convites_candidato_idx on convites(candidato_id);

-- Respostas brutas, uma linha por instrumento.
create table if not exists respostas (
  candidato_id   uuid not null references candidatos(id) on delete cascade,
  instrumento    text not null check (instrumento in ('indicador','locus','motivograma','bases')),
  respostas      jsonb not null,
  atualizado_em  timestamptz not null default now(),
  primary key (candidato_id, instrumento)
);

-- Resultado calculado no servidor ao final.
create table if not exists resultados (
  candidato_id  uuid primary key references candidatos(id) on delete cascade,
  dados         jsonb not null,
  calculado_em  timestamptz not null default now()
);

-- Segurança: RLS ligado e NENHUMA política criada.
-- Assim, ninguém acessa as tabelas pela chave pública; só o servidor
-- do sistema (chave secreta), depois de validar token ou login.
alter table recrutadores enable row level security;
alter table candidatos   enable row level security;
alter table convites     enable row level security;
alter table respostas    enable row level security;
alter table resultados   enable row level security;

-- LGPD: apaga candidatos (e tudo ligado a eles) após 180 dias.
-- Ajuste o prazo à política da empresa. Para rodar automaticamente,
-- ative a extensão pg_cron e agende (veja o GUIA).
create or replace function excluir_candidatos_antigos(dias int default 180)
returns int language sql security definer as $$
  with apagados as (
    delete from candidatos
    where criado_em < now() - make_interval(days => dias)
    returning 1
  )
  select count(*)::int from apagados;
$$;
revoke all on function excluir_candidatos_antigos(int) from public, anon, authenticated;
