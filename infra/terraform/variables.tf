variable "org_id" {
  type        = string
  description = "GCP Organization ID (numeric string, e.g. '123456789012')"
}

variable "billing_account_id" {
  type        = string
  description = "GCP Billing Account ID (e.g. '0X0X0X-0X0X0X-0X0X0X')"
}

variable "base_project_id" {
  type        = string
  description = "ID for the platform base project (e.g. 'superlake-platform-prod'). Must be globally unique."
}

variable "bootstrap_project_id" {
  type        = string
  description = "Existing GCP project used as quota/billing project for provider API calls during bootstrap. Must have cloudresourcemanager, cloudbilling, and serviceusage APIs enabled, and the executing identity must have roles/serviceusage.serviceUsageConsumer on it."
}

variable "base_project_name" {
  type        = string
  description = "Human-readable name for the platform project"
  default     = "Superlake Platform"
}

variable "region" {
  type        = string
  description = "GCP region for all resources"
  default     = "europe-southwest1"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine tier"
  default     = "db-f1-micro"
}

variable "cors_origin" {
  type        = string
  description = "Allowed CORS origin for the API (URL of the web Cloud Run service)"
}

variable "api_base_url_for_agent" {
  type        = string
  description = "Base URL of the api Cloud Run service, used by the agent"
}

variable "fivetran_base_url" {
  type        = string
  description = "Fivetran API base URL"
  default     = "https://api.fivetran.com"
}

variable "fivetran_connect_card_redirect_url" {
  type        = string
  description = "Redirect URL for Fivetran Connect Card flow"
}

variable "clerk_jwks_uri" {
  type        = string
  description = "Clerk JWKS URI for the agent (e.g. https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json). Find it in Clerk Dashboard → API Keys → Show JWKS URL."
}

variable "github_repo" {
  type        = string
  description = "GitHub repository allowed to impersonate the CI/CD service account, in 'owner/repo' format"
}
