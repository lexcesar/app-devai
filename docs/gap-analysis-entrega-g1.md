# Gap Analysis — Entrega G1 (2026-01)

Análise baseada na rubrica `2026-01-ES - G1-Obra Fácil.pdf` (nota atual: **45/100**).

## Resumo do Estado Atual

| Seção | Pontos possíveis | Nota obtida | Status |
|-------|------------------|-------------|--------|
| Documentação (9 itens × pesos) | 20 | 9 | ✅ Completo |
| RNFs (8 itens) | 32 | 6,8 | ⚠️ Parcial |
| RF1 — Fluxo cliente | 18 | 0,3 | ❌ Crítico |
| RF2 — Fluxo profissional | 18 | 0 | ❌ Não avaliado |
| RF3 — Tecnologia de fronteira | 12 | 0 | ❌ Ausente |
| **Total** | **100** | **45** | — |

---

## ❌ Itens faltantes / críticos

### 1. RF1 — Fluxo de negócio (visão cliente) — nota 0,3/18
**Observação do avaliador:** *"Histórico traz dados de outros usuários. Necessário ver 'meus pedidos'."*

- **Bug**: a tela `/pedidos` (`apps/frontend/src/app/(app)/pedidos/page.tsx`) chama `GET /v1/orders` e exibe pedidos de outros usuários.
- **Causa provável**: o usuário autenticado localmente (bypass Clerk) é mapeado para um `profile.id` que não corresponde ao `client_id` dos pedidos do seed, ou o filtro `WHERE o.client_id = $1` não está sendo aplicado corretamente ao perfil logado.
- **Ação**:
  - Validar `ClerkAuthGuard` + `CurrentUser` retornando o perfil correto em modo `DISABLE_CLERK_AUTH=true`.
  - Garantir que `OrdersRepository.findAllByProfile` recebe o `profile.id` do usuário logado e não um ID fixo de seed.
  - Validar fluxo ponta-a-ponta: carrinho → cotação → pedido → histórico "Meus Pedidos" com somente os pedidos do cliente autenticado.
  - Adicionar os critérios restantes: feedback/encerramento (ex.: tela de "pedido entregue" com avaliação).

### 2. RF2 — Fluxo de negócio (visão profissional) — nota 0/18
**Observação do avaliador:** *"Pendente disponibilizar credenciais com perfil do profissional."*

- **Bug/falta**: não existem credenciais/seed de usuário com `role = 'professional'` funcional para testar o fluxo.
- **Faltante no frontend**:
  - Não há fluxo dedicado para profissional: visualizar solicitações recebidas, aceitar/recusar visita, cadastrar orçamento, acompanhar obras em andamento, concluir serviço.
  - Rotas `/profissional/[id]` existem apenas para **visualização pública** — não há dashboard do próprio profissional logado.
  - Falta rota `/profissional/dashboard` (ou equivalente) com agenda, visitas, orçamentos pendentes, histórico.
- **Ação**:
  - Criar usuário de teste no seed com `role=professional` e documentar credenciais no README.
  - Implementar dashboard do profissional.
  - Implementar fluxo ponta-a-ponta: receber solicitação → aceitar/recusar → visita → orçamento → execução → conclusão/avaliação.

### 3. RF3 — Tecnologia de fronteira — nota 0/12
**Observação do avaliador:** *nenhuma tecnologia avançada (IA, blockchain ou IoT) implementada.*

- **Faltante**: nenhuma dependência de IA/ML/blockchain/IoT nos `package.json`.
- **Ação (sugestões alinhadas ao produto)**:
  - **IA** (mais natural para o domínio): usar OpenAI/Anthropic/Gemini para:
    - **Cotação automática de materiais**: gerar lista de materiais a partir da descrição da obra em linguagem natural.
    - **Matching inteligente cliente ↔ profissional**: ranking por similaridade semântica entre descrição da obra e especialidades do profissional.
    - **Assistente de chat**: sugerir respostas ao profissional, resumir conversas.
  - Integrar de forma **real e verificável** (não mock) com evidência em testes/API.
  - Documentar no `prd.md` e `spec_tech.md` a necessidade e o valor agregado.

