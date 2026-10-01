# Guia de publicação: RJL Avaliação de Candidatos

Este guia leva o sistema do arquivo .zip até um endereço no ar, sem precisar programar. Reserve cerca de uma hora na primeira vez. Os três serviços usados têm plano gratuito para começar.

## O que o sistema faz

O recrutador entra no painel, cadastra o candidato e gera um link pessoal. O candidato abre o link, aceita o termo de uso dos dados e responde aos quatro questionários (Indicador Tipológico, Lócus de Controle, Motivograma e Bases Motivacionais) numa única jornada. Cada resposta é salva na hora, então ele pode parar e continuar depois. Ao enviar, o link deixa de funcionar e o resultado aparece só no painel, com o relatório completo para imprimir ou salvar em PDF.

As chaves de correção e os textos de interpretação ficam apenas no servidor. O navegador do candidato recebe somente o texto das perguntas.

## Passo 1. Criar as contas

Crie uma conta em cada serviço, de preferência com o mesmo e-mail corporativo:

- GitHub (github.com): guarda o código.
- Supabase (supabase.com): banco de dados e login dos recrutadores.
- Vercel (vercel.com): coloca o site no ar. Entre usando a conta do GitHub.

## Passo 2. Configurar o Supabase

1. Clique em **New project**. Escolha um nome, crie uma senha forte para o banco e, em **Region**, selecione **South America (São Paulo)**.
2. Quando o projeto estiver pronto, abra **SQL Editor**, cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Devem aparecer as tabelas `recrutadores`, `candidatos`, `convites`, `respostas` e `resultados` em **Table Editor**.
3. Em **Authentication > Sign In / Providers**, confirme que **Email** está ativado e **desative** a opção que permite novos cadastros (Allow new users to sign up). Assim, só entra quem você criar.
4. Em **Authentication > Users**, clique em **Add user > Create new user**, informe o e-mail e a senha do recrutador e marque **Auto Confirm User**.
5. Copie o **UID** do usuário criado, volte ao **SQL Editor** e rode, trocando os valores:

   ```sql
   insert into recrutadores (user_id, nome) values ('COLE-O-UID-AQUI', 'Nome do recrutador');
   ```

   Repita os passos 4 e 5 para cada recrutador.
6. Em **Project Settings > API** (ou **API Keys**), anote três valores:
   - **Project URL**
   - a chave pública (**anon** ou **publishable**)
   - a chave secreta (**service_role** ou **secret**). Trate essa chave como uma senha: ela nunca deve ser enviada a ninguém.

## Passo 3. Enviar o código para o GitHub

1. No GitHub, clique em **New repository**, dê um nome (por exemplo `rjl-avaliacao`) e marque **Private**.
2. Na página do repositório vazio, clique em **uploading an existing file**.
3. Descompacte o .zip no seu computador e arraste **o conteúdo da pasta** (as pastas `app`, `components`, `lib`, `supabase` e os demais arquivos) para a página. Clique em **Commit changes**.

## Passo 4. Publicar na Vercel

1. Na Vercel, clique em **Add New > Project** e importe o repositório `rjl-avaliacao`. O framework Next.js é detectado sozinho.
2. Antes de publicar, abra **Environment Variables** e cadastre:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (anon / publishable) |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave secreta (service_role / secret) |

3. Clique em **Deploy**. Ao final, a Vercel mostra o endereço do site (algo como `rjl-avaliacao.vercel.app`).
4. Volte em **Settings > Environment Variables**, cadastre `NEXT_PUBLIC_SITE_URL` com esse endereço completo, sem barra no final (por exemplo `https://rjl-avaliacao.vercel.app`), e faça um novo deploy em **Deployments > Redeploy**. É esse endereço que vai nos links enviados aos candidatos.

Para usar um domínio próprio, como `avaliacao.rjlconsultoria.com.br`, configure em **Settings > Domains** e atualize `NEXT_PUBLIC_SITE_URL`.

## Passo 5. Testar antes de usar com candidatos

1. Acesse `seu-endereço/login` e entre com o recrutador criado.
2. Cadastre um candidato de teste e gere o link.
3. Abra o link numa janela anônima, aceite o termo, responda a algumas perguntas, feche e abra de novo: as respostas devem continuar lá.
4. Termine as quatro etapas e envie.
5. No painel, a situação deve mudar para **Concluído** e o botão **Ver relatório** deve aparecer.
6. Abra o mesmo link de novo: deve aparecer **Avaliação já enviada**.

Vale aplicar com duas ou três pessoas da equipe e comparar o resultado com os questionários antigos.

## Passo 6 (opcional). Enviar convites por e-mail

Sem essa configuração, o painel mostra o link para você copiar e enviar por WhatsApp ou e-mail. Para o envio automático:

1. Crie uma conta em resend.com e verifique o domínio da empresa (o próprio Resend mostra os registros de DNS a cadastrar).
2. Gere uma API Key.
3. Na Vercel, cadastre `RESEND_API_KEY` com a chave e `EMAIL_REMETENTE` no formato `RJL Consultoria <avaliacao@seudominio.com.br>`. Faça um redeploy.

## Passo 7. LGPD

- **Termo de consentimento:** o texto exibido ao candidato está em `app/avaliacao/[token]/Jornada.tsx`, na tela de consentimento. Peça ao jurídico para revisar e ajuste o contato para pedidos de exclusão.
- **Exclusão manual:** o painel tem o botão **Excluir** em cada candidato, que apaga o cadastro, as respostas e o resultado.
- **Exclusão automática:** o banco tem a função `excluir_candidatos_antigos`, que apaga candidatos com mais de 180 dias. Para agendar, ative a extensão **pg_cron** em **Database > Extensions** e rode no SQL Editor:

  ```sql
  select cron.schedule('limpeza-lgpd', '0 3 * * *', $$ select excluir_candidatos_antigos(180) $$);
  ```

  Se mudar o prazo, atualize também o texto do termo, que menciona 180 dias.

## Onde alterar cada coisa

| O que | Arquivo |
|---|---|
| Perguntas, chaves de correção e textos de interpretação | `lib/instrumentos/dados.json` |
| Regras de cálculo | `lib/instrumentos/index.ts` |
| Instruções de cada questionário e termo de consentimento | `app/avaliacao/[token]/Jornada.tsx` |
| Relatório do recrutador | `app/painel/candidato/[id]/page.tsx` |
| Cores e fontes | `app/globals.css` |

No GitHub, dá para editar um arquivo direto no navegador (ícone de lápis). Ao salvar, a Vercel publica a nova versão sozinha em cerca de um minuto.

## Segurança: o que está protegido

- Chaves de correção, regras de cálculo e textos de interpretação não chegam ao navegador do candidato. O código foi verificado para isso.
- O link é aleatório, guardado no banco só em forma cifrada, tem prazo de validade e deixa de funcionar após o envio. Gerar um novo link invalida o anterior.
- O banco recusa qualquer acesso direto. Tudo passa pelo servidor, que confere o link ou o login do recrutador.
- O candidato continua vendo as perguntas enquanto responde, como em qualquer questionário.
- Nunca coloque a chave secreta em uma variável que comece com `NEXT_PUBLIC_`.

## Rodar no computador (opcional, para quem for mexer no código)

Com Node.js 20 ou superior instalado: copie `.env.example` para `.env.local`, preencha os valores e rode `npm install` e depois `npm run dev`. O sistema abre em `http://localhost:3000`.

