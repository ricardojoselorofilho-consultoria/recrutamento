-- =============================================================
-- Atualização 01: escolher quais questionários enviar a cada candidato
-- Rode UMA vez no SQL Editor do Supabase (projetos criados antes desta versão).
-- Candidatos já cadastrados ficam com os quatro questionários.
-- =============================================================
alter table candidatos
  add column if not exists instrumentos text[] not null
  default array['indicador','locus','motivograma','bases'];
