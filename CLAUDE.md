# Obra Facil

Marketplace de servicos de reforma e construcao civil com cotacao automatica de materiais em lojas locais.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 3 |
| Backend | NestJS 11, node-postgres (`pg`) |
| Auth | Clerk (frontend + backend via Bearer token) |
| Banco | PostgreSQL (Supabase hosted) |
| Tipos compartilhados | `@obrafacil/shared` (Zod + TypeScript) |
| Deploy | Vercel (frontend + backend) |

## Estrutura do Monorepo

```
apps/
  frontend/    Next.js 15 — UI mobile-first
  backend/     NestJS 11 — REST API
packages/
  shared/      Tipos e schemas Zod compartilhados
api/
  index.ts     Entry point Vercel serverless (wraps NestJS)
```

## Como rodar localmente

### Pre-requisitos

- Node.js 20+
- npm (workspaces)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api
NEXT_PUBLIC_SUPABASE_URL=https://rxfppsmszfszrtktqybv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<publishable key do Clerk>
CLERK_SECRET_KEY=<secret key do Clerk>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_DISABLE_CLERK_AUTH=true   # opcional: bypassa auth local
```

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL=postgresql://postgres.rxfppsmszfszrtktqybv:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
CLERK_SECRET_KEY=<secret key do Clerk>
PORT=3333
CORS_ORIGIN=http://localhost:3000
DISABLE_CLERK_AUTH=true               # opcional: bypassa auth local
```

> **IMPORTANTE:** O Supabase free tier nao expoe IPv4 na conexao direta (`db.*.supabase.co`).
> Use SEMPRE a connection string do **pooler** (`aws-1-sa-east-1.pooler.supabase.com:6543`)
> com usuario `postgres.<project-ref>`. Pegue a string exata em:
> Supabase Dashboard → Connect → Connection Pooling.

### 3. Buildar o pacote shared (obrigatorio antes de tudo)

```bash
npm run build --workspace=@obrafacil/shared
```

### 4. Subir o backend

```bash
npm run dev:backend
```

O backend roda na porta 3333 (`http://localhost:3333/api`).

Se der erro de `dist/main` nao encontrado, builde primeiro:
```bash
cd apps/backend && npx tsc --outDir dist && cd ../..
node apps/backend/dist/main.js
```

### 5. Subir o frontend

```bash
npm run dev:frontend
```

O frontend roda na porta 3000 (`http://localhost:3000`).

## Build de producao

```bash
npm run build
```

Builda shared → backend → frontend nessa ordem.

Apenas frontend (para Vercel):
```bash
npm run vercel-build
```

## Lint

```bash
npm run lint              # ambos
npm run lint:frontend     # so frontend
npm run lint:backend      # so backend
```

## Testes

```bash
npm test                  # backend (Jest)
```

## Deploy (Vercel)

Dois projetos no Vercel:

| Projeto | Root Directory | Framework | Funcao |
|---------|---------------|-----------|--------|
| `app-devai-frontend` | `apps/frontend` | Next.js | Serve o frontend |
| `app-devai-backend` | raiz | Other | Serve a API via `api/index.ts` |

### Variaveis obrigatorias no Vercel

**app-devai-backend:**
- `DATABASE_URL` — connection string do pooler do Supabase
- `CLERK_SECRET_KEY`
- `CORS_ORIGIN` — URL do frontend

**app-devai-frontend:**
- `NEXT_PUBLIC_API_URL` — URL do backend no Vercel (ex: `https://app-devai-backend.vercel.app/api`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Problema conhecido: Output Directory do frontend

Se o deploy do frontend falhar com `No Output Directory named "public"`, o Vercel nao esta reconhecendo o Next.js. Verifique:
- Framework Preset = **Next.js**
- Output Directory = **vazio** (deixar em branco)
- O arquivo `apps/frontend/vercel.json` deve existir com `{"framework": "nextjs"}`

## Workflow Obrigatorio

**REGRA MANDATORIA: Todo trabalho DEVE seguir os workflows do compound-engineering. Sem excecao, independente do tamanho da mudanca.**

O fluxo obrigatorio e:

1. **`/workflows:plan`** — Planejar antes de implementar. Sempre criar o plano primeiro.
2. **`/workflows:work`** — Implementar seguindo o plano. NAO fazer edits diretos fora do workflow.
3. **`/workflows:review`** — Revisar antes de commitar. NUNCA commitar sem review.
4. **Commit** — So apos o review aprovar.

**Proibido:**
- Implementar mudancas diretamente sem `/workflows:work`
- Commitar sem rodar `/workflows:review` antes
- Pular etapas do workflow, mesmo para mudancas de 1 linha
- Fazer squash de plano + implementacao + review em um unico passo

## Convencoes

- **Commits**: Conventional Commits — `feat|fix|refactor|test|docs|chore(scope): descricao`
- **API**: respostas em `{ data: T }`, erros em `{ error: string, code: string }`
- **Auth**: Clerk Bearer token em endpoints protegidos (`ClerkAuthGuard`)
- **Validacao**: Zod schemas do `@obrafacil/shared`
- **Tipos**: nunca duplicar — usar `@obrafacil/shared`
- **Frontend data**: sempre via `api.get()`/`api.post()` de `lib/api/client.ts`, nunca acessar banco direto
- **Database**: `pg` (node-postgres) via `DatabaseService`, nunca `@supabase/supabase-js`
