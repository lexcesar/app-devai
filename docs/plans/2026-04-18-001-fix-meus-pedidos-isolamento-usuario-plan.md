---
title: "fix: Isolar pedidos por usuário logado em Meus Pedidos"
type: fix
status: active
date: 2026-04-18
origin: docs/gap-analysis-entrega-g1.md
---

# fix: Isolar pedidos por usuário logado em Meus Pedidos

## Overview

A tela `/pedidos` exibe pedidos de outros usuários (feedback da banca da Entrega G1). O backend já tem o filtro `WHERE client_id = $1`, mas o `profile.id` resolvido pelo `ClerkAuthGuard` em modo bypass é sempre o primeiro registro de `profiles` sem `ORDER BY`, colapsando todos os "usuários logados" no mesmo perfil. Este plano corrige o isolamento, adiciona auto-provisionamento de perfil em modo real, cria um segundo cliente no seed e prova o isolamento com teste de integração.

## Problem Frame

**Observação do avaliador (rubrica G1):** *"Histórico traz dados de outros usuários. Necessário ver 'meus pedidos'."*

**Root cause:**

- `apps/backend/src/core/guards/clerk-auth.guard.ts:22-26` — bypass retorna `SELECT * FROM profiles LIMIT 1` sem `ORDER BY` nem filtro por role. Qualquer sessão cai no mesmo perfil arbitrário.
- Em produção com Clerk real, se o `CLERK_WEBHOOK_SECRET` não estiver configurado ou o webhook não disparar antes do primeiro login, o guard responde 401 ("Perfil não encontrado") — não há auto-provisionamento just-in-time.
- `apps/frontend/src/lib/auth-bypass.ts` devolve sempre `userId: 'bypass-local-dev-id'` — alinhado ao backend bypass, mas não suporta testar multi-usuário localmente.

**Por que isso produz o sintoma relatado:** no ambiente avaliado (provável `DISABLE_CLERK_AUTH=true`), a banca e o Carlos Alberto (cliente do seed) compartilham o mesmo `profile.id`. Os pedidos seed (`client_id = 00000000-...-001`) aparecem como "pedidos do avaliador".

## Requirements Trace

- **R1** (RF1 rubrica): tela "Meus Pedidos" exibe apenas pedidos do usuário autenticado.
- **R2** (RF1 rubrica): fluxo ponta-a-ponta do cliente precisa ser verificável sem "simulações".
- **R3** (RNF-02 Segurança): autorização por perfil — usuário A não acessa dados de usuário B.
- **R4** (RNF-05 Testabilidade): existência de teste automatizado provando o isolamento.

## Scope Boundaries

- Este plano **não** inclui: feedback/avaliação de pedido entregue, tela de encerramento, carrinho de compras, detalhe de rastreio.
- Este plano **não** implementa Roles decorator/guard genérico — só padroniza o mapeamento `clerk_id → profile`.

### Deferred to Separate Tasks

- **Avaliação/feedback de pedido entregue (RF1 critério "feedback ou encerramento")**: plano separado, quando "Meus Pedidos" estiver funcional.
- **Fluxo completo do profissional (RF2)**: plano separado (item 2 do gap analysis).

## Context & Research

### Relevant Code and Patterns

- `apps/backend/src/core/guards/clerk-auth.guard.ts` — local do bug do bypass (linhas 21-27).
- `apps/backend/src/modules/webhooks/webhooks.controller.ts` — já faz upsert de profile via webhook Clerk; padrão para auto-provisionamento.
- `apps/backend/src/modules/orders/orders.controller.ts` — filtro já correto (`findAllByProfile(profile.id)`); não mexer.
- `apps/backend/src/modules/orders/orders.repository.ts` — query com `WHERE o.client_id = $1`; não mexer.
- `apps/frontend/src/lib/auth-bypass.ts` — stub do Clerk no frontend; alinhar com backend.
- `docker/02-seed.sql` linhas 11-100 — profiles do seed (4 clientes: 001, 008, 009, 010); linhas 358-378 — orders do Carlos Alberto.
- `apps/backend/src/app.controller.spec.ts` + `apps/backend/test/app.e2e-spec.ts` — padrão de testes NestJS existente (ainda placeholder).

### Institutional Learnings

- Nenhum `docs/solutions/` relevante para este fix.

### External References

