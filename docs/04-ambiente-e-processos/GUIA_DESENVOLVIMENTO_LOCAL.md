# 🏗️ Guia de Desenvolvimento Local — Obra Fácil

> **Objetivo**: Rodar o projeto inteiro na sua máquina via Docker, **sem precisar de contas no Clerk ou Supabase**. O ambiente local inclui um banco PostgreSQL próprio com dados de demonstração, bypass automático de login, e tudo que você precisa para desenvolver, testar e enviar suas mudanças pro GitHub sem afetar a produção.

> [!IMPORTANT]
> **O ambiente local é 100% independente da produção.** Temos um PostgreSQL rodando dentro do Docker (container `obrafacil-db`) com migrações e dados de demonstração pré-carregados. A autenticação (Clerk) é substituída por um bypass automático. Você não precisa configurar nenhuma chave externa.

---

## 📋 Pré-requisitos

Antes de começar, instale na sua máquina:

| Ferramenta | Versão mínima | Link |
|---|---|---|
| **Git** | 2.x | [git-scm.com](https://git-scm.com/) |
| **Docker Desktop** | 4.x | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Node.js** | 20.x | [nodejs.org](https://nodejs.org/) (caso queira rodar testes fora do Docker) |

> [!IMPORTANT]
> **Docker Desktop precisa estar rodando** antes de qualquer comando. Abra o app e espere ele ficar "verde" (Engine running).

---

## 🚀 Passo a Passo — Do Zero ao App Rodando

### 1. Clonar o repositório

```bash
git clone https://github.com/lexcesar/obra-facil.git
cd obra-facil
```

### 2. Subir o projeto com Docker

Apenas **um comando**. Não precisa instalar dependências, configurar banco, nem nada:

```bash
docker compose up --build -d
```

Esse comando faz tudo automaticamente:
- Baixa as imagens do Node.js 20 e PostgreSQL
- Sobe o banco de dados local (`obrafacil-db`) com migrações e dados de demonstração
- Instala todas as dependências (`npm ci`)
- Compila o pacote compartilhado (`@obrafacil/shared`)
- Compila o backend (NestJS) e o frontend (Next.js)
- Sobe três contêineres: `obrafacil-db` (PostgreSQL), `obrafacil-backend` e `obrafacil-frontend`

> [!NOTE]
> A primeira vez demora **2-4 minutos** (download de imagens + compilação). As próximas vezes são mais rápidas graças ao cache do Docker.

### 3. Acessar a aplicação

| Serviço | URL / Porta |
|---|---|
| **Frontend** (Next.js) | [http://localhost:3000](http://localhost:3000) |
| **Backend API** (NestJS) | [http://localhost:3001/api](http://localhost:3001/api) |
| **PostgreSQL** (obrafacil-db) | `localhost:5432` (user: `obrafacil_user` / pass: `obrafacil_pass` / db: `obrafacil_db`) |
| **Swagger Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) |

### 4. Verificar se está tudo rodando

```bash
docker compose ps
```

Saída esperada:
```
NAME                 STATUS
obrafacil-db         Up (healthy)
obrafacil-backend    Up (healthy)
obrafacil-frontend   Up
```

### 5. Ver logs em tempo real

```bash
# Todos os serviços
docker compose logs -f

# Apenas o backend
docker compose logs -f backend

# Apenas o frontend
docker compose logs -f frontend
```

### 6. Parar o projeto

```bash
docker compose down
```

---

## 🔄 Fluxo de Trabalho Diário

```
┌─────────────────────────────────────────────────────────┐
│                    SEU DIA A DIA                        │
│                                                         │
│  1. git pull origin main          ← pegar atualizações  │
│  2. docker compose up --build -d  ← subir com rebuild   │
│  3. Editar código no VS Code      ← desenvolver         │
│  4. docker compose up --build -d  ← testar mudanças     │
│  5. git add . && git commit       ← salvar progresso    │
│  6. git push origin sua-branch    ← enviar pro GitHub   │
│  7. docker compose down           ← encerrar o dia      │
└─────────────────────────────────────────────────────────┘
```

> [!TIP]
> Sempre que alterar código, rode `docker compose up --build -d` para recompilar. Se alterou **apenas** o `docker-compose.yml` (variáveis de ambiente), basta `docker compose up -d` (sem `--build`).

---

## 🔐 Como Funciona o Bypass de Autenticação

### O Problema
Em produção (Vercel), o app usa **Clerk** para login de usuários e **Supabase** como banco de dados. Ambos exigem chaves secretas que nem todos do time possuem.

### A Solução
Criamos um sistema de **bypass por variável de ambiente** que desliga a autenticação quando rodamos localmente. O app funciona como se você já estivesse logado.

### Diagrama do Fluxo

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMO O BYPASS FUNCIONA                        │
│                                                                  │
│  docker-compose.yml define:                                      │
│    DISABLE_CLERK_AUTH = "true"           (backend)               │
│    NEXT_PUBLIC_DISABLE_CLERK_AUTH = "true" (frontend)             │
│                                                                  │
│  ┌─────────────┐     ┌──────────────────────────────────┐       │
│  │  Requisição  │────▶│  Middleware (middleware.ts)       │       │
│  │  do browser  │     │  Vê bypass=true → Libera acesso  │       │
│  └─────────────┘     └──────────────────────────────────┘       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  auth-bypass.ts                                      │       │
│  │  Retorna usuário fake: "Desenvolvedor Local"         │       │
│  │  userId: "bypass-local-dev-id"                       │       │
│  │  email: "dev@localhost"                               │       │
│  └──────────────────────────────────────────────────────┘       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  ClerkAuthGuard (backend)                            │       │
│  │  Vê bypass=true → Injeta perfil mock → Libera rota   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  🗄️  Banco PostgreSQL local (obrafacil-db)                        │
│  O guard resolve o perfil pelo header X-Dev-User-Id, ou          │
│  cai no primeiro cliente do seed (ORDER BY id ASC).              │
│                                                                  │
│  ✅ Resultado: App funciona 100% sem login, com dados reais      │
└──────────────────────────────────────────────────────────────────┘
```

### Alternando o usuário logado em bypass

O guard aceita o header `X-Dev-User-Id` com um `clerk_id` do seed. Para trocar o usuário que o frontend envia, defina a env antes de subir o Next.js:

```bash
NEXT_PUBLIC_BYPASS_USER_CLERK_ID=demo_client_002 npm run dev:frontend
```

Perfis disponíveis no seed (veja `docker/02-seed.sql`):

| clerk_id | Nome | Role | Pedidos |
|---|---|---|---|
| `demo_client_001` (default) | Carlos Alberto | client | 2 pedidos (#88421, #88390) |
| `demo_client_002` | Joana Mendes | client | 2 pedidos (#90102, #90155) |
| `demo_professional_001` | Ricardo Silva | professional | — |

Para testes de autorização, também é possível passar o header direto via `curl`:

```bash
curl -H 'X-Dev-User-Id: demo_client_002' http://localhost:3001/api/v1/orders
```

### Arquivos Envolvidos no Bypass

| Arquivo | O que faz |
|---|---|
| `apps/frontend/src/lib/auth-bypass.ts` | Wrapper que substitui as funções `auth()` e `currentUser()` do Clerk por dados fictícios quando o bypass está ativo |
| `apps/frontend/src/middleware.ts` | Intercepta toda requisição. Se bypass ativo, libera acesso sem redirecionar para `/sign-in` |
| `apps/frontend/src/lib/env.ts` | Função `isClerkConfigured()` retorna `false` quando bypass está ativo, desligando o Provider do Clerk |
| `apps/backend/src/core/guards/clerk-auth.guard.ts` | Guard do NestJS que pula a verificação de token JWT e injeta um perfil mock |
| `docker-compose.yml` | Define as variáveis `DISABLE_CLERK_AUTH` e `NEXT_PUBLIC_DISABLE_CLERK_AUTH` como `"true"` |
| `apps/frontend/Dockerfile` | Injeta variáveis mock no build do Next.js (necessário porque `NEXT_PUBLIC_*` são embutidas em tempo de compilação) |

---

## 🛡️ Posso dar push sem medo?

**SIM!** Suas mudanças não afetam a produção. Veja por quê:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LOCAL (Docker)              vs.     PRODUÇÃO (Vercel)         │
│   ─────────────                       ──────────────────        │
│                                                                 │
│   Lê docker-compose.yml              Ignora docker-compose.yml  │
│   Lê Dockerfile                      Ignora Dockerfile          │
│   DISABLE_CLERK_AUTH = true           Variável NÃO existe       │
│   Supabase = dummy/mock              Supabase = chaves reais    │
│   Clerk = desligado                  Clerk = ativo              │
│   Login = bypass automático          Login = tela real           │
│                                                                 │
│   ✅ Sem impacto cruzado                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

A Vercel:
- **Não usa** `docker-compose.yml` nem `Dockerfile` (ela tem seu próprio sistema de build serverless)
- **Não possui** a variável `DISABLE_CLERK_AUTH` no painel dela
- **Possui** as chaves reais do Clerk e Supabase configuradas no painel de Environment Variables

Ou seja: o bypass só liga no Docker. Na Vercel, tudo continua exigindo login real e conectando ao banco real.

---

## 🗄️ Banco de Dados Local

O projeto inclui um container PostgreSQL (`obrafacil-db`) que sobe automaticamente com o Docker.

| Ambiente | Banco | Dados |
|---|---|---|
| **Local (Docker)** | ✅ PostgreSQL (container `obrafacil-db`) | Dados de demonstração pré-carregados via `seed.sql` |
| **Produção (Vercel)** | ✅ Supabase (PostgreSQL na nuvem) | Dados reais de usuários, profissionais, obras, etc. |

### Dados de demonstração incluídos

O arquivo `supabase/seed.sql` carrega dados realistas para todas as telas:

| Entidade | Exemplos |
|---|---|
| **Perfis** | Carlos Alberto (cliente), Ricardo Silva (eletricista), José da Silva (encanador), Ana Rodrigues (pintora) |
| **Profissionais** | 3 profissionais com avaliações (4.7~4.9 ★), bios e especialidades |
| **Serviços** | Reparos elétricos, Instalações Hidráulicas, Pinturas, Diaristas, Pedreiro, Marceneiro |
| **Avaliações** | 5 reviews reais com comentários detalhados |
| **Lojas** | Construção Sul, Hidráulica Centro, Materiais Avenida |
| **Pedidos** | #88421 (A Caminho), #88390 (Entregue) |
| **Obras** | Reforma Banheiro Social (65%), Pintura Fachada (Agendado) |
| **Chat** | Conversa de demonstração entre cliente e profissional |
| **Cotações** | 3 ofertas de lojas com preços (R$218,30 / R$243,50 / R$263,30) |

### Conexão direta ao banco (opcional)

Se quiser inspecionar os dados com um cliente SQL (DBeaver, pgAdmin, etc.):

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Usuário | `obrafacil_user` |
| Senha | `obrafacil_pass` |
| Banco | `obrafacil_db` |

> [!TIP]
> As migrações ficam em `supabase/migrations/` e os dados de seed em `supabase/seed.sql`. Se precisar resetar o banco, basta rodar `docker compose down --volumes` e subir novamente.

---

## 🌿 Boas Práticas com Git

### Trabalhando em branches

```bash
# Criar sua branch de trabalho
git checkout -b feat/minha-feature

# ... fazer suas alterações ...

# Commitar
git add .
git commit -m "feat(modulo): descrição da mudança"

# Enviar para o GitHub
git push origin feat/minha-feature
```

### Convenção de commits

Usamos **Conventional Commits**:

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `feat` | Nova funcionalidade | `feat(orders): adicionar filtro por status` |
| `fix` | Correção de bug | `fix(chat): corrigir scroll automático` |
| `refactor` | Refatoração sem mudar comportamento | `refactor(auth): simplificar guard` |
| `docs` | Documentação | `docs: atualizar guia local` |
| `test` | Testes | `test(professionals): adicionar testes unitários` |
| `chore` | Tarefas de manutenção | `chore: atualizar dependências` |

### Abrindo Pull Request

1. Faça push da sua branch
2. Abra um PR no GitHub apontando para `main`
3. Descreva o que mudou
4. Aguarde revisão de pelo menos 1 colega

---

## 🐛 Solução de Problemas

### "Porta 3000 ou 3001 já está em uso"
```bash
# Ver o que está usando a porta
netstat -ano | findstr :3000

# Ou parar tudo do Docker e tentar de novo
docker compose down
docker compose up --build -d
```

### "Cannot find module" no backend
```bash
# Limpar cache do Docker e rebuildar do zero
docker compose down
docker system prune -f
docker compose up --build -d
```

### "Image build failed"
```bash
# Forçar rebuild completo sem cache
docker compose build --no-cache
docker compose up -d
```

### Container reiniciando em loop (CrashLoopBackOff)
```bash
# Verificar logs do container
docker compose logs backend
docker compose logs frontend
```

### Quero resetar tudo do zero
```bash
docker compose down --volumes --rmi all
docker compose up --build -d
```

---

## 📁 Estrutura do Projeto

```
obrafacil-main/
├── apps/
│   ├── backend/          ← NestJS 11 (API REST)
│   │   ├── Dockerfile    ← Build do Docker para o backend
│   │   └── src/
│   │       ├── core/     ← Guards, interceptors, filtros
│   │       ├── modules/  ← Módulos de domínio
│   │       └── supabase/ ← Serviço de conexão ao banco
│   │
│   └── frontend/         ← Next.js 15 (Interface do usuário)
│       ├── Dockerfile    ← Build do Docker para o frontend
│       └── src/
│           ├── app/      ← Páginas (App Router)
│           ├── components/ ← Componentes reutilizáveis
│           └── lib/      ← Utilitários (auth-bypass, api client)
│
├── packages/
│   └── shared/           ← Tipos e schemas compartilhados (Zod)
│
├── docker-compose.yml    ← Orquestração dos containers
├── vercel.json           ← Configuração de deploy (produção)
└── package.json          ← Raiz do monorepo (npm workspaces)
```

---

## ❓ FAQ

**P: Preciso de conta no Clerk ou Supabase?**
R: Não. O Docker sobe um PostgreSQL local com dados de demonstração e a autenticação é bypass automático.

**P: Como reseto o banco de dados local?**
R: Rode `docker compose down --volumes` e depois `docker compose up --build -d`. Isso apaga o volume do PostgreSQL e recria tudo do zero com o seed.

**P: Preciso instalar Node.js localmente?**
R: Não obrigatoriamente. O Docker traz o Node 20 dentro dele. Mas é útil ter para rodar lint/testes fora do Docker.

**P: E se eu quiser conectar ao Supabase real localmente?**
R: Preencha as variáveis no arquivo `.env` na raiz do projeto com suas chaves reais. O `docker-compose.yml` vai usar elas automaticamente no lugar dos valores dummy.

**P: Minha alteração vai quebrar a produção?**
R: Não, desde que você não altere as variáveis de ambiente no painel da Vercel. O bypass só ativa dentro do Docker.

**P: Preciso rodar `npm install` localmente?**
R: Não. O Docker faz o `npm ci` internamente durante o build.
