terraform {
  required_version = ">= 1.6"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

# ─── Repositório Git ────────────────────────────────────────────
locals {
  git_repo_type = "github"
  git_repo      = var.github_repo
}

# ─── Backend (NestJS via api/index.ts serverless) ───────────────
resource "vercel_project" "backend" {
  name      = "app-devai-backend"
  framework = "other"
  git_repository = {
    type = local.git_repo_type
    repo = local.git_repo
  }
  environment = [
    {
      key    = "DATABASE_URL"
      value  = var.database_url
      target = ["production", "preview"]
    },
    {
      key    = "CLERK_SECRET_KEY"
      value  = var.clerk_secret_key
      target = ["production", "preview"]
    },
    {
      key    = "CLERK_WEBHOOK_SECRET"
      value  = var.clerk_webhook_secret
      target = ["production", "preview"]
    },
    {
      key    = "CORS_ORIGIN"
      value  = var.frontend_url
      target = ["production", "preview"]
    },
    {
      key    = "NODE_ENV"
      value  = "production"
      target = ["production"]
    },
  ]
}

# ─── Frontend (Next.js) ─────────────────────────────────────────
resource "vercel_project" "frontend" {
  name             = "app-devai-frontend"
  framework        = "nextjs"
  root_directory   = "apps/frontend"
  git_repository = {
    type = local.git_repo_type
    repo = local.git_repo
  }
  environment = [
    {
      key    = "NEXT_PUBLIC_API_URL"
      value  = "${var.backend_url}/api"
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
      value  = var.clerk_publishable_key
      target = ["production", "preview"]
    },
    {
      key    = "CLERK_SECRET_KEY"
      value  = var.clerk_secret_key
      target = ["production", "preview"]
    },
  ]
}

output "backend_project_id" {
  value = vercel_project.backend.id
}

output "frontend_project_id" {
  value = vercel_project.frontend.id
}
