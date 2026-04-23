resource "google_project" "base" {
  project_id      = var.project_id
  name            = var.project_name
  org_id          = var.org_id
  billing_account = var.billing_account_id

  auto_create_network = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_folder" "tenants" {
  display_name = "tenants"
  parent       = "organizations/${var.org_id}"
}

locals {
  apis = [
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudbilling.googleapis.com",
    "bigquery.googleapis.com",
    "storage.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "generativelanguage.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.apis)

  project                    = google_project.base.project_id
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}