- NestJS e2e testing com `@nestjs/testing` + `supertest` (já nas devDependencies).

## Key Technical Decisions

- **Bypass determinístico por header**: em modo `DISABLE_CLERK_AUTH=true`, o guard lê header `X-Dev-User-Id` (clerk_id do seed, ex.: `demo_client_001`) e busca o profile correspondente. Se o header não vier, usa o primeiro cliente do seed **com `ORDER BY` estável + filtro `role='client'`**. Isso permite testar multi-usuário localmente sem remover o DX do bypass.
  - **Rationale**: mantém o bypass útil (dev não precisa subir Clerk), mas torna o profile resolvido previsível e permite simular múltiplos usuários.
- **Auto-provisionamento JIT no Clerk real**: quando `SELECT ... WHERE clerk_id = $1` retorna vazio, criar o profile on-demand com `role='client'` default, em vez de 401. Mantém o webhook como caminho preferencial, mas cobre casos de webhook não configurado ou delay.
  - **Rationale**: evita dependência dura do webhook em ambiente de avaliação; reduz fricção no primeiro login.
- **Segundo cliente no seed com pedidos próprios**: adicionar cliente B (`demo_client_002`) com 1-2 pedidos próprios. Permite teste de isolamento real (user A nunca vê orders de user B).
- **Teste de integração com DB real** via docker-compose local (`obrafacil-db`), não mock. Garante que o filtro SQL funciona de verdade.

## Open Questions

### Resolved During Planning

- **Como alternar usuários no frontend em bypass?** Adicionar helper `setBypassUser(clerkId)` que escreve em cookie/localStorage e é lido pelo `api/client.ts` para enviar `X-Dev-User-Id`. Implementação mínima neste plano; UI de troca de usuário pode vir depois.
- **Auto-provisionar em prod ou manter só webhook?** JIT no guard. Webhook continua existindo e tem idempotência (ON CONFLICT DO UPDATE).

### Deferred to Implementation

- **Nome exato da coluna do seed para cliente B**: decidir no momento, seguindo padrão existente de UUIDs.
- **Se o `api/client.ts` lê cookies no SSR** — verificar no Next.js 15; se não, passar o clerk_id via contexto de request server-side.

## Implementation Units

- [ ] **Unit 1: Corrigir `ClerkAuthGuard` para bypass determinístico e JIT provisioning**

**Goal:** tornar o perfil resolvido pelo guard previsível e isolado por usuário, em ambos os modos (bypass e Clerk real).

**Requirements:** R1, R3

**Dependencies:** nenhuma

**Files:**
- Modify: `apps/backend/src/core/guards/clerk-auth.guard.ts`
- Test: `apps/backend/src/core/guards/clerk-auth.guard.spec.ts` (criar)

**Approach:**
- Em modo bypass (`DISABLE_CLERK_AUTH=true`):
  - Ler header `X-Dev-User-Id` (opcional); se presente, buscar `SELECT * FROM profiles WHERE clerk_id = $1`.
  - Se ausente, buscar `SELECT * FROM profiles WHERE role = 'client' ORDER BY id ASC LIMIT 1` (primeiro cliente do seed, determinístico).
  - Se nenhum perfil encontrado, lançar `UnauthorizedException('Bypass profile não encontrado — seed do banco está vazio?')`.
- Em modo real (Clerk ativo):
  - Após `verifyToken`, tentar buscar por `clerk_id`.
  - Se não encontrar, **inserir profile JIT** com defaults (`role='client'`, `full_name` derivado do token ou `'Usuário'`). Usar `INSERT ... ON CONFLICT (clerk_id) DO UPDATE RETURNING *` para idempotência.
  - Só então anexar ao `request.profile`.

**Patterns to follow:**
- Upsert de profile em `apps/backend/src/modules/webhooks/webhooks.controller.ts:78-93` — mesma query base para o JIT.

