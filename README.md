# Adiantamento de Despesas de Viagem — Online

Sistema web que substitui o formulário em PDF "Adiantamento de Despesas de Viagem" por um
formulário online, com aprovação em cadeia por e-mail (Chefia Imediata → Diretor da Área →
Financeiro) e geração automática do PDF em cada etapa.

## Como funciona

1. O colaborador preenche o formulário na página inicial (`/`).
2. Ao enviar:
   - A solicitação é salva no banco de dados.
   - Um PDF é gerado automaticamente.
   - Um e-mail de confirmação é enviado ao colaborador.
   - Um e-mail é enviado à **Chefia Imediata**, com o PDF anexado e botões **Aprovar** / **Rejeitar**.
3. Quando a Chefia aprova, o e-mail (com PDF) segue automaticamente para o **Diretor da Área**.
4. Quando o Diretor aprova, o e-mail segue para o **Financeiro** (endereço fixo, configurado no servidor).
5. Quando o Financeiro aprova, o colaborador e o Financeiro recebem o e-mail final de aprovação.
6. Uma rejeição em qualquer etapa encerra o fluxo e notifica o colaborador.
7. O colaborador pode acompanhar o status a qualquer momento em `/status/[id]` (link enviado por e-mail).
8. O Financeiro tem um painel simples, protegido por senha, em `/painel`, listando todas as solicitações.

## Stack usada

- [Next.js](https://nextjs.org/) (App Router, TypeScript) — funciona muito bem na Vercel
- [Upstash Redis](https://upstash.com/) — banco de dados (plano gratuito é suficiente)
- [Resend](https://resend.com/) — envio de e-mails (plano gratuito é suficiente para começar)
- [pdf-lib](https://pdf-lib.js.org/) — geração do PDF no servidor

Nenhum dado sensível (senhas, cartões) é solicitado neste sistema.

---

## 1. Rodar localmente (opcional, para testar antes de publicar)

Pré-requisitos: [Node.js 18+](https://nodejs.org/).

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha as variáveis (veja passo 2 e 3 abaixo para criar as
contas gratuitas do Upstash e do Resend):

```bash
cp .env.example .env.local
```

Rode o servidor local:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## 2. Criar o banco de dados (Upstash Redis) — gratuito

1. Acesse https://upstash.com e crie uma conta gratuita (dá para entrar com GitHub/Google).
2. Crie um novo banco **Redis** (Create Database), região mais próxima do Brasil (ex: `us-east-1` ou `sa-east-1` se disponível).
3. Na página do banco, copie os valores de **UPSTASH_REDIS_REST_URL** e **UPSTASH_REDIS_REST_TOKEN**
   (aba "REST API").
4. Cole esses valores no `.env.local` (local) e depois nas variáveis de ambiente da Vercel (passo 5).

> Alternativa: dentro da própria Vercel, em **Storage → Marketplace Database Providers → Upstash**,
> dá para criar o banco direto pela integração e as variáveis já são preenchidas automaticamente no projeto.

---

## 3. Criar o envio de e-mails (Resend) — gratuito

1. Acesse https://resend.com e crie uma conta gratuita.
2. Em **API Keys**, crie uma chave e copie o valor para `RESEND_API_KEY`.
3. Para usar seu próprio remetente (ex: `adiantamento@suaempresa.com`), em **Domains**, adicione e
   verifique o domínio da empresa (requer acesso ao DNS do domínio). Depois, defina:
   ```
   EMAIL_FROM="Adiantamento de Viagem <adiantamento@suaempresa.com>"
   ```
4. Enquanto o domínio não estiver verificado, você pode testar com o remetente padrão do Resend:
   ```
   EMAIL_FROM="Adiantamento de Viagem <onboarding@resend.dev>"
   ```
   (nesse modo de teste, o Resend só entrega e-mails para o endereço da sua própria conta Resend —
   suficiente para testar o fluxo, mas verifique o domínio antes de usar com a equipe real).

---

## 4. Publicar na Vercel (deixa o sistema acessível pela internet)

### Opção A — via GitHub (recomendado)

1. Crie um repositório no GitHub e envie este projeto:
   ```bash
   git init
   git add .
   git commit -m "Sistema de adiantamento de despesas de viagem"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/adiantamento-viagem.git
   git push -u origin main
   ```
2. Acesse https://vercel.com, crie uma conta gratuita (pode ser com GitHub) e clique em **Add New → Project**.
3. Selecione o repositório que você acabou de criar e clique em **Import**.
4. Em **Environment Variables**, adicione todas as variáveis do `.env.example` (com os valores reais):
   - `APP_URL` → coloque a URL que a Vercel vai gerar, ex: `https://adiantamento-viagem.vercel.app`
     (dá para editar depois do primeiro deploy, quando a URL final existir)
   - `COMPANY_NAME`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `FINANCE_EMAIL`
   - `TOKEN_SECRET` (gere uma string aleatória, ex: `openssl rand -hex 32`)
   - `ADMIN_PASSWORD`
5. Clique em **Deploy**.
6. Depois do primeiro deploy, copie a URL gerada, atualize a variável `APP_URL` com essa URL
   (em **Project Settings → Environment Variables**) e faça um **Redeploy** para que os links dos
   e-mails apontem corretamente.

### Opção B — via linha de comando (sem GitHub)

```bash
npm install -g vercel
vercel login
vercel
```

Siga as instruções no terminal. Depois configure as variáveis de ambiente com:

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
vercel env add FINANCE_EMAIL
vercel env add TOKEN_SECRET
vercel env add ADMIN_PASSWORD
vercel env add APP_URL
vercel env add COMPANY_NAME
```

E publique em produção com:

```bash
vercel --prod
```

---

## 5. Usar um domínio próprio (opcional)

Em **Project Settings → Domains** na Vercel, você pode apontar um domínio ou subdomínio próprio
(ex: `viagens.suaempresa.com`) seguindo as instruções de DNS mostradas na tela.

---

## Estrutura do projeto

```
app/
  page.tsx                     Formulário principal (público)
  status/[id]/page.tsx         Página de acompanhamento de status
  painel/page.tsx              Painel do financeiro (senha)
  api/
    requests/route.ts          Cria a solicitação, gera PDF, dispara e-mails
    requests/[id]/pdf/route.ts Baixa o PDF de uma solicitação
    approve/route.ts           Endpoint acionado pelos botões Aprovar/Rejeitar do e-mail
    painel/login/route.ts      Login do painel
    painel/list/route.ts       Lista de solicitações (autenticado)
lib/
  types.ts                     Tipos e rótulos do domínio
  db.ts                        Acesso ao Upstash Redis
  pdf.ts                       Geração do PDF (pdf-lib)
  email.ts                     Templates e envio de e-mail (Resend)
  token.ts                     Assinatura dos links de aprovação
```

## Personalizações comuns

- **Trocar o logo/identidade visual**: edite `app/page.tsx` (cabeçalho do formulário) e `lib/pdf.ts`
  (cabeçalho do PDF gerado) com o nome/logo da sua empresa. Para inserir uma imagem no PDF, veja a
  documentação do `pdf-lib` sobre `embedPng`/`embedJpg`.
- **Trocar o e-mail fixo do Financeiro**: variável `FINANCE_EMAIL`.
- **Adicionar mais uma etapa de aprovação**: ajuste `NEXT_STAGE`, `STAGE_TO_STATUS` e `STAGE_LABELS`
  em `lib/types.ts`, e o `VALID_STAGES` em `app/api/approve/route.ts`.
