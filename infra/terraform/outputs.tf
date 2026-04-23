output "base_project_id" {
  description = "Platform base GCP project ID"
  value       = module.project.project_id
}

output "tenants_folder_id" {
  description = "Folder ID where tenant projects are created at runtime"
  value       = module.project.tenants_folder_id
}

output "db_connection_name" {
  description = "Cloud SQL connection name (for Cloud Run --add-cloudsql-instances)"
  value       = module.database.connection_name
}

output "db_private_ip" {
  description = "Cloud SQL private IP address"
  value       = module.database.private_ip
}

output "db_password" {
  description = "Cloud SQL app user password (store this in Secret Manager)"
  value       = module.database.password
  sensitive   = true
}

output "artifact_registry_url" {
  description = "Artifact Registry Docker repository URL"
  value       = module.registry.repository_url
}

output "api_runtime_sa_email" {
  description = "Service account email for the api Cloud Run service"
  value       = module.service_accounts.api_runtime_email
}

output "agent_runtime_sa_email" {
  description = "Service account email for the agent Cloud Run service"
  value       = module.service_accounts.agent_runtime_email
}

output "web_runtime_sa_email" {
  description = "Service account email for the web Cloud Run service"
  value       = module.service_accounts.web_runtime_email
}

output "bigquery_read_sa_email" {
  description = "BigQuery read service account email (set as GCP_BQ_READ_SA)"
  value       = module.service_accounts.bigquery_read_email
}

output "bigquery_write_sa_email" {
  description = "BigQuery write service account email (set as GCP_BQ_WRITE_SA)"
  value       = module.service_accounts.bigquery_write_email
}

output "api_cloud_run_url" {
  description = "URL of the superlake-api Cloud Run service"
  value       = module.cloud_run_api.url
}

output "agent_cloud_run_url" {
  description = "URL of the superlake-agent Cloud Run service"
  value       = module.cloud_run_agent.url
}

output "web_cloud_run_url" {
  description = "URL of the superlake-web Cloud Run service"
  value       = module.cloud_run_web.url
}

output "wif_provider" {
  description = "Workload Identity Provider resource name (set as GitHub Variable WIF_PROVIDER)"
  value       = module.ci_cd.wif_provider
}

output "ci_sa_email" {
  description = "GitHub Actions service account email (set as GitHub Variable CI_SA_EMAIL)"
  value       = module.ci_cd.ci_sa_email
}