### 4. RNF-04 — Observabilidade e Rastreabilidade — nota 0/4
**Faltante:**
- Nenhuma dependência de observabilidade no backend (`winston`, `pino`, `@opentelemetry/*`, Sentry, Prometheus).
- Logs usam apenas `console.log` nativo do NestJS.
- Sem correlation ID, sem estruturação JSON, sem tracing.
- **Ação**:
  - Adicionar logger estruturado (`pino` ou `nestjs-pino`) com `requestId`/`traceId`.
  - Instrumentar com OpenTelemetry (traces + metrics) — pelo menos um exporter (ex.: console, OTLP ou Grafana Cloud free).
  - Endpoint `/health` e `/metrics` (Prometheus format).
  - Documentar em `spec_tech.md` a stack de observabilidade.

### 5. RNF-05 — Manutenibilidade e Testabilidade — nota 0/4
**Faltante:**
- Único teste de unidade é o placeholder `app.controller.spec.ts` ("Hello World!").
- Único e2e é o placeholder `app.e2e-spec.ts`.
- **Zero cobertura dos módulos reais**: orders, works, visits, professionals, material-lists, messages, conversations.
- Frontend não tem testes (nem Jest, nem Playwright, nem Vitest).
- **Ação**:
  - **Testes de unidade** (backend): serviços e repositórios dos módulos principais (`orders`, `visits`, `works`, `professionals`, `material-lists`).
  - **Testes de integração** (backend): e2e por módulo usando `@nestjs/testing` + `supertest` + DB de teste (docker-compose já fornece Postgres local).
  - **Testes de aceite (frontend)**: Playwright ou Cypress com ao menos os 2 fluxos principais (cliente e profissional).
  - Meta mínima sugerida: 60%+ de cobertura nos módulos de negócio.
  - Adicionar execução dos testes no `ci.yml`.

### 6. RNF-06 — Portabilidade e Implantação — nota 0,8/4
**Observação do avaliador:** *"Artefatos IaC não identificados."*

- ✅ Containers OCI: `apps/backend/Dockerfile` e `apps/frontend/Dockerfile` existem.
- ✅ `docker-compose.yml` existe para ambiente local.
- ✅ Schema SQL versionado em `docker/01-schema.sql`.
- ❌ **IaC declarativa não existe**: deploy Vercel é manual/GUI — sem Terraform, Pulumi, CloudFormation ou similar.

**Abordagem enxuta escolhida** (menor esforço × maior ganho):

1. **Terraform apenas para Vercel** (provider oficial, maduro):
   - Um `main.tf` (~30 linhas) declarando os dois projetos (`app-devai-frontend`, `app-devai-backend`), environment variables e domínios.
   - State local (sem backend remoto — suficiente para o escopo acadêmico).
   - Pasta sugerida: `infra/terraform/vercel/`.
2. **Docker Compose** (já existe) permanece como IaC do runtime containerizado — cobre "containers OCI".
3. **Schema SQL** (já existe) é o IaC do banco — versionado, aplicado via init script.

**Por que não Terraform para Supabase**: o provider oficial do Supabase gerencia apenas projeto/branches — não cria tabelas, schemas nem RLS. Como o schema já está em `docker/01-schema.sql` versionado, o ganho marginal não compensa a complexidade adicional.

**Ações:**
- Criar `infra/terraform/vercel/main.tf` + `variables.tf` + `terraform.tfvars.example`.
- Adicionar `infra/terraform/README.md` com `terraform init && plan && apply`.
- Documentar em `docs/04-ambiente-e-processos/iac.md` a arquitetura de IaC (camadas: containers OCI → Terraform Vercel → SQL schema).
- Atualizar `docs/02-arquitetura/arquitetura.md` referenciando a nova camada IaC.

---

