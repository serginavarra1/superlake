resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = "superlake-containers"
  format        = "DOCKER"
  description   = "Docker images for Superlake platform services"
}
