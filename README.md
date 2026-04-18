# 🏗️ Obra Fácil

> **Transformando a jornada de reforma e manutenção residencial em uma experiência simples, segura e integrada.**

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange)
![CI](https://github.com/lexcesar/obra-facil/actions/workflows/ci.yml/badge.svg)
![Tech](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS%20%7C%20PostgreSQL-green)

O **Obra Fácil** é um marketplace inovador que conecta proprietários de imóveis a profissionais autônomos da construção civil. Diferente de soluções genéricas, integramos a contratação do serviço com a cotação de materiais em lojas parceiras, resolvendo a fragmentação do mercado de reformas.

---

## 🎯 O Problema
Proprietários de residências sofrem com a falta de confiança em profissionais aleatórios, orçamentos opacos e a dificuldade de conciliar a mão de obra com a compra de materiais. O **Obra Fácil** centraliza essa jornada, garantindo segurança através de avaliações reais e agilidade via geolocalização.

## 👥 Persona Principal
**Carlos Alberto, 45 anos (Despachante)**
Um usuário que busca agilidade e segurança, mas possui pouco tempo para pesquisas presenciais e sente-se inseguro ao receber desconhecidos em casa sem referências sólidas.

---

## 🚀 Funcionalidades Principais
- 🔍 **Busca Inteligente:** Encontre Pedreiros, Eletricistas e Pintores por geolocalização.
- ⭐ **Portfólio & Avaliações:** Visualize fotos de trabalhos anteriores e notas de outros clientes.
- 📅 **Agendamento Integrado:** Reserve visitas técnicas diretamente pelo app.
- 🛒 **Módulo de Materiais:** Cote materiais necessários para o serviço em lojas próximas.
- 📄 **Orçamentos Transparentes:** Receba propostas claras de serviço e material em um só lugar.

---

## 📂 Documentação do Projeto
Para facilitar a navegação no repositório, consulte os documentos detalhados:

* [📄 PRD (Requisitos)](docs/01-produto/prd.md) - Visão geral e regras de negócio.
* [🛠️ Especificação Técnica](docs/02-arquitetura/spec_tech.md) - Arquitetura, Backend e Frontend.
* [🎨 Guia de UI/UX](docs/03-design-ux/spec_ui.md) - Fluxo de telas e identidade visual.
* [💡 Definição do Problema](docs/01-produto/definicao_problema.md) - Contexto e impacto no mercado.
* [stitch](https://stitch.withgoogle.com/projects/10387496590250121391) - Design do projeto

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Backend | NestJS 11, TypeScript, Swagger |
| Banco de Dados | PostgreSQL 17 (Docker local / Supabase em produção) |
| Autenticação | Clerk |
| **IA (NLP)** | **Anthropic Claude (Haiku 4.5)** para geração de lista de materiais |
| **Observabilidade** | **nestjs-pino** (logs JSON estruturados, requestId, redact) + `/api/health` |
| **Testes Backend** | Jest (unit) + Jest + supertest (e2e integração) |
| **Testes Frontend** | Vitest + Testing Library (unit) + **Playwright** (e2e browser) |
| **IaC** | Terraform (provider Vercel) em `infra/terraform/vercel/` |
| Deploy | Vercel (frontend + backend) |
| CI/CD | GitHub Actions |

---

## ⚡ Setup Local

> Guia completo: [docs/04-ambiente-e-processos/setup-local.md](docs/04-ambiente-e-processos/setup-local.md)

**Pré-requisitos**: Node.js 20+, Docker Desktop

```bash
# Clone o repositório
git clone https://github.com/lexcesar/obra-facil.git
cd obra-facil

# Instale as dependências
npm install

# Configure as variáveis de ambiente (valores padrão já funcionam)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# Suba o ambiente completo (DB + Backend + Frontend)
npm run docker:up
```

Acesse: **http://localhost:3000** (frontend) | **http://localhost:3001/api/docs** (Swagger)

### 🔑 Perfis de teste (modo bypass)

No ambiente local (`DISABLE_CLERK_AUTH=true`), o usuário logado é escolhido pela env `NEXT_PUBLIC_BYPASS_USER_CLERK_ID` no frontend ou pelo header `X-Dev-User-Id` no backend. Perfis disponíveis no seed:

| clerk_id | Nome | Role |
|---|---|---|
| `demo_client_001` (default) | Carlos Alberto | client |
| `demo_client_002` | Joana Mendes | client |
| `demo_professional_001` | Ricardo Silva | professional |

---

## 📂 Estrutura do Projeto

```
obra-facil/
├── apps/
│   ├── frontend/          # Next.js 15 (App Router)
│   └── backend/           # NestJS 11
├── packages/
│   └── shared/            # Types, schemas Zod, interfaces
├── docker/
│   ├── 01-schema.sql      # Schema do banco de dados
│   └── 02-seed.sql        # Dados de exemplo
├── docs/
│   ├── 01-produto/        # PRD, personas, jornada, lean canvas
│   ├── 02-arquitetura/    # Arquitetura técnica e spec
│   ├── 03-design-ux/      # Design system, UI spec
│   ├── 04-ambiente-e-processos/  # Setup local, fluxo git, variáveis
│   └── 05-prompts-e-referencias/ # Prompts de IA e referências
├── scripts/
│   └── setup/             # Scripts de configuração e ferramentas
└── .github/workflows/ # CI/CD pipelines
```

### 📚 Documentação

| Documento | Descrição |
|---|---|
| [docs/04-ambiente-e-processos/setup-local.md](docs/04-ambiente-e-processos/setup-local.md) | Como rodar o projeto localmente |
| [docs/02-arquitetura/arquitetura.md](docs/02-arquitetura/arquitetura.md) | Arquitetura técnica detalhada |
| [docs/04-ambiente-e-processos/variaveis-ambiente.md](docs/04-ambiente-e-processos/variaveis-ambiente.md) | Todas as variáveis de ambiente |
| [docs/04-ambiente-e-processos/fluxo-git.md](docs/04-ambiente-e-processos/fluxo-git.md) | Convenções de branches e commits |
| [docs/01-produto/prd.md](docs/01-produto/prd.md) | Product Requirements Document |
| [docs/02-arquitetura/spec_tech.md](docs/02-arquitetura/spec_tech.md) | Especificação técnica |

---

## 👥 Equipe
Projeto desenvolvido como parte do trabalho final de Práticas de Implementação e Evolução de Software:
- Alexander Cesar Luiz Costa
- Anderson Arruda
- Jackson Jovino Miranda
- Marcelo Granzoto
- Renan Carlos Silva Braz Tafner

---
<p align="center">
Desenvolvido com foco na experiência do usuário e na eficiência na construção civil. 🛠️
</p>