## ⚠️ Itens parcialmente cobertos (possíveis perdas de ponto)

### 7. Testes automatizados no CI
O workflow `ci.yml` roda lint + typecheck + build, mas **não roda `npm test`**. Adicionar step de testes é pré-requisito para RNF-05.

### 8. Swagger/OpenAPI
`@nestjs/swagger` está instalado. Validar se a documentação está exposta em `/api/docs` e completa (reforça RNF-03 Interoperabilidade).

### 9. Autorização por perfil
O `OrdersController` faz `if (profile.role !== 'client')` inline. Convém extrair um `@Roles()` decorator + guard para padronizar (reforça RNF-02 Segurança e RF2).

---

## ✅ Itens completos (não alterar)

- Problem statement, PRD, spec tech, spec UI, Design System, Lean Canvas, Persona, Jornada do usuário, Modelos C4 (contexto, container, componente, deploy, pipeline).
- RNF-01 Acessibilidade/Portabilidade (Next.js 15, responsivo, HTML5/CSS3/ES2020+).
- RNF-02 Segurança (Clerk, CORS, HTTPS via Vercel).
- RNF-03 Interoperabilidade (API REST em `/api/v1/*`).
- RNF-07 Persistência (PostgreSQL via Supabase + schema SQL).
- RNF-08 Governança de código (npm workspaces, `.env.example`, Git, Conventional Commits).

---

## Priorização sugerida (esforço × impacto na nota)

| # | Item | Ganho estimado | Esforço |
|---|------|----------------|---------|
| 1 | Fix "Meus Pedidos" (filtro por usuário) | +17,7 pts (RF1) | Baixo |
| 2 | Seed + credenciais profissional + dashboard profissional | +18 pts (RF2) | Alto |
| 3 | Integração IA real (cotação/matching) | +12 pts (RF3) | Médio-Alto |
| 4 | Suite de testes (unit + integração + aceite) | +4 pts (RNF-05) | Médio-Alto |
| 5 | Observabilidade (pino + OTel + /health) | +4 pts (RNF-04) | Médio |
| 6 | IaC (Terraform enxuto só para Vercel) | +3,2 pts (RNF-06) | Baixo |

**Potencial total:** +58,9 pts → nota projetada próxima de **100/100**.

---

## Arquivos/áreas que precisam ser tocados

### Backend
- `apps/backend/src/modules/orders/orders.controller.ts` — validar filtro por perfil.
- `apps/backend/src/modules/*/` — criar `*.service.spec.ts` e `*.repository.spec.ts`.
- `apps/backend/src/main.ts` — registrar logger Pino + OpenTelemetry.
- `apps/backend/src/modules/` — criar módulo(s) novo(s) para fluxo do profissional (se não couber nos existentes).
- `apps/backend/src/modules/<ai>/` — novo módulo de IA.

### Frontend
- `apps/frontend/src/app/(app)/pedidos/page.tsx` — garantir que consome pedidos do usuário logado.
- `apps/frontend/src/app/(app)/profissional/dashboard/page.tsx` — **criar**.
- `apps/frontend/src/app/(app)/profissional/solicitacoes/page.tsx` — **criar**.
- `apps/frontend/tests/` — **criar** pasta de testes Playwright/Cypress.

### Infra/DX
- `.github/workflows/ci.yml` — adicionar step `npm test`.
- `infra/terraform/vercel/` — **criar** `main.tf`, `variables.tf`, `terraform.tfvars.example`, `README.md`.
- `docker/02-seed.sql` — adicionar usuário profissional de teste.
- `README.md` — documentar credenciais de teste (cliente e profissional).

### Documentação
- `docs/02-arquitetura/spec_tech.md` — adicionar seção de observabilidade e IA.
- `docs/02-arquitetura/arquitetura.md` — atualizar C4 com IA e observabilidade.
- `docs/04-ambiente-e-processos/iac.md` — **criar** guia de IaC (containers OCI → Terraform Vercel → SQL schema).
