locals {
  app_secrets = [
    "superlake-api-database-url",
    "superlake-agent-database-url",
    "superlake-clerk-publishable-key",
    "superlake-clerk-secret-key",
    "superlake-clerk-webhook-secret",
    "superlake-fivetran-api-key",
    "superlake-fivetran-api-secret",
    "superlake-google-ai-api-key",
  ]
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each = toset(local.app_secrets)

  project   = module.project.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [module.project]
}