**Test scenarios:**
- **Happy path — bypass default**: `DISABLE_CLERK_AUTH=true`, sem header → profile é o primeiro cliente do seed (`demo_client_001`).
- **Happy path — bypass com header**: `DISABLE_CLERK_AUTH=true`, header `X-Dev-User-Id: demo_client_002` → profile é o cliente B.
- **Edge case — bypass header inválido**: header aponta para clerk_id inexistente → cai no fallback (primeiro cliente) OU 401 (decidir na implementação; recomendado: 401 para pegar bugs).
- **Error path — bypass sem clientes no seed**: tabela `profiles` sem nenhum `role=client` → 401 com mensagem clara.
- **Happy path — Clerk real com profile existente**: token válido + profile já existe → retorna profile do banco.
- **Happy path — Clerk real sem profile (JIT)**: token válido + profile não existe → insere + retorna o novo profile com `role='client'`.
- **Error path — Clerk real token inválido**: `verifyToken` lança → 401 "Token inválido ou expirado".
- **Error path — Clerk real sem header**: sem Authorization → 401 "Token de autenticação ausente".

**Verification:**
- Teste unitário passa com mock do `DatabaseService`.
- `curl -H 'X-Dev-User-Id: demo_client_002' http://localhost:3001/api/v1/orders` retorna pedidos do cliente B (vazio inicialmente, até Unit 3).

---

- [ ] **Unit 2: Propagar `X-Dev-User-Id` do frontend em modo bypass**

