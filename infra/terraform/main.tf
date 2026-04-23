module "project" {
  source = "./modules/project"

  org_id             = var.org_id
  billing_account_id = var.billing_account_id
  project_id         = var.base_project_id
  project_name       = var.base_project_name
}

module "network" {
  source = "./modules/network"

  project_id     = module.project.project_id
  project_number = module.project.project_number
  region         = var.region

  depends_on = [module.project]
}

module "database" {
  source = "./modules/database"

  project_id        = module.project.project_id
  region            = var.region
  network_id        = module.network.network_id
  db_tier           = var.db_tier
  psa_connection_id = module.network.psa_connection_id

  depends_on = [module.network]
}

module "registry" {
  source = "./modules/registry"

  project_id = module.project.project_id
  region     = var.region

  depends_on = [module.project]
}

module "service_accounts" {
  source = "./modules/service_accounts"

  project_id = module.project.project_id

  depends_on = [module.project]
}

module "tenant_provisioner_iam" {
  source = "./modules/tenant_provisioner_iam"

  org_id             = var.org_id
  billing_account_id = var.billing_account_id
  tenants_folder_id  = module.project.tenants_folder_id
  api_runtime_email  = module.service_accounts.api_runtime_email

  depends_on = [module.service_accounts]
}

module "cloud_run_api" {
  source = "./modules/cloud_run"

  project_id            = module.project.project_id
  region                = var.region
  name                  = "superlake-api"
  image                 = "gcr.io/cloudrun/hello"
  service_account_email = module.service_accounts.api_runtime_email
  vpc_network           = module.network.network_name
  vpc_subnetwork        = module.network.subnet_name
  vpc_egress            = "ALL_TRAFFIC"
  allow_unauthenticated = true
  port                  = 8080
  min_instances         = 0
  max_instances         = 2
  cpu                   = "1000m"
  memory                = "512Mi"

  env_vars = {
    CORS_ORIGIN                      = var.cors_origin
    GCP_PARENT_FOLDER_ID             = module.project.tenants_folder_id
    GCP_BILLING_ACCOUNT_ID           = var.billing_account_id
    GCP_BQ_READ_SA                   = module.service_accounts.bigquery_read_email
    GCP_BQ_WRITE_SA                  = module.service_accounts.bigquery_write_email
    FIVETRAN_BASE_URL                 = var.fivetran_base_url
    FIVETRAN_CONNECT_CARD_REDIRECT_URL = var.fivetran_connect_card_redirect_url
  }

  secret_env_vars = {
    DATABASE_URL        = { secret = "superlake-api-database-url", version = "latest" }
    CLERK_PUBLISHABLE_KEY = { secret = "superlake-clerk-publishable-key", version = "latest" }
    CLERK_SECRET_KEY    = { secret = "superlake-clerk-secret-key", version = "latest" }
    CLERK_WEBHOOK_SECRET = { secret = "superlake-clerk-webhook-secret", version = "latest" }
    FIVETRAN_API_KEY    = { secret = "superlake-fivetran-api-key", version = "latest" }
    FIVETRAN_API_SECRET = { secret = "superlake-fivetran-api-secret", version = "latest" }
  }

  depends_on = [module.network, module.service_accounts, module.project, google_secret_manager_secret.app_secrets]
}

module "cloud_run_agent" {
  source = "./modules/cloud_run"

  project_id            = module.project.project_id
  region                = var.region
  name                  = "superlake-agent"
  image                 = "gcr.io/cloudrun/hello"
  service_account_email = module.service_accounts.agent_runtime_email
  vpc_network           = module.network.network_name
  vpc_subnetwork        = module.network.subnet_name
  vpc_egress            = "PRIVATE_RANGES_ONLY"
  allow_unauthenticated = true
  port                  = 4111
  min_instances         = 0
  max_instances         = 2
  cpu                   = "1000m"
  memory                = "512Mi"

  env_vars = {
    API_BASE_URL    = var.api_base_url_for_agent
    CLERK_JWKS_URI  = var.clerk_jwks_uri
  }

  secret_env_vars = {
    DATABASE_URL              = { secret = "superlake-agent-database-url", version = "latest" }
    CLERK_PUBLISHABLE_KEY     = { secret = "superlake-clerk-publishable-key", version = "latest" }
    CLERK_SECRET_KEY          = { secret = "superlake-clerk-secret-key", version = "latest" }
    GOOGLE_GENERATIVE_AI_API_KEY = { secret = "superlake-google-ai-api-key", version = "latest" }
  }

  depends_on = [module.network, module.service_accounts, module.project, google_secret_manager_secret.app_secrets]
}

resource "google_cloud_run_v2_job" "api_migrate" {
  project  = module.project.project_id
  name     = "superlake-api-migrate"
  location = var.region

  template {
    template {
      service_account = module.service_accounts.api_runtime_email
      timeout         = "600s"
      max_retries     = 1

      vpc_access {
        egress = "ALL_TRAFFIC"
        network_interfaces {
          network    = module.network.network_name
          subnetwork = module.network.subnet_name
        }
      }

      containers {
        image   = "gcr.io/cloudrun/hello"
        command = ["npx"]
        args    = ["prisma", "migrate", "deploy"]

        env {
          name  = "PRISMA_SCHEMA_PATH"
          value = "prisma/schema.prisma"
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = "superlake-api-database-url"
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }

  depends_on = [module.network, module.service_accounts, module.project, google_secret_manager_secret.app_secrets]
}

module "cloud_run_web" {
  source = "./modules/cloud_run"

  project_id            = module.project.project_id
  region                = var.region
  name                  = "superlake-web"
  image                 = "gcr.io/cloudrun/hello"
  service_account_email = module.service_accounts.web_runtime_email
  allow_unauthenticated = true
  port                  = 8080
  min_instances         = 0
  max_instances         = 2
  cpu                   = "1000m"
  memory                = "512Mi"

  env_vars        = {}
  secret_env_vars = {}

  depends_on = [module.service_accounts, module.project]
}

module "ci_cd" {
  source = "./modules/ci_cd"

  project_id          = module.project.project_id
  project_number      = module.project.project_number
  github_repo         = var.github_repo
  api_runtime_email   = module.service_accounts.api_runtime_email
  agent_runtime_email = module.service_accounts.agent_runtime_email
  web_runtime_email   = module.service_accounts.web_runtime_email

  depends_on = [module.service_accounts, module.project]
}
