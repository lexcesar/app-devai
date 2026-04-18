variable "vercel_api_token" {
  description = "Token pessoal do Vercel (https://vercel.com/account/settings/tokens)"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "ID do time no Vercel (opcional; vazio = conta pessoal)"
  type        = string
  default     = null
}

variable "github_repo" {
  description = "Repositório GitHub no formato owner/repo"
  type        = string
  default     = "lexcesar/obra-facil"
}

variable "database_url" {
  description = "Connection string do Supabase pooler"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  type      = string
  sensitive = true
}

variable "clerk_publishable_key" {
  type = string
}

variable "clerk_webhook_secret" {
  type      = string
  sensitive = true
}

variable "frontend_url" {
  description = "URL pública do frontend (usada no CORS_ORIGIN do backend)"
  type        = string
  default     = "https://app-devai-frontend.vercel.app"
}

variable "backend_url" {
  description = "URL pública do backend (usada em NEXT_PUBLIC_API_URL)"
  type        = string
  default     = "https://app-devai-backend.vercel.app"
}
