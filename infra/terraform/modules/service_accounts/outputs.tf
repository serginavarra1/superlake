output "api_runtime_email" {
  value = google_service_account.api_runtime.email
}

output "agent_runtime_email" {
  value = google_service_account.agent_runtime.email
}

output "web_runtime_email" {
  value = google_service_account.web_runtime.email
}

output "bigquery_read_email" {
  value = google_service_account.bigquery_read.email
}

output "bigquery_write_email" {
  value = google_service_account.bigquery_write.email
}
