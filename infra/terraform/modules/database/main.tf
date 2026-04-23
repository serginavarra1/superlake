resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "postgres" {
  project             = var.project_id
  name                = "superlake-postgres"
  region              = var.region
  database_version    = "POSTGRES_17"
  deletion_protection = true

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  depends_on = [var.psa_connection_id]
}

resource "google_sql_database" "superlake" {
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  name     = "superlake"
}

resource "google_sql_user" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  name     = "app"
  password = random_password.db_password.result
}
