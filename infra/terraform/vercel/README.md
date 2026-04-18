# Terraform — Vercel IaC

Declaração dos dois projetos Vercel (backend + frontend) com env vars.

## Como aplicar

```bash
cd infra/terraform/vercel
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars com tokens reais

terraform init
terraform plan
terraform apply
```

> **Segredos**: `terraform.tfvars` está no `.gitignore`. Nunca commitar.

## O que está declarado

- **app-devai-backend** (Other framework, serverless via `api/index.ts`)
- **app-devai-frontend** (Next.js, root `apps/frontend`)
- Env vars de produção e preview (DATABASE_URL, Clerk keys, CORS)

## O que NÃO está declarado

- Schema/dados do Supabase — gerenciados em `docker/01-schema.sql` (aplicado manualmente).
- Domínios customizados — adicionar depois se necessário (`vercel_project_domain`).
- State remoto — usando state local. Para time, configurar backend `s3` ou `tfcloud`.
