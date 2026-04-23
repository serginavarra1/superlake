# ── Service Accounts ────────────────────────────────────────────────────────

resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = "api-runtime"
  display_name = "Superlake API Cloud Run runtime"
}

resource "google_service_account" "agent_runtime" {
  project      = var.project_id
  account_id   = "agent-runtime"
  display_name = "Superlake Agent Cloud Run runtime"
}

resource "google_service_account" "web_runtime" {
  project      = var.project_id
  account_id   = "web-runtime"
  display_name = "Superlake Web Cloud Run runtime (identity only)"
}

resource "google_service_account" "bigquery_read" {
  project      = var.project_id
  account_id   = "bigquery-read"
  display_name = "BigQuery read SA (impersonated by api-runtime)"
}

resource "google_service_account" "bigquery_write" {
  project      = var.project_id
  account_id   = "bigquery-write"
  display_name = "BigQuery write SA (impersonated by api-runtime)"
}

# ── Impersonation: api-runtime → bigquery-read / bigquery-write ─────────────

resource "google_service_account_iam_member" "api_impersonate_bq_read" {
  service_account_id = google_service_account.bigquery_read.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_service_account_iam_member" "api_impersonate_bq_write" {
  service_account_id = google_service_account.bigquery_write.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.api_runtime.email}"
}

# ── Cloud SQL access ─────────────────────────────────────────────────────────

resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "agent_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.agent_runtime.email}"
}

# ── Secret Manager access ────────────────────────────────────────────────────

resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "agent_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.agent_runtime.email}"
}

# ── Artifact Registry pull (all three Cloud Run SAs) ────────────────────────

resource "google_project_iam_member" "api_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "agent_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.agent_runtime.email}"
}

resource "google_project_iam_member" "web_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.web_runtime.email}"
}

# ── Cloud Run invoker (allow public traffic via IAM on the services) ─────────
