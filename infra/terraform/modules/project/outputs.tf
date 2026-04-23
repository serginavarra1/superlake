output "project_id" {
  value = google_project.base.project_id
}

output "project_number" {
  value = google_project.base.number
}

output "tenants_folder_id" {
  value = google_folder.tenants.folder_id
}