**Goal:** permitir que o frontend escolha qual usuário do seed está "logado" em bypass, via cookie ou env.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/frontend/src/lib/auth-bypass.ts`
- Modify: `apps/frontend/src/lib/api/client.ts`
- Test: não aplicável (smoke test manual pós Unit 3)

**Approach:**
- `auth-bypass.ts`: adicionar leitura de env `NEXT_PUBLIC_BYPASS_USER_CLERK_ID` (default: `demo_client_001`); devolver esse valor como `userId`.
- `api/client.ts`: em todas as chamadas autenticadas, injetar header `X-Dev-User-Id` quando `NEXT_PUBLIC_DISABLE_CLERK_AUTH === 'true'`, com valor vindo do env (ou cookie futuro).
- **Não** criar UI de troca de usuário neste plano — apenas plumbing.

**Patterns to follow:**
- Formato de chamadas em `apps/frontend/src/lib/api/client.ts` (função `api.get`).

**Test scenarios:**
- Test expectation: none — plumbing puro. Validação será feita pelo teste e2e da Unit 4.

**Verification:**
- Com `NEXT_PUBLIC_BYPASS_USER_CLERK_ID=demo_client_001` a tela `/pedidos` mostra os 2 pedidos do Carlos; com `=demo_client_002` mostra os pedidos do cliente B (após Unit 3).

---

- [ ] **Unit 3: Adicionar segundo cliente e pedidos próprios ao seed**

**Goal:** criar `demo_client_002` com pedidos próprios, para provar isolamento real entre usuários.

**Requirements:** R1, R4

**Dependencies:** nenhuma (pode rodar em paralelo com Unit 1)

**Files:**
- Modify: `docker/02-seed.sql`

**Approach:**
- Adicionar um novo profile em `profiles`:
  - `id`: `00000000-0000-0000-0000-000000000011`
  - `clerk_id`: `demo_client_002`
  - `full_name`: `Joana Mendes`
  - `role`: `client`
- Adicionar 1-2 rows em `orders` com `client_id` apontando para Joana, com `order_number` único e status distintos.
- Reutilizar stores e material_lists já existentes no seed.

**Patterns to follow:**
- Estrutura de `insert into orders` em `docker/02-seed.sql:358-378`.

**Test scenarios:**
- Test expectation: none — dados de seed, cobertos indiretamente pelo teste e2e da Unit 4.

**Verification:**
- `docker compose down -v && docker compose up -d` recria o DB; `psql` confirma:
  - 11 profiles, dos quais 5 clientes (4 originais + Joana).
  - Orders com `client_id` do Carlos e da Joana separados.

---

- [ ] **Unit 4: Teste de integração e2e provando isolamento de pedidos**

**Goal:** teste automatizado garante que user A jamais vê pedidos de user B.

**Requirements:** R4

**Dependencies:** Unit 1, Unit 3

**Files:**
- Create: `apps/backend/test/orders.e2e-spec.ts`
- Modify: `apps/backend/test/jest-e2e.json` (se precisar expandir testRegex)
- Modify: `.github/workflows/ci.yml` (adicionar step de test:e2e com DB de teste)

**Execution note:** Escrever o teste antes de ajustar o CI — validar localmente primeiro.

**Approach:**
- Subir backend + Postgres via `@nestjs/testing` apontando para o DB local do docker-compose (`DATABASE_URL` de test).
- Seedar dados de test ou usar os seeds do docker (preferível: dados de test separados criados no `beforeAll`).
- Cenários:
  1. `GET /api/v1/orders` com `X-Dev-User-Id: demo_client_001` → só pedidos do Carlos.
  2. `GET /api/v1/orders` com `X-Dev-User-Id: demo_client_002` → só pedidos da Joana.
  3. Nenhum `id` de pedido se repete entre as duas listas.
  4. `GET /api/v1/orders` com `X-Dev-User-Id` apontando para profile `role=professional` → 403.
- CI: adicionar service `postgres:17-alpine` no job + step `npm run build --workspace=@obrafacil/shared && npm --workspace=backend run test:e2e`.

**Patterns to follow:**
- `apps/backend/test/app.e2e-spec.ts` como estrutura base.
- `docker-compose.yml` para referência de conexão (host/port/creds) no CI.

**Test scenarios:**
- **Happy path — isolamento cliente A**: cliente A lista seus próprios pedidos, conta bate com o seed.
- **Happy path — isolamento cliente B**: cliente B lista seus próprios pedidos, conta bate com o seed.
- **Edge case — interseção vazia**: nenhum `order.id` aparece em ambas as listas.
- **Error path — role errada**: profile com `role=professional` em `X-Dev-User-Id` → HTTP 403.
- **Error path — profile inexistente**: `X-Dev-User-Id: clerk_id_nao_existe` → HTTP 401.

**Verification:**
- `npm run test:e2e --workspace=backend` passa localmente.
- CI executa o e2e em PRs (verificar no primeiro push do branch).

## System-Wide Impact

- **Interaction graph:** `ClerkAuthGuard` é usado por todos os controllers protegidos (orders, visits, works, professionals, material-lists, messages, conversations). Mudanças nele afetam **todos os fluxos autenticados** — não só pedidos.
- **Error propagation:** novos caminhos de 401 (bypass sem seed; header inválido) devem ser catchados pelo `HttpExceptionFilter` e retornar `{ error, code }` consistente.
- **State lifecycle risks:** JIT provisioning pode criar profile duplicado se o webhook disparar concomitantemente — mitigado por `ON CONFLICT (clerk_id)`.
- **API surface parity:** header `X-Dev-User-Id` só é respeitado quando `DISABLE_CLERK_AUTH=true`. Em produção é ignorado — validar com teste para evitar regressão de segurança.
- **Integration coverage:** teste e2e da Unit 4 é a primeira garantia cross-layer no backend. Outros módulos podem reutilizar a estrutura.
- **Unchanged invariants:**
  - `OrdersController.findAll` continua exigindo `role=client` — não alterado.
  - `OrdersRepository.findAllByProfile` query SQL não muda.
  - Webhook Clerk continua idempotente.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Header `X-Dev-User-Id` ser respeitado em produção por engano | Checar `process.env.DISABLE_CLERK_AUTH === 'true'` antes de ler o header; adicionar teste negativo. |
| JIT provisioning criar profile com role errada para usuários que deveriam ser profissional | Default `role='client'` é OK para MVP; profissional será criado via fluxo separado (gap analysis item 2). Documentar limitação. |
| CI e2e lento por subir Postgres | Usar `postgres:17-alpine` + `pg_isready` healthcheck + tmpfs para data dir; orçar ~30-60s adicionais. |
| Seed da Joana conflitar com testes já existentes (chat, works) | UUID novo (011), não reutilizar; validar que `02-seed.sql` continua rodando limpo. |

## Documentation / Operational Notes

- Atualizar `docs/04-ambiente-e-processos/GUIA_DESENVOLVIMENTO_LOCAL.md` explicando como alternar usuários em bypass via `NEXT_PUBLIC_BYPASS_USER_CLERK_ID`.
- Atualizar `README.md` na seção de credenciais: listar `demo_client_001` e `demo_client_002` como perfis de teste.

## Sources & References

- **Origin document:** `docs/gap-analysis-entrega-g1.md` (item 1 — RF1).
- Related code: `apps/backend/src/core/guards/clerk-auth.guard.ts:21-27`, `apps/backend/src/modules/orders/`, `docker/02-seed.sql`.
- Rubrica: `2026-01-ES - G1-Obra Fácil.pdf` — observação "Histórico traz dados de outros usuários. Necessário ver 'meus pedidos'."
